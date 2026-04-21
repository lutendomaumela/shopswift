import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


def _require(var_name: str) -> str:
    """
    Read an environment variable and crash immediately if it is missing.
    Why crash? Because a missing secret key or database URL means the app
    is misconfigured. It is safer to refuse to start than to run broken.
    A loud crash at boot is always better than a silent failure mid-request.
    """
    value = os.getenv(var_name)
    if not value:
        raise EnvironmentError(
            f"Required environment variable '{var_name}' is not set. "
            f"Check your .env file or deployment environment."
        )
    return value


class Config:
    # ── Database ──────────────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI        = _require('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS      = {
        'pool_pre_ping': True,   # Test connections before using them
                                 # Prevents "server closed connection" errors
        'pool_recycle':  300,    # Recycle connections every 5 minutes
                                 # Prevents stale connection timeouts
    }

    # ── JWT ───────────────────────────────────────────────────────────────
    JWT_SECRET_KEY           = _require('JWT_SECRET_KEY')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    # ── Flask ─────────────────────────────────────────────────────────────
    SECRET_KEY = _require('SECRET_KEY')


class DevelopmentConfig(Config):
    DEBUG   = True
    TESTING = False


class ProductionConfig(Config):
    DEBUG   = False
    TESTING = False
    # Shorter token expiry in production — less exposure if a token leaks
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)


class TestingConfig(Config):
    DEBUG   = False
    TESTING = True
    # Tests override DATABASE_URL via os.environ in conftest.py
    # so _require() still works — conftest sets the var before
    # this class is ever instantiated
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)
    SQLALCHEMY_ENGINE_OPTIONS = {
        'poolclass': __import__(
            'sqlalchemy.pool', fromlist=['NullPool']
        ).NullPool
        # NullPool = no connection pooling in tests
        # Every query opens and closes its own connection
        # This is exactly what prevents the session lock
        # issues we fixed in our test suite
    }