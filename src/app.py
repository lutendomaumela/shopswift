from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from src.config import DevelopmentConfig, ProductionConfig, TestingConfig
from src.models import db
from src.auth import auth_bp
from src.routes.products import products_bp
from src.routes.cart import cart_bp
from src.routes.orders import orders_bp
import os


def create_app():
    """
    Application Factory Pattern.
    Instead of creating the Flask app at module level, we wrap it in a function.
    Why? So tests can create fresh app instances, and so Docker/Gunicorn can import
    this function without triggering side-effects.
    """
    app = Flask(__name__)

    # Load the right config based on environment
    env = os.getenv('FLASK_ENV', 'development')

    if env == 'production':
        app.config.from_object(ProductionConfig)
    elif env == 'testing':
        app.config.from_object(TestingConfig)   
    else:
        app.config.from_object(DevelopmentConfig)

    # Initialize extensions (attach them to the app instance)
    db.init_app(app)
    JWTManager(app)
    Migrate(app, db)

    # Register blueprints (groups of routes)
    app.register_blueprint(auth_bp,     url_prefix='/api/auth')
    app.register_blueprint(products_bp, url_prefix='/api')
    app.register_blueprint(cart_bp,     url_prefix='/api')
    app.register_blueprint(orders_bp,   url_prefix='/api')

    # --- Global error handlers ---
    # Without these, Flask returns HTML error pages; we want JSON.

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'error': 'Method not allowed'}), 405

    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()  # Roll back any failed DB transaction
        return jsonify({'error': 'Internal server error'}), 500

    # Health check endpoint — used by Docker and Kubernetes to verify the app is alive
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy', 'service': 'shopswift-api'}), 200

    return app


# Entry point when running: python -m src.app
if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)