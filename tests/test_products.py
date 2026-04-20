# tests/test_products.py

import json
from src.models import db, Category, Product, User


# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_admin_token(client):
    """Creates an admin user directly in DB and returns their JWT token."""
    with client.application.app_context():
        existing = User.query.filter_by(email='admin@test.com').first()
        if not existing:
            admin = User(email='admin@test.com', full_name='Admin', is_admin=True)
            admin.set_password('Admin@123')
            db.session.add(admin)
            db.session.commit()

    response = client.post('/api/auth/login', json={
        'email': 'admin@test.com', 'password': 'Admin@123'
    })
    return json.loads(response.data)['access_token']


def get_regular_token(client):
    """Creates a regular (non-admin) user and returns their JWT token."""
    with client.application.app_context():
        existing = User.query.filter_by(email='regular@test.com').first()
        if not existing:
            user = User(
                email='regular@test.com',
                full_name='Regular User',
                is_admin=False
            )
            user.set_password('Pass@123')
            db.session.add(user)
            db.session.commit()

    response = client.post('/api/auth/login', json={
        'email': 'regular@test.com', 'password': 'Pass@123'
    })
    return json.loads(response.data)['access_token']


def get_or_create_category(client, name, slug):
    """
    Returns a category ID — creates it only if the slug doesn't exist yet.
    This is the KEY fix: multiple tests call this with the same slug,
    so we check first instead of always inserting.
    Returns a plain int so it stays valid after the context closes.
    """
    with client.application.app_context():
        existing = Category.query.filter_by(slug=slug).first()
        if existing:
            return int(existing.id)
        cat = Category(name=name, slug=slug)
        db.session.add(cat)
        db.session.commit()
        return int(cat.id)


def get_or_create_product(client, cat_id, name, price, stock=10):
    """
    Returns a product ID — creates it only if the name doesn't exist yet.
    Returns a plain int so it stays valid after the context closes.
    """
    with client.application.app_context():
        existing = Product.query.filter_by(name=name).first()
        if existing:
            return int(existing.id)
        product = Product(
            name=name,
            price=price,
            category_id=cat_id,
            brand='Test Brand',
            stock=stock
        )
        db.session.add(product)
        db.session.commit()
        return int(product.id)


# ─── Tests ────────────────────────────────────────────────────────────────────

def test_get_products_empty(client):
    """
    Product list on a fresh DB returns 200 with a list.
    We don't assert empty because other tests may have seeded data —
    the DB is shared for the whole test session.
    """
    response = client.get('/api/products')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'products' in data
    assert isinstance(data['products'], list)


def test_get_products_with_data(client):
    """After seeding, the API returns the product we inserted."""
    cat_id = get_or_create_category(client, 'Electronics', 'electronics-test')
    get_or_create_product(client, cat_id, 'Test Laptop', 12999.99)

    response = client.get('/api/products')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['total'] >= 1
    names = [p['name'] for p in data['products']]
    assert 'Test Laptop' in names


def test_get_single_product(client):
    """Fetch a specific product by ID — confirm name and price match."""
    cat_id = get_or_create_category(client, 'Electronics', 'electronics-test')
    product_id = get_or_create_product(client, cat_id, 'Test Laptop', 12999.99)

    response = client.get(f'/api/products/{product_id}')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['name'] == 'Test Laptop'
    assert float(data['price']) == 12999.99


def test_get_nonexistent_product(client):
    """Product ID that doesn't exist returns 404."""
    response = client.get('/api/products/99999')
    assert response.status_code == 404


def test_create_product_as_admin(client):
    """
    Admin user can POST a new product.
    We use get_or_create so the category exists
    whether or not previous tests already made it.
    """
    token = get_admin_token(client)
    cat_id = get_or_create_category(client, 'Appliances', 'appliances-test')

    response = client.post('/api/products',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'name': 'LG Fridge Admin Test',   # Unique name — won't clash with other tests
            'price': 15999.99,
            'category_id': cat_id,
            'brand': 'LG',
            'stock': 3
        }
    )
    assert response.status_code == 201


def test_create_product_as_non_admin(client):
    """
    Non-admin blocked with 403 before DB is ever touched.
    category_id 999 is intentionally fake — the route
    returns 403 at the admin check before validating anything else.
    """
    token = get_regular_token(client)

    response = client.post('/api/products',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'name': 'Hacked Product',
            'price': 1.00,
            'category_id': 999
        }
    )
    assert response.status_code == 403