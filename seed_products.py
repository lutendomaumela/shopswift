"""
Populates the database with sample data.
Safe to run multiple times — skips anything that already exists.
Usage: docker-compose exec api python seed_products.py
"""
from src.app import create_app
from src.models import db, User, Category, Product


def seed():
    app = create_app()

    with app.app_context():

        # ── Categories ────────────────────────────────────────────────────
        # get_or_create pattern: only insert if the slug doesn't exist yet
        # This makes the script safe to run multiple times
        def get_or_create_category(name, slug, description):
            existing = Category.query.filter_by(slug=slug).first()
            if existing:
                print(f"   Category already exists: {name}")
                return existing
            cat = Category(name=name, slug=slug, description=description)
            db.session.add(cat)
            db.session.flush()  # Get the ID before committing
            print(f"   Created category: {name}")
            return cat

        electronics = get_or_create_category(
            'Electronics', 'electronics', 'TVs, laptops, phones'
        )
        appliances = get_or_create_category(
            'Appliances', 'appliances', 'Washing machines, fridges'
        )
        gadgets = get_or_create_category(
            'Gadgets', 'gadgets', 'Smartwatches, accessories'
        )
        audio = get_or_create_category(
            'Audio', 'audio', 'Headphones, speakers'
        )

        # ── Products ──────────────────────────────────────────────────────
        # Check by SKU — unique identifier for each product
        def get_or_create_product(name, price, brand, sku, stock, category):
            existing = Product.query.filter_by(sku=sku).first()
            if existing:
                print(f"   Product already exists: {name}")
                return existing
            product = Product(
                name=name,
                price=price,
                brand=brand,
                sku=sku,
                stock=stock,
                category_id=category.id
            )
            db.session.add(product)
            print(f"   Created product: {name}")
            return product

        get_or_create_product(
            'iPhone 15 Pro', 24999.00, 'Apple', 'APPL-IP15P', 10, electronics
        )
        get_or_create_product(
            'Samsung 65" 4K TV', 18999.00, 'Samsung', 'SAM-TV65', 5, electronics
        )
        get_or_create_product(
            'MacBook Air M3', 29999.00, 'Apple', 'APPL-MBA-M3', 8, electronics
        )
        get_or_create_product(
            'LG Washing Machine 9kg', 12999.00, 'LG', 'LG-WM9KG', 6, appliances
        )
        get_or_create_product(
            'Samsung Double Door Fridge', 21999.00, 'Samsung', 'SAM-FR2D', 4, appliances
        )
        get_or_create_product(
            'Apple Watch Series 9', 9999.00, 'Apple', 'APPL-AWS9', 15, gadgets
        )
        get_or_create_product(
            'Dyson Vacuum V15', 16999.00, 'Dyson', 'DYS-V15', 7, appliances
        )
        get_or_create_product(
            'Sony WH-1000XM5', 8999.00, 'Sony', 'SNY-WH5', 12, audio
        )

        # ── Users ─────────────────────────────────────────────────────────
        # Check by email — never create duplicate accounts
        def get_or_create_user(email, full_name, password,
                               is_admin=False, phone=None, address=None):
            existing = User.query.filter_by(email=email).first()
            if existing:
                print(f"   User already exists: {email}")
                return existing
            user = User(
                email=email,
                full_name=full_name,
                is_admin=is_admin,
                phone_number=phone,
                address=address
            )
            user.set_password(password)
            db.session.add(user)
            print(f"   Created user: {email}")
            return user

        get_or_create_user(
            'admin@shopswift.com', 'Shop Admin', 'Admin@123', is_admin=True
        )
        get_or_create_user(
            'customer@test.com', 'Test Customer', 'Test@123',
            phone='+27821234567', address='123 Main St, Johannesburg'
        )

        # ── Commit everything at once ──────────────────────────────────────
        # All inserts above are queued — this single commit saves them all.
        # If anything fails, nothing is saved (atomic transaction).
        db.session.commit()

        print("")
        print("✅ Database seeded successfully!")
        print("   Admin:    admin@shopswift.com / Admin@123")
        print("   Customer: customer@test.com   / Test@123")
        print(f"   Products: {Product.query.count()} in database")
        print(f"   Categories: {Category.query.count()} in database")


if __name__ == '__main__':
    seed()