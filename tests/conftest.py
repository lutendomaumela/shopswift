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
    application = create_app()   # TestingConfig loads automatically
                                 # because FLASK_ENV=testing is set above

    with application.app_context():
        _db.drop_all()
        _db.create_all()
        yield application
        _db.session.remove()
        _db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """
    Fresh test client for every test.
    The app fixture already guarantees a clean database.
    """
    return app.test_client()