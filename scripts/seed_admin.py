"""
seed_admin.py
==============
Membuat akun admin pertama (username/password dari .env: ADMIN_USERNAME,
ADMIN_PASSWORD). Jalankan sekali setelah tabel dibuat.

    python scripts/seed_admin.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402
from database.extensions import db  # noqa: E402
from models.admin_user import AdminUser  # noqa: E402

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        username = app.config["ADMIN_USERNAME"]
        password = app.config["ADMIN_PASSWORD"]

        if AdminUser.query.filter_by(username=username).first():
            print(f"Admin '{username}' sudah ada. Tidak ada perubahan.")
        else:
            admin = AdminUser(username=username, role="admin")
            admin.set_password(password)
            db.session.add(admin)
            db.session.commit()
            print(f"Admin '{username}' berhasil dibuat. Silakan login lewat POST /api/v1/auth/login.")
