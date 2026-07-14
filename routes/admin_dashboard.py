from flask import Blueprint

from database.extensions import db
from models.judol_dataset import JudolDataset
from models.review import Review
from utils.auth_helpers import admin_required
from utils.response import ok

admin_dashboard_bp = Blueprint("admin_dashboard", __name__)


@admin_dashboard_bp.get("/admin/dashboard")
@admin_required
def dashboard():
    """
    Get Dashboard Statistics
    ---
    tags: [Admin Panel]
    security: [{Bearer: []}]
    responses:
      200:
        description: Ringkasan statistik sistem
    """
    total_url = JudolDataset.query.count()
    active_url = JudolDataset.query.filter_by(status="Aktif").count()
    high_risk = JudolDataset.query.filter_by(risk="Tinggi").count()
    pending_reviews = Review.query.filter_by(status="Menunggu").count()

    categories = db.session.query(
        JudolDataset.category, db.func.count(JudolDataset.id)
    ).group_by(JudolDataset.category).all()
    category_distribution = {cat: count for cat, count in categories}

    recent = JudolDataset.query.order_by(JudolDataset.added_at.desc()).limit(5).all()
    recent_entries = [
        {"id": r.id, "url": r.url, "category": r.category, "addedAt": r.to_dict()["addedAt"]}
        for r in recent
    ]

    return ok({
        "totalUrl": total_url,
        "activeUrl": active_url,
        "highRisk": high_risk,
        "pendingReviews": pending_reviews,
        "categoryDistribution": category_distribution,
        "recentEntries": recent_entries,
    }, "Data dashboard berhasil diambil.")
