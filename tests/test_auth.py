# tests/test_auth.py
#
# These tests verify your authentication endpoints work correctly.
# Each function is one test case. pytest discovers them by the "test_" prefix.

import json


def test_health_check(client):
    """
    The simplest possible test — hit /health and confirm it returns 200.
    If this fails, nothing else matters.
    """
    response = client.get('/health')
    assert response.status_code == 200

    data = json.loads(response.data)
    assert data['status'] == 'healthy'


def test_register_success(client):
    """
    Register a new user and confirm:
    - Response is 201 Created
    - The returned JSON has the user's email
    """
    response = client.post('/api/auth/register',
        json={
            'email':     'test@shopswift.com',
            'password':  'SecurePass123',
            'full_name': 'Test User'
        }
    )
    assert response.status_code == 201

    data = json.loads(response.data)
    assert data['user']['email'] == 'test@shopswift.com'
    assert 'password' not in data['user']       # Password must NEVER be in the response
    assert 'password_hash' not in data['user']  # Hash must NEVER be in the response either


def test_register_duplicate_email(client):
    """
    Registering the same email twice should return 409 Conflict.
    This proves your duplicate-check logic works.
    """
    payload = {
        'email':     'duplicate@shopswift.com',
        'password':  'SecurePass123',
        'full_name': 'First User'
    }

    # First registration — should succeed
    client.post('/api/auth/register', json=payload)

    # Second registration — same email — should fail
    response = client.post('/api/auth/register', json=payload)
    assert response.status_code == 409


def test_register_missing_fields(client):
    """
    Sending incomplete data should return 400 Bad Request.
    Proves your input validation catches missing fields.
    """
    response = client.post('/api/auth/register',
        json={'email': 'incomplete@shopswift.com'}  # missing password and full_name
    )
    assert response.status_code == 400


def test_login_success(client):
    """
    Register then login — confirm we get back an access_token.
    This token is what every protected endpoint needs.
    """
    # Setup: create the user first
    client.post('/api/auth/register', json={
        'email':     'logintest@shopswift.com',
        'password':  'SecurePass123',
        'full_name': 'Login Test User'
    })

    # Test: login
    response = client.post('/api/auth/login', json={
        'email':    'logintest@shopswift.com',
        'password': 'SecurePass123'
    })
    assert response.status_code == 200

    data = json.loads(response.data)
    assert 'access_token' in data   # Token must be present
    assert len(data['access_token']) > 20  # Sanity check — real tokens are long


def test_login_wrong_password(client):
    """
    Wrong password should return 401 Unauthorized — not 200, not 400.
    The error message must be vague (don't tell attackers if the email exists).
    """
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
    """
    Hitting a JWT-protected route without a token should return 401.
    Proves @jwt_required() is actually blocking unauthorised access.
    """
    response = client.get('/api/auth/me')
    assert response.status_code == 401


def test_protected_route_with_token(client):
    """
    Full auth flow: register → login → use token → get profile.
    This is the real user journey end to end.
    """
    # Register
    client.post('/api/auth/register', json={
        'email':     'fullflow@shopswift.com',
        'password':  'SecurePass123',
        'full_name': 'Full Flow User'
    })

    # Login — grab the token
    login_response = client.post('/api/auth/login', json={
        'email':    'fullflow@shopswift.com',
        'password': 'SecurePass123'
    })
    token = json.loads(login_response.data)['access_token']

    # Use token on protected route
    response = client.get('/api/auth/me',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert response.status_code == 200

    data = json.loads(response.data)
    assert data['email'] == 'fullflow@shopswift.com'