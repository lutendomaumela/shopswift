# tests/conftest.py

import pytest
import os

os.environ['DATABASE_URL']   = 'postgresql://postgres:password@localhost:5432/shopswift_test'
os.environ['JWT_SECRET_KEY'] = 'test-secret-key'
os.environ['SECRET_KEY']     = 'test-flask-secret'
os.environ['FLASK_ENV']      = 'testing'

from src.app import create_app
from src.models import db as _db


@pytest.fixture(scope='session')
def app():
    """
    One Flask app for the entire test session.
    Creates all tables once at the start, drops them at the end.
    """
    application = create_app()
    application.config['TESTING'] = True
    application.config['SQLALCHEMY_DATABASE_URI'] = os.environ['DATABASE_URL']

    with application.app_context():
        _db.create_all()
        yield application
        _db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """
    Each test gets:
    1. A completely empty database — no leftover data from previous tests
    2. A fresh test client
    3. A clean session after the test finishes

    This is the KEY fix. Truncating before every test means:
    - No unique constraint violations (emails, slugs already exist)
    - No locked rows from a previous test's open transaction
    - Every test is 100% independent — order doesn't matter
    """
    with app.app_context():
        # Truncate every table in the right order (foreign keys first)
        # RESTART IDENTITY resets auto-increment IDs back to 1
        # CASCADE handles foreign key dependencies automatically
        _db.session.execute(_db.text(
            'TRUNCATE TABLE order_items, orders, cart_items, products, categories, users '
            'RESTART IDENTITY CASCADE'
        ))
        _db.session.commit()
        _db.session.remove()   # Close the session cleanly before the test runs

    yield app.test_client()

    # Clean up after the test too — close any open session
    with app.app_context():
        _db.session.remove()