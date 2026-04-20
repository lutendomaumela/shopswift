# tests/test_products.py

import json
from src.models import db, Category, Product, User


def get_admin_token(client):
    """Helper — creates an admin user and returns their JWT token."""
    with client.application.app_context():
        # Check if admin already exists (tests share the session)
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
    """Helper — creates a regular user and returns their JWT token."""
    with client.application.app_context():
        existing = User.query.filter_by(email='regular@test.com').first()
        if not existing:
            user = User(email='regular@test.com', full_name='Regular', is_admin=False)
            user.set_password('Pass@123')
            db.session.add(user)
            db.session.commit()

    response = client.post('/api/auth/login', json={
        'email': 'regular@test.com', 'password': 'Pass@123'
    })
    return json.loads(response.data)['access_token']


def create_test_category(client, name, slug):
    """Helper — creates a category and returns its ID."""
    with client.application.app_context():
        existing = Category.query.filter_by(slug=slug).first()
        if existing:
            return existing.id
        cat = Category(name=name, slug=slug)
        db.session.add(cat)
        db.session.commit()
        return cat.id


def test_get_products_empty(client):
    """Fresh database — product list should return 200 with an empty array."""
    response = client.get('/api/products')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'products' in data
    assert isinstance(data['products'], list)


def test_get_products_with_data(client):
    """Seed a product directly in the DB, then confirm the API returns it."""
    with client.application.app_context():
        cat = Category(name='Electronics', slug='electronics-main')
        db.session.add(cat)
        db.session.flush()
        product = Product(name='Test TV', price=9999.99,
                          category_id=cat.id, stock=5)
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
    # Create the category first — never rely on a hardcoded ID
    cat_id = create_test_category(client, 'Appliances', 'appliances-test')

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
    Regular users must NOT be able to create products — returns 403.
    This test previously hung because it used category_id: 1 which
    didn't exist, causing a DB transaction to lock indefinitely.
    Now we use a real category ID.
    """
    token = get_regular_token(client)
    cat_id = create_test_category(client, 'Audio', 'audio-test')

    response = client.post('/api/products',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'name': 'Hacked Product',
            'price': 1.00,
            'category_id': cat_id
        }
    )
    # Should be blocked at the admin check — never reaches the DB
    assert response.status_code == 403