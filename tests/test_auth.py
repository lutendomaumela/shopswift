# tests/test_auth.py

import json


def test_health_check(client):
    """Health endpoint returns 200."""
    response = client.get('/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'


def test_register_success(client):
    """Register a new user — returns 201 with user data, no password exposed."""
    response = client.post('/api/auth/register', json={
        'email':     'test@shopswift.com',
        'password':  'SecurePass123',
        'full_name': 'Test User'
    })
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['user']['email'] == 'test@shopswift.com'
    assert 'password' not in data['user']
    assert 'password_hash' not in data['user']


def test_register_duplicate_email(client):
    """Same email twice returns 409 Conflict."""
    payload = {
        'email':     'dup@shopswift.com',
        'password':  'SecurePass123',
        'full_name': 'First User'
    }
    client.post('/api/auth/register', json=payload)
    response = client.post('/api/auth/register', json=payload)
    assert response.status_code == 409


def test_register_missing_fields(client):
    """Incomplete payload returns 400 Bad Request."""
    response = client.post('/api/auth/register',
        json={'email': 'incomplete@shopswift.com'}
    )
    assert response.status_code == 400


def test_login_success(client):
    """Register then login — response contains access_token."""
    client.post('/api/auth/register', json={
        'email':     'login@shopswift.com',
        'password':  'SecurePass123',
        'full_name': 'Login User'
    })
    response = client.post('/api/auth/login', json={
        'email':    'login@shopswift.com',
        'password': 'SecurePass123'
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'access_token' in data
    assert len(data['access_token']) > 20


def test_login_wrong_password(client):
    """Wrong password returns 401."""
    client.post('/api/auth/register', json={
        'email':     'wrongpass@shopswift.com',
        'password':  'CorrectPass123',
        'full_name': 'User'
    })
    response = client.post('/api/auth/login', json={
        'email':    'wrongpass@shopswift.com',
        'password': 'WrongPass999'
    })
    assert response.status_code == 401


def test_protected_route_without_token(client):
    """No token on a protected route returns 401."""
    response = client.get('/api/auth/me')
    assert response.status_code == 401


def test_protected_route_with_token(client):
    """Full flow: register → login → use token → get profile."""
    client.post('/api/auth/register', json={
        'email':     'fullflow@shopswift.com',
        'password':  'SecurePass123',
        'full_name': 'Full Flow User'
    })
    login_response = client.post('/api/auth/login', json={
        'email':    'fullflow@shopswift.com',
        'password': 'SecurePass123'
    })
    token = json.loads(login_response.data)['access_token']

    response = client.get('/api/auth/me',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['email'] == 'fullflow@shopswift.com'