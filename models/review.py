from datetime import datetime, timezone
from database.extensions import db


class Review(db.Model):
    """Ulasan pengguna publik -- API Contract Bab 4.5."""
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(100))
    rating = db.Column(db.Integer, nullable=False)   # 1-5
    review = db.Column(db.String(500), nullable=False)
    status = db.Column(db.String(20), default="Menunggu")  # Menunggu|Disetujui
    submitted_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    approved_at = db.Column(db.DateTime(timezone=True), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "rating": self.rating,
            "review": self.review,
            "status": self.status,
            "submittedAt": self.submitted_at.strftime("%Y-%m-%dT%H:%M:%SZ") if self.submitted_at else None,
            "approvedAt": self.approved_at.strftime("%Y-%m-%dT%H:%M:%SZ") if self.approved_at else None,
        }
