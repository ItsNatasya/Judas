import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


class Config:
    # --- Flask ---
    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-key")
    DEBUG = os.getenv("FLASK_DEBUG", "true").lower() == "true"

    # --- PostgreSQL ---
    # contoh: postgresql://judas_user:judas_pass@localhost:5432/judas_db
    SQLALCHEMY_DATABASE_URI = "postgresql://postgres.thxurhzklmftzjjockdq:kbf1deOJ78IiMPCK@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    # --- JWT ---
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)     # sesuai API Contract 1.3
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

    # --- Admin default (untuk seed) ---
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "P@ssw0rd!")

    # --- Rate limit (API Contract 2.1: 429 max 30 req/menit) ---
    RATELIMIT_DEFAULT = "200/hour"
    RATELIMIT_STORAGE_URI = os.getenv("REDIS_URL", "memory://")

    # --- Model ML ---
    MODEL_PATH = os.getenv("MODEL_PATH", "ml_model/random_forest_model.joblib")
    METRICS_PATH = os.getenv("METRICS_PATH", "ml_model/model_metrics.json")
    CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))  # API Contract 1.4

    # --- Crawler / WHOIS ---
    CRAWL_TIMEOUT = int(os.getenv("CRAWL_TIMEOUT", "8"))
    WHOIS_TIMEOUT = int(os.getenv("WHOIS_TIMEOUT", "6"))

    # --- CORS (frontend Vite dev server) ---
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
