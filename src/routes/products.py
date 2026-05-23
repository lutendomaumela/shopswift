from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models import db, Product, Category, User

products_bp = Blueprint('products', __name__)


@products_bp.route('/products', methods=['GET'])
def get_products():
    """
    GET /api/products
    Public — anyone can browse products.
    Optional query params:
      ?category_id=2      filter by category
      ?search=samsung     search product names
      ?page=1             pagination (default page 1)
      ?per_page=20        results per page (default 20, max 100)
      ?min_price=100      filter by minimum price
      ?max_price=500      filter by maximum price
      ?in_stock=true      only show products with stock > 0
    """
    # Start with all active products
    query = Product.query.filter_by(is_active=True)

    # Apply filters from query params
    category_id = request.args.get('category_id', type=int)
    search      = request.args.get('search', '').strip()
    min_price   = request.args.get('min_price', type=float)
    max_price   = request.args.get('max_price', type=float)
    in_stock    = request.args.get('in_stock', '').lower() == 'true'

    if category_id: query = query.filter_by(category_id=category_id)
    if search:      query = query.filter(Product.name.ilike(f'%{search}%'))
    if min_price:   query = query.filter(Product.price >= min_price)
    if max_price:   query = query.filter(Product.price <= max_price)
    if in_stock:    query = query.filter(Product.stock > 0)

    # Pagination — never return ALL rows (could be millions)
    page     = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)  # cap at 100
    paginated = query.order_by(Product.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'products':    [p.to_dict() for p in paginated.items],
        'total':       paginated.total,
        'pages':       paginated.pages,
        'current_page': page,
        'per_page':    per_page,
    }), 200


@products_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """GET /api/products/5  — Get a single product by ID"""
    product = Product.query.filter_by(id=product_id, is_active=True).first_or_404()
    return jsonify(product.to_dict()), 200


@products_bp.route('/products', methods=['POST'])
@jwt_required()
def create_product():
    """
    POST /api/products  — Admin only: add a new product.
    Body: { "name": "...", "price": 999.99, "category_id": 1, "brand": "...", "stock": 10 }
    """
    user_id = get_jwt_identity()
    user    = User.query.get(int(user_id))

    if not user or not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json()

    required = ['name', 'price', 'category_id']
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing: {", ".join(missing)}'}), 400

    if not Category.query.get(data['category_id']):
        return jsonify({'error': 'Category not found'}), 404

    product = Product(
        name        = data['name'],
        description = data.get('description', ''),
        price       = data['price'],
        category_id = data['category_id'],
        brand       = data.get('brand', ''),
        sku         = data.get('sku', ''),
        stock       = data.get('stock', 0),
        image_url   = data.get('image_url', ''),
    )

    db.session.add(product)
    db.session.commit()

    return jsonify({'message': 'Product created', 'product': product.to_dict()}), 201


@products_bp.route('/products/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    """PUT /api/products/5  — Admin only: update a product"""
    user = User.query.get(int(get_jwt_identity()))
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    product = Product.query.get_or_404(product_id)
    data    = request.get_json()

    for field in ['name', 'description', 'price', 'brand', 'sku', 'stock', 'image_url', 'is_active']:
        if field in data:
            setattr(product, field, data[field])

    db.session.commit()
    return jsonify(product.to_dict()), 200


@products_bp.route('/categories', methods=['GET'])
def get_categories():
    """GET /api/categories — List all categories"""
    categories = Category.query.all()
    return jsonify([c.to_dict() for c in categories]), 200