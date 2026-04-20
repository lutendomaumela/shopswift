# tests/test_products.py

import json
from src.models import db, Category, Product, User


def get_admin_token(client):
    """
    Helper — creates an admin user and returns their JWT token.
    Reused across multiple tests that need admin access.
    """
    from src.models import User
    from src.app import create_app

    # Create admin directly in DB (bypassing the API which doesn't expose is_admin)
    with client.application.app_context():
        admin = User(email='admin@test.com', full_name='Admin', is_admin=True)
        admin.set_password('Admin@123')
        db.session.add(admin)
        db.session.commit()

    response = client.post('/api/auth/login', json={
        'email': 'admin@test.com', 'password': 'Admin@123'
    })
    return json.loads(response.data)['access_token']


def test_get_products_empty(client):
    """
    Fresh database — product list should return 200 with an empty array.
    Tests that the endpoint works even with no data.
    """
    response = client.get('/api/products')
    assert response.status_code == 200

    data = json.loads(response.data)
    assert 'products' in data
    assert isinstance(data['products'], list)


def test_get_products_with_data(client):
    """
    Seed a product directly in the DB, then confirm the API returns it.
    """
    with client.application.app_context():
        cat = Category(name='Electronics', slug='electronics')
        db.session.add(cat)
        db.session.flush()

        product = Product(
            name='Test TV',
            price=9999.99,
            category_id=cat.id,
            stock=5
        )
        db.session.add(product)
        db.session.commit()

    response = client.get('/api/products')
    assert response.status_code == 200

    data = json.loads(response.data)
    assert data['total'] >= 1
    names = [p['name'] for p in data['products']]
    assert 'Test TV' in names


def test_get_single_product(client):
    """Fetch a specific product by ID."""
    with client.application.app_context():
        cat = Category(name='Gadgets2', slug='gadgets2')
        db.session.add(cat)
        db.session.flush()
        product = Product(name='Smart Watch', price=4999.99,
                          category_id=cat.id, stock=10)
        db.session.add(product)
        db.session.commit()
        product_id = product.id

    response = client.get(f'/api/products/{product_id}')
    assert response.status_code == 200

    data = json.loads(response.data)
    assert data['name'] == 'Smart Watch'
    assert data['price'] == 4999.99


def test_get_nonexistent_product(client):
    """Fetching a product that doesn't exist should return 404."""
    response = client.get('/api/products/99999')
    assert response.status_code == 404


def test_create_product_as_admin(client):
    """Admin users can create products."""
    token = get_admin_token(client)

    with client.application.app_context():
        cat = Category(name='Appliances2', slug='appliances2')
        db.session.add(cat)
        db.session.commit()
        cat_id = cat.id

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


def test_create_product_as_non_admin(client):
    """Regular users must NOT be able to create products — returns 403."""
    client.post('/api/auth/register', json={
        'email': 'regular@test.com', 'password': 'Pass@123', 'full_name': 'Regular'
    })
    login = client.post('/api/auth/login',
        json={'email': 'regular@test.com', 'password': 'Pass@123'})
    token = json.loads(login.data)['access_token']

    response = client.post('/api/products',
        headers={'Authorization': f'Bearer {token}'},
        json={'name': 'Hacked Product', 'price': 1.00, 'category_id': 1}
    )
    assert response.status_code == 403