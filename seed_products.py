"""
Run this once to populate your database with test data.
Usage: docker-compose exec api python seed_products.py
"""
from src.app import create_app
from src.models import db, User, Category, Product

app = create_app()

with app.app_context():

    # --- Create categories ---
    categories = {
        'electronics': Category(name='Electronics',  slug='electronics',  description='TVs, laptops, phones'),
        'appliances':  Category(name='Appliances',   slug='appliances',   description='Washing machines, fridges'),
        'gadgets':     Category(name='Gadgets',       slug='gadgets',      description='Smartwatches, accessories'),
        'audio':       Category(name='Audio',         slug='audio',        description='Headphones, speakers'),
    }
    for cat in categories.values():
        db.session.add(cat)
    db.session.flush()  # Get IDs without committing

    # --- Create products ---
    products = [
        Product(name='iPhone 15 Pro',         price=24999.00, brand='Apple',   sku='APPL-IP15P', stock=10, category_id=categories['electronics'].id),
        Product(name='Samsung 65" 4K TV',     price=18999.00, brand='Samsung', sku='SAM-TV65',   stock=5,  category_id=categories['electronics'].id),
        Product(name='MacBook Air M3',         price=29999.00, brand='Apple',   sku='APPL-MBA-M3',stock=8,  category_id=categories['electronics'].id),
        Product(name='LG Washing Machine 9kg',price=12999.00, brand='LG',      sku='LG-WM9KG',  stock=6,  category_id=categories['appliances'].id),
        Product(name='Samsung Double Door Fridge', price=21999.00, brand='Samsung', sku='SAM-FR2D', stock=4, category_id=categories['appliances'].id),
        Product(name='Apple Watch Series 9',  price=9999.00,  brand='Apple',   sku='APPL-AWS9',  stock=15, category_id=categories['gadgets'].id),
        Product(name='Dyson Vacuum V15',      price=16999.00, brand='Dyson',   sku='DYS-V15',    stock=7,  category_id=categories['appliances'].id),
        Product(name='Sony WH-1000XM5',       price=8999.00,  brand='Sony',    sku='SNY-WH5',    stock=12, category_id=categories['audio'].id),
    ]
    for p in products:
        db.session.add(p)

    # --- Create admin user ---
    admin = User(email='admin@shopswift.com', full_name='Shop Admin', is_admin=True)
    admin.set_password('Admin@123')
    db.session.add(admin)

    # --- Create test customer ---
    customer = User(email='customer@test.com', full_name='Test Customer',
                    phone_number='+27821234567', address='123 Main St, Johannesburg')
    customer.set_password('Test@123')
    db.session.add(customer)

    db.session.commit()
    print("✅ Database seeded!")
    print("   Admin:    admin@shopswift.com / Admin@123")
    print("   Customer: customer@test.com   / Test@123")