from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models import db, CartItem, Product

cart_bp = Blueprint('cart', __name__)


@cart_bp.route('/cart', methods=['GET'])
@jwt_required()
def get_cart():
    """
    GET /api/cart
    Returns all items currently in the logged-in user's cart,
    plus the total price.
    """
    user_id    = int(get_jwt_identity())
    cart_items = CartItem.query.filter_by(user_id=user_id).all()

    items = [item.to_dict() for item in cart_items]
    total = sum(item['subtotal'] for item in items)

    return jsonify({
        'items':       items,
        'item_count':  len(items),
        'total':       round(total, 2),
    }), 200


@cart_bp.route('/cart', methods=['POST'])
@jwt_required()
def add_to_cart():
    """
    POST /api/cart
    Body: { "product_id": 3, "quantity": 2 }
    If product is already in cart, quantity is ADDED to existing amount.
    """
    user_id = int(get_jwt_identity())
    data    = request.get_json()

    if not data.get('product_id'):
        return jsonify({'error': 'product_id is required'}), 400

    quantity = int(data.get('quantity', 1))
    if quantity < 1:
        return jsonify({'error': 'Quantity must be at least 1'}), 400

    # Verify product exists and has enough stock
    product = Product.query.filter_by(id=data['product_id'], is_active=True).first()
    if not product:
        return jsonify({'error': 'Product not found'}), 404

    if product.stock < quantity:
        return jsonify({'error': f'Only {product.stock} units in stock'}), 400

    # Check if already in cart
    existing = CartItem.query.filter_by(user_id=user_id, product_id=product.id).first()

    if existing:
        new_qty = existing.quantity + quantity
        if new_qty > product.stock:
            return jsonify({'error': f'Cannot add {quantity} more — only {product.stock - existing.quantity} additional units available'}), 400
        existing.quantity = new_qty
    else:
        cart_item = CartItem(user_id=user_id, product_id=product.id, quantity=quantity)
        db.session.add(cart_item)

    db.session.commit()
    return jsonify({'message': 'Added to cart'}), 201


@cart_bp.route('/cart/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_cart_item(item_id):
    """
    PUT /api/cart/7
    Body: { "quantity": 3 }
    Update the quantity of a specific cart item.
    Set quantity to 0 to remove the item.
    """
    user_id   = int(get_jwt_identity())
    cart_item = CartItem.query.filter_by(id=item_id, user_id=user_id).first()

    if not cart_item:
        return jsonify({'error': 'Cart item not found'}), 404

    data     = request.get_json()
    quantity = int(data.get('quantity', 1))

    if quantity <= 0:
        db.session.delete(cart_item)
        db.session.commit()
        return jsonify({'message': 'Item removed from cart'}), 200

    if quantity > cart_item.product.stock:
        return jsonify({'error': f'Only {cart_item.product.stock} units available'}), 400

    cart_item.quantity = quantity
    db.session.commit()
    return jsonify(cart_item.to_dict()), 200


@cart_bp.route('/cart/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(item_id):
    """DELETE /api/cart/7 — Remove a specific item from cart"""
    user_id   = int(get_jwt_identity())
    cart_item = CartItem.query.filter_by(id=item_id, user_id=user_id).first()

    if not cart_item:
        return jsonify({'error': 'Cart item not found'}), 404

    db.session.delete(cart_item)
    db.session.commit()
    return jsonify({'message': 'Item removed'}), 200


@cart_bp.route('/cart', methods=['DELETE'])
@jwt_required()
def clear_cart():
    """DELETE /api/cart — Remove ALL items from the cart (called after placing an order)"""
    user_id = int(get_jwt_identity())
    CartItem.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'message': 'Cart cleared'}), 200