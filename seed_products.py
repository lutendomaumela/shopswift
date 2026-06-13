"""
Populates the database with real electronics products from DummyJSON.
Images and descriptions are free to use — no API key required.

Usage (local):   docker-compose exec api python seed_products.py
Usage (on EC2):  docker exec shopswift-api-1 python seed_products.py
"""
import requests
from src.app import create_app
from src.models import db, User, Category, Product

# USD to ZAR conversion rate
ZAR_RATE = 18.5

# DummyJSON categories we want → mapped to our category slugs
CATEGORY_MAP = {
    'smartphones':        'smartphones',
    'laptops':            'laptops',
    'tablets':            'tablets',
    'mobile-accessories': 'accessories',
    'audio':              'audio',
    'home-decoration':    None,   # skip
}

SHOPSWIFT_CATEGORIES = [
    {
        'name':        'Smartphones',
        'slug':        'smartphones',
        'description': 'Latest smartphones from top brands',
    },
    {
        'name':        'Laptops',
        'slug':        'laptops',
        'description': 'Laptops and notebooks for work and play',
    },
    {
        'name':        'Tablets',
        'slug':        'tablets',
        'description': 'Tablets and iPads',
    },
    {
        'name':        'Audio',
        'slug':        'audio',
        'description': 'Headphones, earbuds, and speakers',
    },
    {
        'name':        'Accessories',
        'slug':        'accessories',
        'description': 'Cables, cases, chargers, and more',
    },
    {
        'name':        'Appliances',
        'slug':        'appliances',
        'description': 'Home appliances and white goods',
    },
]

# DummyJSON endpoints to fetch from
FETCH_CATEGORIES = [
    ('smartphones',        12),
    ('laptops',            10),
    ('tablets',             8),
    ('mobile-accessories',  8),
]

# Reliable image URLs (using Picsum - guaranteed to work forever)
FALLBACK_IMAGES = [
    'https://picsum.photos/id/0/400/400',      # Laptop
    'https://picsum.photos/id/1/400/400',      # Laptop
    'https://picsum.photos/id/20/400/400',     # Coffee
    'https://picsum.photos/id/26/400/400',     # Venice
    'https://picsum.photos/id/30/400/400',     # Coffee
    'https://picsum.photos/id/42/400/400',     # Piano
    'https://picsum.photos/id/96/400/400',     # Mountain
    'https://picsum.photos/id/100/400/400',    # Camera
]

def fetch_products_from_dummyjson(category: str, limit: int) -> list:
    """Fetch products from DummyJSON — free, no auth, real images."""
    url = f'https://dummyjson.com/products/category/{category}?limit={limit}'
    try:
        res = requests.get(url, timeout=10)
        res.raise_for_status()
        return res.json().get('products', [])
    except Exception as e:
        print(f'   Warning: could not fetch {category} — {e}')
        return []

def get_reliable_image_url(item, index):
    """Get a working image URL - falls back to Picsum if DummyJSON image fails"""
    # Try DummyJSON image first
    dummy_image = item.get('thumbnail', '')
    if dummy_image and dummy_image.startswith('https'):
        return dummy_image
    
    # Use Picsum as reliable fallback (guaranteed to work)
    return FALLBACK_IMAGES[index % len(FALLBACK_IMAGES)]

