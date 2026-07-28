from datetime import datetime, timezone

from flask import Blueprint, request

from database.extensions import db
from models.wordlist import Wordlist
from utils.auth_helpers import admin_required
from utils.response import ok, created, bad_request, conflict, not_found

admin_wordlist_bp = Blueprint("admin_wordlist", __name__)

VALID_CATEGORIES = {"Slot", "Togel", "Casino", "Poker", "Sportbook", "Umum", "Slang", "Operasional"}


@admin_wordlist_bp.get("/admin/wordlist")
@admin_required
def get_wordlist():
    """
    Get Daftar Kata Kunci
    ---
    tags: [Admin Wordlist]
    security: [{Bearer: []}]
    parameters:
      - in: query
        name: page
        type: integer
      - in: query
        name: limit
        type: integer
      - in: query
        name: category
        type: string
      - in: query
        name: search
        type: string
    responses:
      200:
        description: Daftar kata kunci judol (tabel wordlist, terpisah dari dataset domain)
    """
    page = request.args.get("page", 1, type=int)
    limit = min(request.args.get("limit", 50, type=int), 200)
    category = request.args.get("category")
    search = request.args.get("search")

    query = Wordlist.query
    if category:
        query = query.filter_by(category=category)
    if search:
        query = query.filter(Wordlist.keyword.ilike(f"%{search}%"))

    pagination = query.order_by(Wordlist.id.asc()).paginate(page=page, per_page=limit, error_out=False)

    from flask import jsonify
    from utils.response import envelope
    body = envelope("00", "Daftar kata kunci berhasil diambil.", data=[r.to_dict() for r in pagination.items])
    body["pagination"] = {
        "total": pagination.total, "page": page, "limit": limit, "totalPages": pagination.pages,
    }
    return jsonify(body), 200


@admin_wordlist_bp.post("/admin/wordlist")
@admin_required
def add_keyword():
    """
    Tambah Kata Kunci
    ---
    tags: [Admin Wordlist]
    security: [{Bearer: []}]
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required: [keyword, category]
          properties:
            keyword: {type: string}
            category: {type: string}
    responses:
      201:
        description: Kata kunci ditambahkan
    """
    body = request.get_json(silent=True) or {}
    keyword = (body.get("keyword") or "").strip().lower()
    category = body.get("category")

    if not keyword or not category:
        return bad_request(detail="Field keyword dan category wajib diisi.")

    if Wordlist.query.filter_by(keyword=keyword).first():
        return conflict(detail=f"Kata kunci '{keyword}' sudah ada dalam wordlist.")

    from flask_jwt_extended import get_jwt_identity
    entry = Wordlist(
        keyword=keyword, category=category, description=body.get("description"),
        added_by=get_jwt_identity() or "admin",
    )
    db.session.add(entry)
    db.session.commit()

    return created(entry.to_dict(), "Kata kunci berhasil ditambahkan.")


@admin_wordlist_bp.patch("/admin/wordlist/<int:kw_id>")
@admin_required
def update_keyword(kw_id):
    """
    Update Kata Kunci
    ---
    tags: [Admin Wordlist]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: kw_id
        type: integer
        required: true
      - in: body
        name: body
        schema:
          type: object
          properties:
            keyword: {type: string}
            category: {type: string}
            isActive: {type: boolean}
    responses:
      200:
        description: Kata kunci diperbarui
    """
    entry = Wordlist.query.get(kw_id)
    if not entry:
        return not_found(detail=f"Kata kunci dengan ID {kw_id} tidak ditemukan.")

    body = request.get_json(silent=True) or {}
    if "keyword" in body:
        entry.keyword = body["keyword"].strip().lower()
    if "category" in body:
        entry.category = body["category"]
    if "description" in body:
        entry.description = body["description"]
    if "isActive" in body:
        entry.is_active = bool(body["isActive"])

    db.session.commit()
    return ok(entry.to_dict(), "Kata kunci berhasil diperbarui.")


@admin_wordlist_bp.delete("/admin/wordlist/<int:kw_id>")
@admin_required
def delete_keyword(kw_id):
    """
    Hapus Kata Kunci
    ---
    tags: [Admin Wordlist]
    security: [{Bearer: []}]
    parameters:
      - name: kw_id
        in: path
        type: integer
        required: true
        description: ID kata kunci yang akan dihapus
    responses:
      200:
        description: Kata kunci dihapus
    """
    entry = Wordlist.query.get(kw_id)
    if not entry:
        return not_found(detail=f"Kata kunci dengan ID {kw_id} tidak ditemukan.")
    db.session.delete(entry)
    db.session.commit()
    return ok({"deletedId": kw_id}, "Kata kunci berhasil dihapus.")
