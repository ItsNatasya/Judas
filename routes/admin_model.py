import subprocess
import sys
import threading
from datetime import datetime, timezone

from flask import Blueprint, current_app

from database.extensions import db
from models.retrain_job import RetrainJob
from models.audit_log import AuditLog
from services import ml_service
from utils.auth_helpers import admin_required
from utils.response import ok, accepted, not_found, retrain_conflict

admin_model_bp = Blueprint("admin_model", __name__)


def _run_retrain_job(app, job_id: str):
    """Dijalankan di background thread agar endpoint langsung 202 Accepted."""
    with app.app_context():
        job = RetrainJob.query.filter_by(job_id=job_id).first()
        job.status = "running"
        db.session.commit()
        try:
            subprocess.run([sys.executable, "train_model.py"], cwd=app.root_path, check=True)
            ml_service.load_model()  # reload model baru ke memori
            job.status = "done"
        except Exception:
            job.status = "failed"
        job.finished_at = datetime.now(timezone.utc)
        db.session.commit()


@admin_model_bp.post("/admin/model/retrain")
@admin_required
def trigger_retrain():
    """
    Trigger Retrain Model
    ---
    tags: [Admin Panel]
    security: [{Bearer: []}]
    responses:
      202:
        description: Retraining berhasil dijadwalkan
      409:
        description: Retraining sedang berjalan
    """
    running = RetrainJob.query.filter(RetrainJob.status.in_(["queued", "running"])).first()
    if running:
        return retrain_conflict(
            detail=f"Job {running.job_id} masih dalam antrean. Tunggu hingga selesai sebelum memulai yang baru."
        )

    job_id = f"retrain-{datetime.now(timezone.utc).strftime('%Y-%m-%d')}-{RetrainJob.query.count() + 1:03d}"
    job = RetrainJob(job_id=job_id, status="queued")
    db.session.add(job)
    db.session.add(AuditLog(action="TRIGGER_RETRAIN", detail=job_id))
    db.session.commit()

    app = current_app._get_current_object()
    threading.Thread(target=_run_retrain_job, args=(app, job_id), daemon=True).start()

    return accepted({
        "jobId": job_id, "status": "queued", "estimatedTime": "~3 menit",
    }, "Proses retraining model telah dimulai.")


@admin_model_bp.get("/admin/model/metrics")
@admin_required
def model_metrics():
    """
    Get Model Metrics
    ---
    tags: [Admin Panel]
    security: [{Bearer: []}]
    responses:
      200:
        description: Metrik evaluasi model Random Forest terkini
    """
    metrics = ml_service.get_metrics()
    if not metrics:
        return not_found(detail="Metrik belum tersedia. Model belum pernah dilatih.")
    return ok(metrics, "Metrik model berhasil diambil.")
