# tests/test_products.py

import json
import pytest
from src.models import db, Category, Product, User


# ─── Helpers ──────────────────────────────────────────────────────────────────

def create_admin(app):
    """Seed an admin user directly into the DB."""
    with app.app_context():
        admin = User(email='admin@test.com', full_name='Admin', is_admin=True)
        admin.set_password('Admin@123')
        db.session.add(admin)
        db.session.commit()


def create_regular_user(app):
    """Seed a regular user directly into the DB."""
    with app.app_context():
        user = User(email='user@test.com', full_name='User', is_admin=False)
        user.set_password('User@123')
        db.session.add(user)
        db.session.commit()


def login(client, email, password):
    """Log in and return the JWT token."""
    response = client.post('/api/auth/login', json={
        'email': email, 'password': password
    })
    return json.loads(response.data)['access_token']


def seed_category(app, name='Electronics', slug='electronics'):
    """Seed a category and return its ID as a plain int."""
    with app.app_context():
        cat = Category(name=name, slug=slug)
        db.session.add(cat)
        db.session.commit()
        return int(cat.id)


def seed_product(app, cat_id, name='Test Laptop', price=12999.99):
    """Seed a product and return its ID as a plain int."""
    with app.app_context():
        product = Product(
            name=name,
            price=price,
            category_id=cat_id,
            brand='Dell',
            stock=10
        )
        db.session.add(product)
        db.session.commit()
        return int(product.id)


# ─── Tests ────────────────────────────────────────────────────────────────────

def test_get_products_empty(client):
    """Empty DB returns 200 with total of 0."""
    response = client.get('/api/products')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'products' in data
    assert data['total'] == 0


def test_get_products_with_data(client, app):
    """Seeded product appears in the list."""
    cat_id = seed_category(app)
    seed_product(app, cat_id)

    response = client.get('/api/products')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['total'] == 1
    assert data['products'][0]['name'] == 'Test Laptop'


def test_get_single_product(client, app):
    """Fetch one product by ID."""
    cat_id = seed_category(app)
    product_id = seed_product(app, cat_id)

    response = client.get(f'/api/products/{product_id}')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['name'] == 'Test Laptop'
    assert float(data['price']) == 12999.99


def test_get_nonexistent_product(client):
    """Non-existent ID returns 404."""
    response = client.get('/api/products/99999')
    assert response.status_code == 404


def test_create_product_as_admin(client, app):
    """Admin can create a product."""
    create_admin(app)
    token = login(client, 'admin@test.com', 'Admin@123')
    cat_id = seed_category(app)

    response = client.post('/api/products',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'name':        'LG Fridge',
            'price':       15999.99,
            'category_id': cat_id,
            'brand':       'LG',
            'stock':       3
        }
    )
    assert response.status_code == 201


def test_create_product_as_non_admin(client, app):
    """
    Non-admin blocked with 403.
    Route rejects at the admin check — never reaches DB.
    category_id 999 is intentionally fake.
    """
    create_regular_user(app)
    token = login(client, 'user@test.com', 'User@123')

    response = client.post('/api/products',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'name':        'Hacked Product',
            'price':       1.00,
            'category_id': 999
        }
    )
    assert response.status_code == 403