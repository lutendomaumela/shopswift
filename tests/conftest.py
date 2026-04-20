# tests/conftest.py
#
# conftest.py is pytest's setup file.
# Everything defined here is available to ALL test files automatically.
# Think of it as "shared equipment" for your tests.

import pytest
import os

# Point to a test database BEFORE the app is imported
# This is critical — the app reads DATABASE_URL at import time
os.environ['DATABASE_URL']    = 'postgresql://postgres:password@localhost:5432/shopswift_test'
os.environ['JWT_SECRET_KEY']  = 'test-secret-key'
os.environ['SECRET_KEY']      = 'test-flask-secret'
os.environ['FLASK_ENV']       = 'testing'

from src.app import create_app
from src.models import db as _db


@pytest.fixture(scope='session')
def app():
    """
    Create a Flask app instance for the ENTIRE test session.
    scope='session' means this runs once for all tests, not once per test.
    Using a separate test database so tests never touch your real data.
    """
    application = create_app()
    application.config['TESTING'] = True
    application.config['SQLALCHEMY_DATABASE_URI'] = os.environ['DATABASE_URL']

    with application.app_context():
        _db.create_all()   # Create all tables in the test database
        yield application   # Hand the app to the tests
        _db.drop_all()      # Clean up — delete all tables when tests finish


@pytest.fixture(scope='function')
def client(app):
    """
    A test client that simulates HTTP requests without running a real server.
    scope='function' means each test gets a fresh client.
    """
    return app.test_client()


@pytest.fixture(scope='function')
def db(app):
    """
    Database fixture that rolls back after each test.
    This means tests are isolated — test A's data doesn't affect test B.
    """
    with app.app_context():
        yield _db
        _db.session.rollback()   # Undo any changes made during the test