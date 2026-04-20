import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()  # Reads your .env file into environment variables

class Config:
    # Database
    SQLALCHEMY_DATABASE_URI    = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/shopswift')
    SQLALCHEMY_TRACK_MODIFICATIONS = False  # Reduces memory usage; we don't need this feature

    # JWT (JSON Web Tokens for authentication)
    JWT_SECRET_KEY             = os.getenv('JWT_SECRET_KEY', 'CHANGE-ME-IN-PRODUCTION')
    JWT_ACCESS_TOKEN_EXPIRES   = timedelta(hours=24)  # Token stays valid 24 hours

    # Flask
    SECRET_KEY                 = os.getenv('SECRET_KEY', 'CHANGE-ME-IN-PRODUCTION')


class DevelopmentConfig(Config):
    DEBUG = True          # Auto-reloads on code changes, shows detailed error pages
    TESTING = False


class ProductionConfig(Config):
    DEBUG   = False       # NEVER enable debug mode in production (exposes internals)
    TESTING = False