# tests/test_products.py

import json
from src.models import db, Category, Product, User


# ─── Helpers ──────────────────────────────────────────────────────────────────

def create_admin_token(client):
    """Create a fresh admin user and return their JWT token."""
    with client.application.app_context():
        admin = User(email='admin@test.com', full_name='Admin', is_admin=True)
        admin.set_password('Admin@123')
        db.session.add(admin)
        db.session.commit()

    response = client.post('/api/auth/login', json={
        'email': 'admin@test.com', 'password': 'Admin@123'
    })
    return json.loads(response.data)['access_token']


def create_regular_token(client):
    """Create a fresh regular user and return their JWT token."""
    with client.application.app_context():
        user = User(email='regular@test.com', full_name='Regular', is_admin=False)
        user.set_password('Pass@123')
        db.session.add(user)
        db.session.commit()

    response = client.post('/api/auth/login', json={
        'email': 'regular@test.com', 'password': 'Pass@123'
    })
    return json.loads(response.data)['access_token']


def create_category_and_product(client):
    """
    Seed one category and one product.
    Returns plain ints — NOT SQLAlchemy objects.
    Objects go stale once the app_context closes, ints never do.
    """
    with client.application.app_context():
        cat = Category(name='Electronics', slug='electronics')
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

        return int(cat.id), int(product.id)


# ─── Tests ────────────────────────────────────────────────────────────────────

def test_get_products_empty(client):
    """
    Empty DB returns 200 with empty list.
    DB is guaranteed empty because conftest truncates before every test.
    """
    response = client.get('/api/products')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'products' in data
    assert data['total'] == 0


def test_get_products_with_data(client):
    """Seeded product appears in the list."""
    create_category_and_product(client)

    response = client.get('/api/products')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['total'] == 1
    assert data['products'][0]['name'] == 'Test Laptop'


def test_get_single_product(client):
    """Fetch a specific product by ID."""
    _, product_id = create_category_and_product(client)

    response = client.get(f'/api/products/{product_id}')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['name'] == 'Test Laptop'
    assert float(data['price']) == 12999.99


def test_get_nonexistent_product(client):
    """Non-existent product ID returns 404."""
    response = client.get('/api/products/99999')
    assert response.status_code == 404


def test_create_product_as_admin(client):
    """Admin can create a product."""
    token = create_admin_token(client)
    cat_id, _ = create_category_and_product(client)

    response = client.post('/api/products',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'name':        'New Fridge',
            'price':       15999.99,
            'category_id': cat_id,
            'brand':       'LG',
            'stock':       3
        }
    )
    assert response.status_code == 201


def test_create_product_as_non_admin(client):
    """
    Non-admin blocked at the first line of the route — before any DB call.
    category_id 999 is intentionally fake: proves the admin check
    fires before ANY validation or DB lookup happens.
    """
    token = create_regular_token(client)

    response = client.post('/api/products',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'name':        'Hacked Product',
            'price':       1.00,
            'category_id': 999
        }
    )
    assert response.status_code == 403