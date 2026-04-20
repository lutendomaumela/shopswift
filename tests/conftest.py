# tests/conftest.py

import pytest
import os

os.environ['DATABASE_URL']   = 'postgresql://postgres:password@localhost:5432/shopswift_test'
os.environ['JWT_SECRET_KEY'] = 'test-secret-key'
os.environ['SECRET_KEY']     = 'test-flask-secret'
os.environ['FLASK_ENV']      = 'testing'

from src.app import create_app
from src.models import db as _db


@pytest.fixture(scope='function')
def app():
    """
    Create a brand new Flask app for EVERY single test.
    scope='function' = runs setup and teardown for each test function.

    Why not scope='session' (one app for all tests)?
    Because shared state between tests causes session locks in PostgreSQL.
    A fresh app = fresh connection pool = zero lock conflicts.
    """
    application = create_app()
    application.config['TESTING'] = True
    application.config['SQLALCHEMY_DATABASE_URI'] = os.environ['DATABASE_URL']
    # Disable connection pooling for tests
    # NullPool means every operation gets a brand new connection
    # and closes it immediately — no connections held between operations
    application.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'poolclass': __import__(
            'sqlalchemy.pool', fromlist=['NullPool']
        ).NullPool
    }

    with application.app_context():
        _db.drop_all()    # Wipe everything from the previous test
        _db.create_all()  # Rebuild clean tables
        yield application
        _db.session.remove()
        _db.drop_all()    # Clean up after this test finishes


@pytest.fixture(scope='function')
def client(app):
    """
    Fresh test client for every test.
    The app fixture already guarantees a clean database.
    """
    return app.test_client()