from datetime import datetime, timezone
from database.extensions import db


class AuditLog(db.Model):
    """Mencatat setiap aksi admin (login, tambah/edit/hapus dataset, retrain, dll)."""
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    admin_username = db.Column(db.String(100))
    action = db.Column(db.String(100), nullable=False)   # LOGIN|LOGOUT|ADD_DATASET|UPDATE_DATASET|...
    detail = db.Column(db.String(500))
    ip_address = db.Column(db.String(64))
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
