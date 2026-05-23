from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    """
    Represents a customer account.
    Every order and cart item links back to a user.
    """
    __tablename__ = 'users'

    id           = db.Column(db.Integer, primary_key=True)
    email        = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash= db.Column(db.String(255), nullable=False)
    full_name    = db.Column(db.String(100), nullable=False)
    phone_number = db.Column(db.String(20))                      # e.g. "+27821234567"
    address      = db.Column(db.Text)                             # delivery address
    is_admin     = db.Column(db.Boolean, default=False)           # admin users can create products
    is_active    = db.Column(db.Boolean, default=True)            # soft-disable accounts
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at   = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships — SQLAlchemy auto-joins these for you
    orders     = db.relationship('Order',    backref='user', lazy=True)
    cart_items = db.relationship('CartItem', backref='user', lazy=True)

    # --- Helper methods (business logic lives on the model) ---
    def set_password(self, password: str):
        """Hash and store password. NEVER store plain text."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify a plain-text password against the stored hash."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        """Convert to JSON-safe dictionary (exclude password_hash!)"""
        return {
            'id':           self.id,
            'email':        self.email,
            'full_name':    self.full_name,
            'phone_number': self.phone_number,
            'address':      self.address,
            'is_admin':     self.is_admin,
            'created_at':   self.created_at.isoformat(),
        }


class Category(db.Model):
    """
    Product categories (Electronics, Appliances, Gadgets, etc.)
    Separate table means you can add/rename categories without touching Product rows.
    """
    __tablename__ = 'categories'

    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    slug        = db.Column(db.String(100), unique=True)  # URL-friendly: "home-appliances"

    products = db.relationship('Product', backref='category_ref', lazy=True)

    def to_dict(self) -> dict:
        return {'id': self.id, 'name': self.name, 'slug': self.slug}


class Product(db.Model):
    """
    An item available for purchase.
    Links to Category for filtering/navigation.
    """
    __tablename__ = 'products'

    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    price       = db.Column(db.Numeric(10, 2), nullable=False)   # e.g. 1299.99
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), index=True)
    brand       = db.Column(db.String(100))                        # "Samsung", "LG", "Apple"
    sku         = db.Column(db.String(100), unique=True)           # Stock Keeping Unit (unique product code)
    stock       = db.Column(db.Integer, default=0)
    image_url   = db.Column(db.String(500))
    is_active   = db.Column(db.Boolean, default=True)             # hide products without deleting
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            'id':          self.id,
            'name':        self.name,
            'description': self.description,
            'price':       float(self.price),
            'brand':       self.brand,
            'sku':         self.sku,
            'stock':       self.stock,
            'image_url':   self.image_url,
            'category':    self.category_ref.to_dict() if self.category_ref else None,
        }


class CartItem(db.Model):
    """
    A product a user has added to their cart but NOT yet ordered.
    Think of it as "items in your basket before checkout."
    """
    __tablename__ = 'cart_items'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'),    nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity   = db.Column(db.Integer, default=1)
    added_at   = db.Column(db.DateTime, default=datetime.utcnow)

    # Unique constraint: a user can only have ONE cart row per product
    # Quantity goes up instead of creating duplicate rows
    __table_args__ = (
        db.UniqueConstraint('user_id', 'product_id', name='uq_user_product_cart'),
    )

    product = db.relationship('Product')

    def to_dict(self) -> dict:
        return {
            'id':        self.id,
            'product':   self.product.to_dict(),
            'quantity':  self.quantity,
            'subtotal':  float(self.product.price) * self.quantity,
            'added_at':  self.added_at.isoformat(),
        }


class Order(db.Model):
    """
    A confirmed purchase. Created when the user checks out.
    Status moves: pending → paid → processing → shipped → delivered
    """
    __tablename__ = 'orders'

    id               = db.Column(db.Integer, primary_key=True)
    user_id          = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    total_amount     = db.Column(db.Numeric(10, 2), nullable=False)
    status           = db.Column(db.String(20), default='pending')
    shipping_address = db.Column(db.Text)                         # snapshot at time of order
    notes            = db.Column(db.Text)                         # special delivery instructions
    created_at       = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at       = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship('OrderItem', backref='order', lazy=True)

    # Valid status transitions for validation
    VALID_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']

    def to_dict(self) -> dict:
        return {
            'id':               self.id,
            'total_amount':     float(self.total_amount),
            'status':           self.status,
            'shipping_address': self.shipping_address,
            'notes':            self.notes,
            'items':            [item.to_dict() for item in self.items],
            'created_at':       self.created_at.isoformat(),
        }


class OrderItem(db.Model):
    """
    Each line in an order (1x TV, 2x HDMI Cables, etc.)
    We store price_at_time because product prices can change later.
    """
    __tablename__ = 'order_items'

    id             = db.Column(db.Integer, primary_key=True)
    order_id       = db.Column(db.Integer, db.ForeignKey('orders.id'),    nullable=False)
    product_id     = db.Column(db.Integer, db.ForeignKey('products.id'),  nullable=False)
    quantity       = db.Column(db.Integer, nullable=False)
    price_at_time  = db.Column(db.Numeric(10, 2), nullable=False)  # locked-in price

    product = db.relationship('Product')

    def to_dict(self) -> dict:
        return {
            'product':        self.product.to_dict(),
            'quantity':       self.quantity,
            'price_at_time':  float(self.price_at_time),
            'subtotal':       float(self.price_at_time) * self.quantity,
        }