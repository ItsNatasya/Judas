from datetime import datetime, timezone
from database.extensions import db


class SafeDataset(db.Model):
    """Tabel KHUSUS domain aman/legitimate (TIDAK digabung dengan judol_dataset).
    Dipakai sebagai contoh negatif (label=0) saat training Random Forest."""
    __tablename__ = "safe_dataset"

    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(2048), nullable=False, unique=True, index=True)
    category = db.Column(db.String(50), nullable=False, default="Aman")
    risk = db.Column(db.String(20), nullable=False, default="Rendah")
    status = db.Column(db.String(20), nullable=False, default="Aktif")
    notes = db.Column(db.String(500))
    added_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "url": self.url,
            "category": self.category,
            "risk": self.risk,
            "status": self.status,
            "addedAt": self.added_at.strftime("%Y-%m-%dT%H:%M:%SZ") if self.added_at else None,
        }
