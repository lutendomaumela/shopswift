# ─────────────────────────────────────────────────────────────────────────────
# app.py — ShopSwift application entry point
#
# This file does three things:
#   1. Defines Prometheus metric objects (module-level — must survive requests)
#   2. Defines create_app() — builds and returns a configured Flask instance
#   3. Wires up routes, extensions, error handlers, health check, and metrics
#
# WHY the Application Factory Pattern (create_app)?
#   If we created the app at module level (app = Flask(__name__) globally),
#   then every import of this file would immediately spin up the app.
#   That breaks tests (can't create fresh isolated instances) and breaks
#   Gunicorn/Docker (side-effects on import). The factory solves both.
# ─────────────────────────────────────────────────────────────────────────────

import os
import time

from flask import Flask, jsonify, g, request
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

from src.config import DevelopmentConfig, ProductionConfig, TestingConfig
from src.models import db
from src.auth import auth_bp
from src.routes.products import products_bp
from src.routes.cart import cart_bp
from src.routes.orders import orders_bp


# ─────────────────────────────────────────────────────────────────────────────
# Prometheus metric objects — defined at MODULE LEVEL, outside create_app()
#
# WHY module level and not inside create_app()?
#   Prometheus counters and histograms are global accumulators.
#   If defined inside create_app(), each call to create_app() (e.g. in tests)
#   would try to re-register the same metric names and raise a ValueError.
#   At module level they are created once and reused safely.
#
# WHY these two metrics specifically?
#   Together they give you the "RED method" — the industry standard for
#   monitoring APIs: Rate (requests/sec), Errors (error %), Duration (latency).
#   These are exactly what your Phase 6 Grafana dashboard will display.
# ─────────────────────────────────────────────────────────────────────────────

# Counts every HTTP request — labelled by method, endpoint, and status code.
# Example query in Grafana: rate(http_requests_total[1m]) → requests per second
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total number of HTTP requests received',
    ['method', 'endpoint', 'status_code']
)

# Records how long each request takes — stored in a histogram (bucketed).
# Example query in Grafana: histogram_quantile(0.95, http_request_duration_seconds)
# → the p95 latency: 95% of requests finish within this many seconds.
REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    # Buckets: we care about requests under 500ms — anything above is slow for an API
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
)


# ─────────────────────────────────────────────────────────────────────────────
# create_app() — the application factory
# ─────────────────────────────────────────────────────────────────────────────

