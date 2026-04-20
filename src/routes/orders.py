from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models import db, Order, OrderItem, CartItem, Product, User

orders_bp = Blueprint('orders', __name__)


@orders_bp.route('/orders', methods=['POST'])
@jwt_required()
def place_order():
    """
    POST /api/orders
    Converts the user's current cart into a confirmed order.
    Body (optional): { "shipping_address": "...", "notes": "..." }

    What happens:
    1. Get all cart items for this user
    2. Verify all products still have enough stock
    3. Create the Order and OrderItem records
    4. Reduce stock for each product
    5. Clear the cart
    """
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    data    = request.get_json() or {}

    # Get cart
    cart_items = CartItem.query.filter_by(user_id=user_id).all()
    if not cart_items:
        return jsonify({'error': 'Your cart is empty'}), 400

    # Verify stock for all items BEFORE creating the order (all-or-nothing)
    for item in cart_items:
        product = Product.query.get(item.product_id)
        if not product or not product.is_active:
            return jsonify({'error': f'Product "{item.product.name}" is no longer available'}), 400
        if product.stock < item.quantity:
            return jsonify({'error': f'Not enough stock for "{product.name}". Available: {product.stock}'}), 400

    # Calculate total
    total = sum(float(item.product.price) * item.quantity for item in cart_items)

    # Create the order
    order = Order(
        user_id          = user_id,
        total_amount     = round(total, 2),
        status           = 'pending',
        shipping_address = data.get('shipping_address') or user.address or '',
        notes            = data.get('notes', ''),
    )
    db.session.add(order)
    db.session.flush()  # Gets order.id without committing yet

    # Create order items + reduce stock
    for item in cart_items:
        order_item = OrderItem(
            order_id      = order.id,
            product_id    = item.product_id,
            quantity      = item.quantity,
            price_at_time = item.product.price,  # Lock in current price
        )
        db.session.add(order_item)

        # Reduce stock
        item.product.stock -= item.quantity

    # Clear the cart
    CartItem.query.filter_by(user_id=user_id).delete()

    db.session.commit()  # All changes saved at once (atomic transaction)

    return jsonify({
        'message': 'Order placed successfully!',
        'order':   order.to_dict()
    }), 201


@orders_bp.route('/orders', methods=['GET'])
@jwt_required()
def get_my_orders():
    """
    GET /api/orders
    Returns order history for the logged-in user, newest first.
    """
    user_id = int(get_jwt_identity())
    page    = request.args.get('page', 1, type=int)

    paginated = Order.query.filter_by(user_id=user_id)\
                           .order_by(Order.created_at.desc())\
                           .paginate(page=page, per_page=10, error_out=False)

    return jsonify({
        'orders':       [o.to_dict() for o in paginated.items],
        'total':        paginated.total,
        'pages':        paginated.pages,
        'current_page': page,
    }), 200


@orders_bp.route('/orders/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    """GET /api/orders/12 — Get a specific order (only your own)"""
    user_id = int(get_jwt_identity())
    order   = Order.query.filter_by(id=order_id, user_id=user_id).first()

    if not order:
        return jsonify({'error': 'Order not found'}), 404

    return jsonify(order.to_dict()), 200


@orders_bp.route('/orders/<int:order_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_order(order_id):
    """
    POST /api/orders/12/cancel
    Cancel an order if it hasn't shipped yet.
    Restores stock for all items.
    """
    user_id = int(get_jwt_identity())
    order   = Order.query.filter_by(id=order_id, user_id=user_id).first()

    if not order:
        return jsonify({'error': 'Order not found'}), 404

    if order.status in ['shipped', 'delivered']:
        return jsonify({'error': f'Cannot cancel an order that is already {order.status}'}), 400

    if order.status == 'cancelled':
        return jsonify({'error': 'Order is already cancelled'}), 400

    # Restore stock
    for item in order.items:
        item.product.stock += item.quantity

    order.status = 'cancelled'
    db.session.commit()

    return jsonify({'message': 'Order cancelled', 'order': order.to_dict()}), 200


# --- Admin-only routes ---

@orders_bp.route('/admin/orders', methods=['GET'])
@jwt_required()
def get_all_orders():
    """GET /api/admin/orders — Admin: see all orders"""
    user = User.query.get(int(get_jwt_identity()))
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    status = request.args.get('status')
    page   = request.args.get('page', 1, type=int)

    query = Order.query
    if status: query = query.filter_by(status=status)

    paginated = query.order_by(Order.created_at.desc()).paginate(page=page, per_page=20)

    return jsonify({
        'orders':       [o.to_dict() for o in paginated.items],
        'total':        paginated.total,
        'pages':        paginated.pages,
    }), 200


@orders_bp.route('/admin/orders/<int:order_id>/status', methods=['PUT'])
@jwt_required()
def update_order_status(order_id):
    """PUT /api/admin/orders/12/status — Admin: update order status"""
    user = User.query.get(int(get_jwt_identity()))
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    order = Order.query.get_or_404(order_id)
    data  = request.get_json()

    if data.get('status') not in Order.VALID_STATUSES:
        return jsonify({'error': f'Invalid status. Must be one of: {Order.VALID_STATUSES}'}), 400

    order.status = data['status']
    db.session.commit()

    return jsonify(order.to_dict()), 200