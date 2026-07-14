import os

from flask import Flask
from flasgger import Swagger

from config import Config
from database.extensions import db, jwt, cors, limiter, SWAGGER_CONFIG, SWAGGER_TEMPLATE
from utils.response import unauthorized_token, rate_limited


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
    limiter.init_app(app)
    Swagger(app, config=SWAGGER_CONFIG, template=SWAGGER_TEMPLATE)

    # --- Register blueprints (semua endpoint pakai prefix /api/v1) ---
    from routes.auth import auth_bp
    from routes.scan import scan_bp
    from routes.url_utils import url_bp
    from routes.admin_dashboard import admin_dashboard_bp
    from routes.admin_dataset import admin_dataset_bp
    from routes.admin_model import admin_model_bp
    from routes.reviews import reviews_bp
    from routes.lexical import lexical_bp
    from routes.admin_wordlist import admin_wordlist_bp

    for bp in (auth_bp, scan_bp, url_bp, admin_dashboard_bp, admin_dataset_bp,
               admin_model_bp, reviews_bp, lexical_bp, admin_wordlist_bp):
        app.register_blueprint(bp, url_prefix="/api/v1")

    # --- Error handlers standar (JWT & rate limit) ---
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return unauthorized_token(detail="Token telah kedaluwarsa. Silakan login kembali.")

    @jwt.invalid_token_loader
    def invalid_token_callback(reason):
        return unauthorized_token(detail="Token tidak valid.")

    @jwt.unauthorized_loader
    def missing_token_callback(reason):
        return unauthorized_token(detail="Header Authorization: Bearer <access_token> wajib disertakan.")

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return rate_limited(detail="Rate limit terlampaui -- coba lagi dalam beberapa saat.")

    # Muat model ML sekali di awal (jika sudah ada hasil training)
    with app.app_context():
        from services import ml_service
        ml_service.load_model()

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=app.config["DEBUG"])
