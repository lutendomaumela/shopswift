# ─────────────────────────────────────────────────────────────────────────────
# app.py — ShopSwift application entry point
#
# This file does three things:
#   1. Defines Prometheus metric objects (module-level — must survive requests)
#   2. Defines create_app() — builds and returns a configured Flask instance
#   3. Wires up routes, extensions, error handlers, health check, and metrics
# ─────────────────────────────────────────────────────────────────────────────

import os
import time

from flask import Flask, jsonify, g, request
from flask_cors import CORS
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
# ─────────────────────────────────────────────────────────────────────────────

REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total number of HTTP requests received',
    ['method', 'endpoint', 'status_code']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
)


# ─────────────────────────────────────────────────────────────────────────────
# create_app() — the application factory
# ─────────────────────────────────────────────────────────────────────────────

def create_app():
    """
    Application Factory Pattern.
    Creates and returns a fully configured Flask application instance.
    """
    app = Flask(__name__)

    # ── Load the correct config based on the FLASK_ENV environment variable ──
    env = os.getenv('FLASK_ENV', 'development')

    if env == 'production':
        app.config.from_object(ProductionConfig)
    elif env == 'testing':
        app.config.from_object(TestingConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    # ========== CORS CONFIGURATION ==========
    # Allow all origins for development (restrict in production)
    CORS(app, 
         origins=[
             'http://localhost:3000',
             'http://127.0.0.1:3000',
             'http://13.245.255.204',
             'http://13.245.255.204:80',
             'http://localhost',
             'http://0.0.0.0:3000',
             '*'
         ],
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
         expose_headers=['Content-Type', 'Authorization']
    )
    
    # Manually add CORS headers as a fallback
    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get('Origin')
        if origin:
            response.headers.add('Access-Control-Allow-Origin', origin)
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
        return response
    
    # Handle OPTIONS requests explicitly
    @app.route('/<path:path>', methods=['OPTIONS'])
    @app.route('/', methods=['OPTIONS'])
    def handle_options(path=None):
        response = jsonify({})
        origin = request.headers.get('Origin')
        if origin:
            response.headers.add('Access-Control-Allow-Origin', origin)
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
        return response, 200

    # ── Initialize Flask extensions ──────────────────────────────────────────
    db.init_app(app)
    JWTManager(app)
    Migrate(app, db)

    # ── Register blueprints (route groups) ───────────────────────────────────
    app.register_blueprint(auth_bp,     url_prefix='/api/auth')
    app.register_blueprint(products_bp, url_prefix='/api')
    app.register_blueprint(cart_bp,     url_prefix='/api')
    app.register_blueprint(orders_bp,   url_prefix='/api')

    # ── Global error handlers ─────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'error': 'Method not allowed'}), 405

    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

    # ── Request timing hooks for Prometheus ──────────────────────────────────
    @app.before_request
    def start_timer():
        g.start_time = time.time()

    @app.after_request
    def record_metrics(response):
        duration = time.time() - g.start_time if hasattr(g, 'start_time') else 0
        endpoint = request.endpoint or 'unknown'
        
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=endpoint,
            status_code=str(response.status_code)
        ).inc()
        
        REQUEST_LATENCY.labels(
            method=request.method,
            endpoint=endpoint
        ).observe(duration)
        
        return response

    # ── /health — readiness and liveness check ────────────────────────────────
    @app.route('/health', methods=['GET'])
    def health_check():
        try:
            db.session.execute(db.text('SELECT 1'))
            return jsonify({
                'status':   'healthy',
                'service':  'shopswift-api',
                'database': 'connected',
                'version':  os.getenv('IMAGE_TAG', 'local'),
                'env':      env
            }), 200
        except Exception as e:
            return jsonify({
                'status':   'unhealthy',
                'service':  'shopswift-api',
                'database': 'disconnected',
                'error':    str(e)
            }), 500

    # ── /metrics — Prometheus scrape endpoint ─────────────────────────────────
    @app.route('/metrics', methods=['GET'])
    def metrics():
        return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

    return app


# ─────────────────────────────────────────────────────────────────────────────
# Entry point for direct execution: python -m src.app
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)