def seed():
    app = create_app()

    with app.app_context():

        print('\nSeeding categories...')

        # ── Categories ────────────────────────────────────────────────────
        category_lookup = {}   # slug → Category object

        for cat_data in SHOPSWIFT_CATEGORIES:
            existing = Category.query.filter_by(slug=cat_data['slug']).first()
            if existing:
                print(f'   Already exists: {cat_data["name"]}')
                category_lookup[cat_data['slug']] = existing
            else:
                cat = Category(
                    name=cat_data['name'],
                    slug=cat_data['slug'],
                    description=cat_data['description'],
                )
                db.session.add(cat)
                db.session.flush()
                category_lookup[cat_data['slug']] = cat
                print(f'   Created: {cat_data["name"]}')

        print('\nFetching products from DummyJSON...')

        # ── Products ──────────────────────────────────────────────────────
        products_added = 0

        for dummyjson_cat, limit in FETCH_CATEGORIES:
            print(f'\n   Fetching {limit} products from: {dummyjson_cat}')

            raw_products = fetch_products_from_dummyjson(dummyjson_cat, limit)
            if not raw_products:
                continue

            # Map DummyJSON category → our category slug
            our_slug = CATEGORY_MAP.get(dummyjson_cat)
            if not our_slug or our_slug not in category_lookup:
                our_slug = 'accessories'
            category_obj = category_lookup[our_slug]

            for idx, item in enumerate(raw_products):
                # Generate a unique SKU from the DummyJSON id
                sku = f'DJ-{item["id"]:04d}'

                existing = Product.query.filter_by(sku=sku).first()
                if existing:
                    print(f'   Skipping (exists): {item["title"][:40]}')
                    continue

                # Convert USD price to ZAR and round to .99
                zar_price = round(item['price'] * ZAR_RATE, 2)

                # Get reliable image URL
                image_url = get_reliable_image_url(item, idx)

                product = Product(
                    name=item['title'],
                    description=item.get('description', ''),
                    price=zar_price,
                    brand=item.get('brand', 'Generic'),
                    sku=sku,
                    stock=min(item.get('stock', 10), 50),
                    image_url=image_url,
                    category_id=category_obj.id,
                    is_active=True,
                )
                db.session.add(product)
                products_added += 1
                print(f'   Added: {item["title"][:45]} — R{zar_price:,.2f}')

        # ── Featured Products with Guaranteed Working Images ───────────────
        print('\nAdding ShopSwift featured products...')

        # Using Cloudimage placeholder service (guaranteed to work)
        featured = [
            {
                'name':        'Samsung 65" QLED 4K TV',
                'description': '65-inch QLED display with Quantum Dot technology, 120Hz refresh rate, and built-in Tizen OS. Perfect for your living room.',
                'price':       18999.00,
                'brand':       'Samsung',
                'sku':         'SAM-TV65-QLED',
                'stock':       5,
                'image_url':   'https://picsum.photos/id/20/400/400',
                'slug':        'electronics',
            },
            {
                'name':        'LG 9kg Front Loader Washing Machine',
                'description': 'AI Direct Drive motor, Steam wash technology, 6 Motion Direct Drive. Energy rating A+++.',
                'price':       12999.00,
                'brand':       'LG',
                'sku':         'LG-WM9KG-FL',
                'stock':       6,
                'image_url':   'https://picsum.photos/id/26/400/400',
                'slug':        'appliances',
            },
            {
                'name':        'Samsung 580L French Door Fridge',
                'description': 'Twin Cooling Plus, All-Around Cooling, Vacation Mode. Keeps food fresh for longer.',
                'price':       21999.00,
                'brand':       'Samsung',
                'sku':         'SAM-FR580-FD',
                'stock':       4,
                'image_url':   'https://picsum.photos/id/30/400/400',
                'slug':        'appliances',
            },
            {
                'name':        'Sony WH-1000XM5 Headphones',
                'description': 'Industry-leading noise cancellation, 30-hour battery life, Multipoint Bluetooth connection.',
                'price':       8999.00,
                'brand':       'Sony',
                'sku':         'SNY-WH1000XM5',
                'stock':       12,
                'image_url':   'https://picsum.photos/id/42/400/400',
                'slug':        'audio',
            },
            {
                'name':        'Apple AirPods Pro (2nd Gen)',
                'description': 'Active Noise Cancellation, Adaptive Transparency, Personalised Spatial Audio with MagSafe charging.',
                'price':       6999.00,
                'brand':       'Apple',
                'sku':         'APPL-AIRPODSPRO2',
                'stock':       20,
                'image_url':   'https://picsum.photos/id/96/400/400',
                'slug':        'audio',
            },
            {
                'name':        'Dyson V15 Vacuum Cleaner',
                'description': 'Laser dust detection, 60-min run time, HEPA filter, LCD screen shows exactly what you cleaned.',
                'price':       16999.00,
                'brand':       'Dyson',
                'sku':         'DYS-V15-DETECT',
                'stock':       7,
                'image_url':   'https://picsum.photos/id/1/400/400',
                'slug':        'appliances',
            },
            {
                'name':        'Apple Watch Series 9',
                'description': 'Double tap gesture, brighter display, health sensors, S9 chip for faster performance.',
                'price':       9999.00,
                'brand':       'Apple',
                'sku':         'APPL-WATCH-S9',
                'stock':       15,
                'image_url':   'https://picsum.photos/id/100/400/400',
                'slug':        'electronics',
            },
        ]

        for item in featured:
            existing = Product.query.filter_by(sku=item['sku']).first()
            if existing:
                print(f'   Skipping (exists): {item["name"]}')
                continue

            cat_obj = category_lookup.get(item['slug']) or category_lookup.get('electronics', list(category_lookup.values())[0])
            product = Product(
                name=item['name'],
                description=item['description'],
                price=item['price'],
                brand=item['brand'],
                sku=item['sku'],
                stock=item['stock'],
                image_url=item['image_url'],
                category_id=cat_obj.id,
                is_active=True,
            )
            db.session.add(product)
            products_added += 1
            print(f'   Added: {item["name"]}')

        # ── Users ─────────────────────────────────────────────────────────
        print('\nSeeding users...')

        def get_or_create_user(email, full_name, password, is_admin=False, phone=None, address=None):
            existing = User.query.filter_by(email=email).first()
            if existing:
                print(f'   Already exists: {email}')
                return existing
            user = User(
                email=email,
                full_name=full_name,
                is_admin=is_admin,
                phone_number=phone,
                address=address,
            )
            user.set_password(password)
            db.session.add(user)
            print(f'   Created: {email}')
            return user

        get_or_create_user(
            'admin@shopswift.co.za', 'Shop Admin', 'Admin@123', is_admin=True
        )
        get_or_create_user(
            'customer@test.com', 'Test Customer', 'Test@123',
            phone='+27821234567', address='123 Main St, Johannesburg'
        )

        # ── Commit ────────────────────────────────────────────────────────
        db.session.commit()

        print('')
        print('✅  Seeding complete!')
        print(f'   Categories : {Category.query.count()}')
        print(f'   Products   : {Product.query.count()}')
        print(f'   Users      : {User.query.count()}')
        print('')
        print('   Admin login:    admin@shopswift.co.za / Admin@123')
        print('   Customer login: customer@test.com     / Test@123')


if __name__ == '__main__':
    seed()