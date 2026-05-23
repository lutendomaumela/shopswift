# tests/conftest.py

import pytest
import os

os.environ['DATABASE_URL']   = 'postgresql://postgres:password@localhost:5432/shopswift_test'
os.environ['JWT_SECRET_KEY'] = 'test-secret-key'
os.environ['SECRET_KEY']     = 'test-flask-secret'
os.environ['FLASK_ENV']      = 'testing'
os.environ['FLASK_APP']      = 'src.app:create_app'

from src.app import create_app
from src.models import db as _db


@pytest.fixture(scope='function')
def app():
    """
    Creates a complete Flask app for each test.
    TestingConfig is selected automatically via FLASK_ENV=testing.
    TestingConfig includes NullPool — no connection pooling between tests.
    Tables are wiped and rebuilt before every test for clean isolation.
    """
    application = create_app()

    with application.app_context():
        # Remove any tables from previous test
        _db.drop_all()
        # Build fresh tables for this test
        _db.create_all()
        yield application
        # Close any open sessions
        _db.session.remove()
        # Clean up after this test
        _db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """
    A test HTTP client that talks to the app without a real server.
    Each test gets a fresh client backed by a fresh database.
    """
    return app.test_client()