def create_app():
    """
    Application Factory Pattern.

    Creates and returns a fully configured Flask application instance.
    Called by:
      - Gunicorn in production:  gunicorn "src.app:create_app()"
      - pytest in tests:         app = create_app() inside fixtures
      - Docker:                  via wsgi.py which calls create_app()
      - Local dev:               python -m src.app (see __main__ block below)
    """
    app = Flask(__name__)

    # ── Load the correct config based on the FLASK_ENV environment variable ──
    #
    # WHY three separate config classes?
    #   - Development: DEBUG on, local DB, relaxed settings
    #   - Testing:     In-memory or test DB, TESTING=True disables error catching
    #   - Production:  DEBUG off, reads from environment variables, strict settings
    #
    # The environment variable is set in:
    #   - docker-compose.yml:      FLASK_ENV=development
    #   - docker-compose.prod.yml: FLASK_ENV=production
    #   - GitHub Actions CI:       FLASK_ENV=testing
    env = os.getenv('FLASK_ENV', 'development')

    if env == 'production':
        app.config.from_object(ProductionConfig)
    elif env == 'testing':
        app.config.from_object(TestingConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    # ── Initialize Flask extensions ──────────────────────────────────────────
    #
    # Extensions are initialised with init_app() rather than passing app directly.
    # WHY? Because we're inside a factory — the app doesn't exist at import time.
    # init_app() delays the binding until we have an app instance in hand.

    db.init_app(app)          # SQLAlchemy — database ORM
    JWTManager(app)           # JWT tokens for auth (access + refresh)
    Migrate(app, db)          # Flask-Migrate — manages Alembic DB migrations

    # ── Register blueprints (route groups) ───────────────────────────────────
    #
    # WHY blueprints?
    #   Organises routes into logical modules (auth, products, cart, orders).
    #   Each blueprint is its own file under src/routes/.
    #   url_prefix means every route inside the blueprint automatically gets
    #   that prefix — e.g. products_bp route '/products' → GET /api/products
    app.register_blueprint(auth_bp,     url_prefix='/api/auth')
    app.register_blueprint(products_bp, url_prefix='/api')
    app.register_blueprint(cart_bp,     url_prefix='/api')
    app.register_blueprint(orders_bp,   url_prefix='/api')

    # ── Global error handlers ─────────────────────────────────────────────────
    #
    # WHY: Without these, Flask returns HTML error pages by default.
    # Our API clients (React frontend, Postman, other services) expect JSON.
    # These handlers intercept the relevant HTTP errors and return JSON instead.

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'error': 'Method not allowed'}), 405

    @app.errorhandler(500)
    def internal_error(e):
        # Roll back any open DB transaction that caused the 500.
        # Without this, the next request on the same connection would fail
        # because SQLAlchemy sees a transaction in a broken state.
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

    # ── Request timing hooks for Prometheus ──────────────────────────────────
    #
    # before_request: runs before EVERY request — we record the start time
    #   on Flask's `g` object (a per-request context that Flask clears automatically).
    #
    # after_request: runs after EVERY request — we compute the duration and
    #   record it into the two Prometheus metrics defined above.
    #
    # WHY use g.start_time and not a local variable?
    #   before_request and after_request are separate function calls.
    #   `g` is Flask's mechanism for sharing data within a single request lifecycle.

    @app.before_request
    def start_timer():
        # Store the current time on the request context object `g`
        g.start_time = time.time()

    @app.after_request
    def record_metrics(response):
        # Compute how long the request took
        duration = time.time() - g.start_time if hasattr(g, 'start_time') else 0

        # Use the Flask endpoint name (function name of the view) as the label.
        # Falls back to 'unknown' for requests that don't match any route (404s).
        endpoint = request.endpoint or 'unknown'

        # Increment the request counter
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=endpoint,
            status_code=str(response.status_code)
        ).inc()

        # Record the duration in the histogram
        REQUEST_LATENCY.labels(
            method=request.method,
            endpoint=endpoint
        ).observe(duration)

        return response

    # ── /health — readiness and liveness check ────────────────────────────────
    #
    # WHY does this endpoint exist?
    #   Multiple systems depend on it:
    #   1. docker-compose.prod.yml HEALTHCHECK — restarts container if /health fails
    #   2. deploy.sh — waits for /health to return 200 before reporting deploy success
    #   3. Phase 5 (k3s) — Kubernetes readiness probe: pod only gets traffic once healthy
    #   4. Phase 5 (k3s) — Kubernetes liveness probe: pod restarts if /health fails 3×
    #   5. AlertManager — can alert if health check fails in production
    #
    # WHY check the DB and not just return 200?
    #   A simple 200 only tells you Flask is running.
    #   If the database is down the app can't serve any real requests.
    #   A real health check verifies the entire dependency chain.
    #
    # The IMAGE_TAG env var is set by GitHub Actions during docker build
    # (--build-arg IMAGE_TAG=$GITHUB_SHA) so you can see exactly which
    # commit is deployed by hitting /health.

    @app.route('/health', methods=['GET'])
    def health_check():
        try:
            # Execute a trivial query — proves the DB connection is alive
            db.session.execute(db.text('SELECT 1'))
            return jsonify({
                'status':   'healthy',
                'service':  'shopswift-api',
                'database': 'connected',
                'version':  os.getenv('IMAGE_TAG', 'local'),
                'env':      env
            }), 200
        except Exception as e:
            # DB is down — return 500 so Kubernetes restarts the pod
            # and deploy.sh aborts the deploy rather than routing traffic here
            return jsonify({
                'status':   'unhealthy',
                'service':  'shopswift-api',
                'database': 'disconnected',
                'error':    str(e)
            }), 500

    # ── /metrics — Prometheus scrape endpoint ─────────────────────────────────
    #
    # WHY does this endpoint exist?
    #   Phase 6 deploys Prometheus inside k3s. Every 15 seconds Prometheus
    #   sends a GET /metrics request to this endpoint and reads all the metrics
    #   we've been accumulating (REQUEST_COUNT, REQUEST_LATENCY, etc).
    #   Grafana then queries Prometheus to build dashboards and trigger alerts.
    #
    # Setting this up now (Phase 3) means zero code changes in Phase 6.
    # The instrumentation middleware above is already recording data —
    # Prometheus just needs somewhere to collect it.
    #
    # generate_latest() serialises all registered metrics into the
    # text format Prometheus expects (key{labels} value timestamp).

    @app.route('/metrics', methods=['GET'])
    def metrics():
        return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

    return app


# ─────────────────────────────────────────────────────────────────────────────
# Entry point for direct execution: python -m src.app
#
# WHY the __name__ == '__main__' guard?
#   When Gunicorn or pytest imports this module, __name__ is 'src.app'.
#   The block below only runs when you execute the file directly.
#   This prevents the dev server from starting during tests or in production.
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)