from flask import Blueprint, request

from database.extensions import db, limiter
from models.judol_dataset import JudolDataset
from services.whois_service import lookup as whois_lookup
from utils.ssrf_protection import is_url_format_valid
from utils.response import ok, created, bad_request, invalid_format, conflict, not_found

url_bp = Blueprint("url_utils", __name__)


@url_bp.post("/url/report")
@limiter.limit("10/minute")
def report_url():
    """
    Laporkan URL Mencurigakan
    ---
    tags: [URL Utilities]
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required: [url]
          properties:
            url: {type: string}
            category: {type: string}
            notes: {type: string}
            reportedBy: {type: string}
    responses:
      201:
        description: Laporan diterima
    """
    body = request.get_json(silent=True) or {}
    url = (body.get("url") or "").strip()

    if not url:
        return bad_request(detail="Field url wajib diisi.")
    if not is_url_format_valid(url):
        return invalid_format(detail="URL harus dimulai dengan http:// atau https://")

    existing = JudolDataset.query.filter_by(url=url).first()
    if existing and existing.status == "Aktif":
        return conflict(detail="URL ini sudah terdaftar dalam dataset dengan status Aktif.")

    entry = JudolDataset(
        url=url,
        category=body.get("category") or "Lainnya",
        risk="Sedang",
        status="Dilaporkan",
        reported_by=body.get("reportedBy") or "Anonim",
        notes=body.get("notes"),
    )
    db.session.add(entry)
    db.session.commit()

    return created({"reportId": entry.id, "status": "Diterima"},
                   "Laporan URL berhasil dikirim. Tim kami akan menindaklanjuti.")


@url_bp.get("/url/whois")
def get_whois():
    """
    Get WHOIS Info
    ---
    tags: [URL Utilities]
    parameters:
      - in: query
        name: url
        type: string
        required: true
    responses:
      200:
        description: Informasi WHOIS domain
    """
    url = request.args.get("url", "").strip()
    if not url:
        return bad_request(detail="Parameter url wajib diisi.")
    if not is_url_format_valid(url):
        return invalid_format(detail="Parameter url harus berformat http:// atau https://.")

    result = whois_lookup(url)
    if not result.get("createdAt"):
        return not_found(detail="Data WHOIS tidak tersedia untuk domain ini.")
    return ok(result, "Data WHOIS berhasil diambil.")
