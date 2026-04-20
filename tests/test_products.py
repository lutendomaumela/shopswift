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


def seed_category_and_product(client):
    """
    Seeds a category + product using the app context.
    Returns (category_id, product_id) so tests can use real IDs.
    We return primitive ints — NOT SQLAlchemy objects —
    because objects become detached once the context closes.
    """
    with client.application.app_context():
        cat = Category(name='Test Electronics', slug='test-electronics')
        db.session.add(cat)
        db.session.flush()

        product = Product(
            name='Test Laptop',
            price=12999.99,
            category_id=cat.id,
            brand='Dell',
            stock=10
        )
        db.session.add(product)
        db.session.commit()

        # Extract plain ints BEFORE the context closes
        return int(cat.id), int(product.id)


# ─── Tests ────────────────────────────────────────────────────────────────────

def test_get_products_empty(client):
    """
    Product list on a fresh DB returns 200 with an empty list.
    Proves the endpoint works even with no data.
    """
    response = client.get('/api/products')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'products' in data
    assert isinstance(data['products'], list)


def test_get_products_with_data(client):
    """
    After seeding, the API returns the product we inserted.
    """
    cat_id, _ = seed_category_and_product(client)

    response = client.get('/api/products')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['total'] >= 1
    names = [p['name'] for p in data['products']]
    assert 'Test Laptop' in names


def test_get_single_product(client):
    """Fetch a specific product by ID — confirm name and price match."""
    _, product_id = seed_category_and_product(client)

    response = client.get(f'/api/products/{product_id}')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['name'] == 'Test Laptop'
    assert data['price'] == 12999.99


def test_get_nonexistent_product(client):
    """Product ID that doesn't exist returns 404."""
    response = client.get('/api/products/99999')
    assert response.status_code == 404


def test_create_product_as_admin(client):
    """
    Admin user can POST a new product.
    We seed a real category first so the FK constraint is satisfied.
    """
    token = get_admin_token(client)
    cat_id, _ = seed_category_and_product(client)

    response = client.post('/api/products',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'name': 'LG Fridge',
            'price': 15999.99,
            'category_id': cat_id,
            'brand': 'LG',
            'stock': 3
        }
    )
    assert response.status_code == 201


def test_create_product_as_non_admin(client):
    """
    Non-admin users are blocked with 403 BEFORE the request
    ever touches the database.

    The route checks is_admin first:
        if not user or not user.is_admin:
            return 403

    So we do NOT need a real category_id here — the request
    is rejected before category validation runs.
    Passing 999 is intentional: proves the gate works regardless
    of whether the data is valid.
    """
    token = get_regular_token(client)

    response = client.post('/api/products',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'name': 'Hacked Product',
            'price': 1.00,
            'category_id': 999    # Fake ID — never reaches DB validation
        }
    )
    assert response.status_code == 403