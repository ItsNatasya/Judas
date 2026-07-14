from datetime import datetime, timezone
from database.extensions import db


class JudolDataset(db.Model):
    """Tabel KHUSUS domain judi online (TIDAK digabung dengan safe_dataset).
    Sesuai API Contract Bab 4.4.2-4.4.5 (/admin/dataset)."""
    __tablename__ = "judol_dataset"

    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(2048), nullable=False, unique=True, index=True)
    category = db.Column(db.String(50), nullable=False)   # Slot|Togel|Casino|Poker|Sbobet|Sportbook|Lainnya
    risk = db.Column(db.String(20), nullable=False)        # Tinggi|Sedang|Rendah
    status = db.Column(db.String(20), nullable=False, default="Aktif")  # Aktif|Nonaktif|Dilaporkan
    scan_count = db.Column(db.Integer, default=0)
    reported_by = db.Column(db.String(100))
    notes = db.Column(db.String(500))
    added_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "url": self.url,
            "category": self.category,
            "risk": self.risk,
            "status": self.status,
            "scanCount": self.scan_count or 0,
            "addedAt": self.added_at.strftime("%Y-%m-%dT%H:%M:%SZ") if self.added_at else None,
        }
