# Shopswift

A modern **e-commerce API** for electronics and appliances built with Flask, PostgreSQL, Docker, and industry best practices. Shopswift provides a robust backend for managing products, user authentication, shopping carts, and orders with enterprise-grade DevOps tooling.

## 🚀 Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Product Catalog**: Manage electronics and appliances with categories, pricing, and inventory
- **Shopping Cart**: Add/remove items and manage quantities before checkout
- **Order Management**: Track orders through multiple status stages (pending → paid → processing → shipped → delivered)
- **Admin Capabilities**: Designated admin users can create and manage products
- **Category System**: Organize products into categories for easy navigation
- **Health Checks**: Docker-integrated health monitoring for production readiness
- **RESTful API**: Clean, standardized API endpoints with JSON responses
- **Database Migrations**: Flask-Migrate for version-controlled schema changes
- **Comprehensive Testing**: Pytest suite with unit and integration tests
- **Production Ready**: Gunicorn WSGI server, Docker containerization, and health endpoints

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Flask 2.3.3 |
| Database | PostgreSQL 15 |
| Authentication | Flask-JWT-Extended |
| ORM | SQLAlchemy |
| WSGI Server | Gunicorn |
| Containerization | Docker & Docker Compose |
| Testing | Pytest, Pytest-Flask |
| Code Quality | Flake8 |

## 📋 Prerequisites

- Docker & Docker Compose (recommended)
- Python 3.11+ (for local development)
- PostgreSQL 15+ (if running without Docker)

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/lutendomaumela/shopswift.git
   cd shopswift
