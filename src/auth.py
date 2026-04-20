from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from src.models import db, User

auth_bp = Blueprint('auth', __name__)
# A Blueprint is a group of related routes. We register it with the app in app.py.


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    POST /api/auth/register
    Body: { "email": "...", "password": "...", "full_name": "...", "phone_number": "(optional)" }
    """
    data = request.get_json()

    # --- Input validation ---
    required = ['email', 'password', 'full_name']
    missing  = [field for field in required if not data.get(field)]
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

    if len(data['password']) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    # --- Check for duplicate email ---
    if User.query.filter_by(email=data['email'].lower()).first():
        return jsonify({'error': 'An account with this email already exists'}), 409

    # --- Create and save user ---
    user = User(
        email        = data['email'].lower().strip(),
        full_name    = data['full_name'].strip(),
        phone_number = data.get('phone_number', ''),
        address      = data.get('address', ''),
    )
    user.set_password(data['password'])  # hashes the password

    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'Account created successfully', 'user': user.to_dict()}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    POST /api/auth/login
    Body: { "email": "...", "password": "..." }
    Returns a JWT token to use in future requests.
    """
    data = request.get_json()

    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400

    user = User.query.filter_by(email=data['email'].lower()).first()

    # Intentionally vague error — don't tell attackers if email exists
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account has been deactivated'}), 403

    # Create JWT token with user ID as the "identity"
    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        'access_token': access_token,
        'token_type':   'Bearer',
        'user':         user.to_dict()
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()  # This decorator blocks the request if no valid token is provided
def get_current_user():
    """
    GET /api/auth/me
    Header: Authorization: Bearer <token>
    Returns the profile of the currently logged-in user.
    """
    user_id = get_jwt_identity()          # Extracts the ID we put in the token at login
    user    = User.query.get(int(user_id))

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify(user.to_dict()), 200


@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    """
    PUT /api/auth/me
    Update the logged-in user's profile.
    """
    user_id = get_jwt_identity()
    user    = User.query.get(int(user_id))
    data    = request.get_json()

    # Only update fields that were sent
    if 'full_name'    in data: user.full_name    = data['full_name'].strip()
    if 'phone_number' in data: user.phone_number = data['phone_number']
    if 'address'      in data: user.address      = data['address']

    # Password change requires current password confirmation
    if 'new_password' in data:
        if not data.get('current_password'):
            return jsonify({'error': 'current_password required to change password'}), 400
        if not user.check_password(data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 401
        user.set_password(data['new_password'])

    db.session.commit()
    return jsonify(user.to_dict()), 200