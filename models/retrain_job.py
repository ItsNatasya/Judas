from datetime import datetime, timezone
from database.extensions import db


class RetrainJob(db.Model):
    """Melacak job retraining async -- API Contract Bab 4.4.6.
    Memastikan hanya satu job yang 'running'/'queued' pada satu waktu (responseCode 20)."""
    __tablename__ = "retrain_jobs"

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(20), default="queued")  # queued|running|done|failed
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    finished_at = db.Column(db.DateTime(timezone=True), nullable=True)
