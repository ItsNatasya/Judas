from datetime import datetime, timezone
from database.extensions import db


class Wordlist(db.Model):
    """Tabel KHUSUS kata kunci judol untuk Lexical Analysis.
    Sesuai API Contract Bab 4.7 (/admin/wordlist). TIDAK digabung dengan
    judol_dataset maupun safe_dataset -- ini adalah tabel kata kunci, bukan domain.

    Kolom `description` ditambahkan (di luar API Contract v3.6 asli) supaya
    cocok dengan field WordEntry.description di frontend React yang sudah ada."""
    __tablename__ = "wordlist"

    id = db.Column(db.Integer, primary_key=True)
    keyword = db.Column(db.String(100), nullable=False, unique=True, index=True)
    category = db.Column(db.String(30), nullable=False)
    # Slot|Togel|Casino|Poker|Sbobet|Sportbook|Umum|Slang|Operasional
    description = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    added_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    added_by = db.Column(db.String(100), default="system")

    def to_dict(self):
        return {
            "id": self.id,
            "keyword": self.keyword,
            "category": self.category,
            "description": self.description or "",
            "isActive": self.is_active,
            "addedAt": self.added_at.strftime("%Y-%m-%dT%H:%M:%SZ") if self.added_at else None,
            "addedBy": self.added_by,
        }
