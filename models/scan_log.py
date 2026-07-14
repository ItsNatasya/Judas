from datetime import datetime, timezone
from database.extensions import db


class ScanLog(db.Model):
    """Riwayat setiap eksekusi /scan/url -- API Contract Bab 4.2.2 & 4.2.3."""
    __tablename__ = "scan_log"

    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(2048), nullable=False, index=True)
    label = db.Column(db.String(20), nullable=False)          # Judol|Aman
    confidence = db.Column(db.Float, nullable=False)          # = rfScore
    rf_score = db.Column(db.Float, nullable=False)
    whois_age = db.Column(db.Integer, nullable=True)
    crawl_status = db.Column(db.String(30))
    features_used = db.Column(db.JSON)
    from_cache = db.Column(db.Boolean, default=False)
    admin_id = db.Column(db.Integer, db.ForeignKey("admin_user.id"), nullable=True)
    scanned_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self, detailed=False):
        base = {
            "id": self.id,
            "url": self.url,
            "label": self.label,
            "confidence": self.confidence,
            "scannedAt": self.scanned_at.strftime("%Y-%m-%dT%H:%M:%SZ") if self.scanned_at else None,
        }
        if detailed:
            base.update({
                "rfScore": self.rf_score,
                "whoisAge": self.whois_age,
                "crawlStatus": self.crawl_status,
                "featuresUsed": self.features_used,
            })
        return base
