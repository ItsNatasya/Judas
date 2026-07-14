from datetime import datetime, timezone

from flask import Blueprint, request

from database.extensions import db, limiter
from models.review import Review
from utils.auth_helpers import admin_required
from utils.response import ok, created, bad_request, invalid_format, not_found

reviews_bp = Blueprint("reviews", __name__)


@reviews_bp.post("/reviews")
@limiter.limit("10/minute")
def submit_review():
    """
    Submit Ulasan (Publik)
    ---
    tags: [Reviews]
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required: [name, rating, review]
          properties:
            name: {type: string}
            role: {type: string}
            rating: {type: integer}
            review: {type: string}
    responses:
      201:
        description: Ulasan diterima, status Menunggu
    """
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    rating = body.get("rating")
    review_text = (body.get("review") or "").strip()

    if not name or rating is None or not review_text:
        return bad_request(detail='Field "name", "rating", dan "review" wajib diisi.')
    if not isinstance(rating, int) or not (1 <= rating <= 5):
        return invalid_format(detail="Rating harus berupa integer 1-5.")

    entry = Review(name=name, role=body.get("role"), rating=rating, review=review_text)
    db.session.add(entry)
    db.session.commit()

    return created({"reviewId": entry.id, "status": "Menunggu"},
                   "Ulasan berhasil dikirim. Akan ditampilkan setelah disetujui admin.")


@reviews_bp.get("/reviews")
def get_approved_reviews():
    """
    Get Approved Reviews (Publik)
    ---
    tags: [Reviews]
    parameters:
      - in: query
        name: page
        type: integer
      - in: query
        name: limit
        type: integer
    responses:
      200:
        description: Daftar ulasan yang telah disetujui
    """
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 10, type=int)

    query = Review.query.filter_by(status="Disetujui").order_by(Review.approved_at.desc())
    pagination = query.paginate(page=page, per_page=limit, error_out=False)
    if not pagination.items:
        return not_found(detail="Belum ada ulasan yang disetujui.")

    all_approved = Review.query.filter_by(status="Disetujui").all()
    avg_rating = round(sum(r.rating for r in all_approved) / len(all_approved), 1) if all_approved else 0

    from flask import jsonify
    from utils.response import envelope
    body = envelope("00", "Data ulasan berhasil diambil.", data=[r.to_dict() for r in pagination.items])
    body["summary"] = {"totalReviews": len(all_approved), "averageRating": avg_rating}
    body["pagination"] = {
        "page": page, "limit": limit, "total": pagination.total,
        "totalPages": pagination.pages,
        "nextPage": page + 1 if pagination.has_next else None,
        "prevPage": page - 1 if pagination.has_prev else None,
    }
    return jsonify(body), 200


@reviews_bp.get("/admin/reviews")
@admin_required
def get_pending_reviews():
    """
    Get Pending Reviews (Admin)
    ---
    tags: [Reviews]
    security: [{Bearer: []}]
    parameters:
      - in: query
        name: status
        type: string
        description: >
          Opsional. Default hanya mengembalikan ulasan "Menunggu" sesuai
          API Contract v3.6. Kirim status=all untuk mengambil SEMUA ulasan
          (Menunggu + Disetujui) -- dipakai tab "Semua" di Admin Dashboard.
          Kirim status=Disetujui untuk hanya ulasan yang sudah disetujui.
    responses:
      200:
        description: Daftar ulasan (default hanya yang menunggu moderasi)
    """
    status_filter = request.args.get("status")

    query = Review.query
    if status_filter and status_filter.lower() != "all":
        query = query.filter_by(status=status_filter)
    elif not status_filter:
        query = query.filter_by(status="Menunggu")
    # status=all -> tidak difilter sama sekali

    rows = query.order_by(Review.submitted_at.desc()).all()
    if not rows:
        return not_found(detail="Tidak ada ulasan yang sesuai.")
    return ok([r.to_dict() for r in rows], "Daftar ulasan berhasil diambil.")


@reviews_bp.put("/admin/reviews/<int:review_id>/approve")
@admin_required
def approve_review(review_id):
    """
    Setujui Ulasan (Admin)
    ---
    tags: [Reviews]
    security: [{Bearer: []}]
    responses:
      200:
        description: Ulasan disetujui dan tampil publik
    """
    entry = Review.query.get(review_id)
    if not entry:
        return not_found(detail="Ulasan tidak ditemukan.")
    entry.status = "Disetujui"
    entry.approved_at = datetime.now(timezone.utc)
    db.session.commit()
    return ok(entry.to_dict(), "Ulasan berhasil disetujui.")


@reviews_bp.delete("/admin/reviews/<int:review_id>")
@admin_required
def delete_review(review_id):
    """
    Hapus Ulasan (Admin)
    ---
    tags: [Reviews]
    security: [{Bearer: []}]
    responses:
      200:
        description: Ulasan dihapus
    """
    entry = Review.query.get(review_id)
    if not entry:
        return not_found(detail="Ulasan tidak ditemukan.")
    db.session.delete(entry)
    db.session.commit()
    return ok(None, "Ulasan dihapus")
