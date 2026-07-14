from datetime import datetime, timezone

from flask import Blueprint, request

from database.extensions import db
from models.judol_dataset import JudolDataset
from models.audit_log import AuditLog
from utils.auth_helpers import admin_required
from utils.ssrf_protection import is_url_format_valid
from utils.response import ok, created, bad_request, invalid_format, conflict, not_found

admin_dataset_bp = Blueprint("admin_dataset", __name__)

VALID_CATEGORIES = {"Slot", "Togel", "Casino", "Poker", "Sbobet", "Sportbook", "Lainnya"}
VALID_RISKS = {"Tinggi", "Sedang", "Rendah"}
VALID_STATUSES = {"Aktif", "Nonaktif", "Dilaporkan"}


@admin_dataset_bp.get("/admin/dataset")
@admin_required
def get_dataset():
    """
    Get Dataset URL
    ---
    tags: [Admin Panel]
    security: [{Bearer: []}]
    parameters:
      - in: query
        name: page
        type: integer
      - in: query
        name: limit
        type: integer
      - in: query
        name: search
        type: string
      - in: query
        name: category
        type: string
      - in: query
        name: risk
        type: string
      - in: query
        name: status
        type: string
    responses:
      200:
        description: Daftar URL dalam dataset judol_dataset
    """
    page = request.args.get("page", 1, type=int)
    limit = min(request.args.get("limit", 10, type=int), 100)
    search = request.args.get("search")
    category = request.args.get("category")
    risk = request.args.get("risk")
    status = request.args.get("status")
    sort_order = request.args.get("sortOrder", "desc")

    query = JudolDataset.query
    if search:
        query = query.filter(JudolDataset.url.ilike(f"%{search}%"))
    if category:
        query = query.filter_by(category=category)
    if risk:
        query = query.filter_by(risk=risk)
    if status:
        query = query.filter_by(status=status)

    query = query.order_by(
        JudolDataset.added_at.asc() if sort_order == "asc" else JudolDataset.added_at.desc()
    )

    pagination = query.paginate(page=page, per_page=limit, error_out=False)
    if not pagination.items:
        return not_found(detail="Tidak ada data yang sesuai dengan filter yang diberikan.")

    return ok([r.to_dict() for r in pagination.items], "Dataset berhasil diambil.")


@admin_dataset_bp.post("/admin/dataset")
@admin_required
def add_dataset():
    """
    Add URL to Dataset
    ---
    tags: [Admin Panel]
    security: [{Bearer: []}]
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required: [url, category, risk, status]
          properties:
            url: {type: string}
            category: {type: string}
            risk: {type: string}
            status: {type: string}
            reportedBy: {type: string}
            notes: {type: string}
    responses:
      201:
        description: URL berhasil ditambahkan ke dataset
    """
    body = request.get_json(silent=True) or {}
    url = (body.get("url") or "").strip()
    category = body.get("category")
    risk = body.get("risk")
    status = body.get("status")

    if not url or not category or not risk or not status:
        return bad_request(detail="Field url, category, risk, dan status wajib diisi.")
    if not is_url_format_valid(url):
        return invalid_format(detail="URL harus dimulai dengan http:// atau https://")

    if JudolDataset.query.filter_by(url=url).first():
        existing = JudolDataset.query.filter_by(url=url).first()
        return conflict(detail=f"URL {url} sudah terdaftar dalam dataset dengan ID {existing.id}.")

    entry = JudolDataset(
        url=url, category=category, risk=risk, status=status,
        reported_by=body.get("reportedBy"), notes=body.get("notes"),
    )
    db.session.add(entry)
    db.session.add(AuditLog(action="ADD_DATASET", detail=f"Menambahkan {url}", ip_address=request.remote_addr))
    db.session.commit()

    return created({
        "id": entry.id, "url": entry.url,
        "addedAt": entry.added_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }, "URL berhasil ditambahkan ke dataset.")


@admin_dataset_bp.patch("/admin/dataset/<int:entry_id>")
@admin_required
def update_dataset(entry_id):
    """
    Update URL in Dataset
    ---
    tags: [Admin Panel]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: entry_id
        type: integer
        required: true
      - in: body
        name: body
        schema:
          type: object
          properties:
            category: {type: string}
            risk: {type: string}
            status: {type: string}
            notes: {type: string}
    responses:
      200:
        description: Data URL berhasil diperbarui
    """
    entry = JudolDataset.query.get(entry_id)
    if not entry:
        return not_found(detail=f"Entri dataset dengan ID {entry_id} tidak ditemukan.")

    body = request.get_json(silent=True) or {}
    for field in ("category", "risk", "status", "notes"):
        if field in body:
            setattr(entry, field, body[field])
    entry.updated_at = datetime.now(timezone.utc)

    db.session.add(AuditLog(action="UPDATE_DATASET", detail=f"ID {entry_id}", ip_address=request.remote_addr))
    db.session.commit()

    data = entry.to_dict()
    data["updatedAt"] = entry.updated_at.strftime("%Y-%m-%dT%H:%M:%SZ")
    return ok(data, "Data URL berhasil diperbarui.")


@admin_dataset_bp.delete("/admin/dataset/<int:entry_id>")
@admin_required
def delete_dataset(entry_id):
    """
    Delete URL from Dataset
    ---
    tags: [Admin Panel]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: entry_id
        type: integer
        required: true
    responses:
      200:
        description: URL berhasil dihapus dari dataset
    """
    entry = JudolDataset.query.get(entry_id)
    if not entry:
        return not_found(detail=f"Entri dataset dengan ID {entry_id} tidak ditemukan.")

    db.session.delete(entry)
    db.session.add(AuditLog(action="DELETE_DATASET", detail=f"ID {entry_id}", ip_address=request.remote_addr))
    db.session.commit()

    return ok({"deletedId": entry_id}, "URL berhasil dihapus dari dataset.")
