"""
init_db.py
===========
Membuat seluruh tabel di PostgreSQL lewat SQLAlchemy (alternatif dari
menjalankan database/schema.sql secara manual di psql).

    python scripts/init_db.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402
from database.extensions import db  # noqa: E402

# Import semua model agar terdaftar ke db.metadata sebelum create_all()
from models.judol_dataset import JudolDataset  # noqa: F401,E402
from models.safe_dataset import SafeDataset  # noqa: F401,E402
from models.wordlist import Wordlist  # noqa: F401,E402
from models.admin_user import AdminUser  # noqa: F401,E402
from models.scan_log import ScanLog  # noqa: F401,E402
from models.review import Review  # noqa: F401,E402
from models.audit_log import AuditLog  # noqa: F401,E402
from models.retrain_job import RetrainJob  # noqa: F401,E402

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
        print("Semua tabel berhasil dibuat di PostgreSQL:")
        for table in db.metadata.tables:
            print(f"  - {table}")
