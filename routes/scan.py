from datetime import datetime, timezone

from flask import Blueprint, request

from database.extensions import db, limiter
from models.scan_log import ScanLog
from models.judol_dataset import JudolDataset
from models.safe_dataset import SafeDataset
from services.crawler import crawl
from services.whois_service import lookup as whois_lookup
from services.lexical_service import analyze_url, get_active_wordlist
from services.ml_service import predict, compute_risk_score, label_from_confidence
from utils.feature_extractor import extract_features
from utils.auth_helpers import get_optional_admin, admin_required
from utils.ssrf_protection import is_url_format_valid, is_safe_url
from utils.response import ok, bad_request, invalid_format, unprocessable, not_found

scan_bp = Blueprint("scan", __name__)

FEATURES_USED = [
    "url_length", "has_ip", "has_https", "special_char_count",
    "subdomain_count", "keyword_score", "domain_age_days",
]


@scan_bp.post("/scan/url")
@limiter.limit("30/minute")
def scan_url():
    """
    Scan URL
    ---
    tags: [Scan]
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required: [url]
          properties:
            url: {type: string, example: "https://contoh-domain.com"}
    responses:
      200:
        description: Hasil scan (label, confidence, rfScore, whoisAge, dst.)
    """
    body = request.get_json(silent=True) or {}
    url = (body.get("url") or "").strip()

    if not url:
        return bad_request(detail="Field url wajib diisi.")
    if not is_url_format_valid(url):
        return invalid_format(detail="URL harus dimulai dengan http:// atau https://")
    if not is_safe_url(url):
        return unprocessable(detail="Domain mengarah ke IP privat -- diblokir demi keamanan (SSRF protection).")

    from flask import current_app
    threshold = current_app.config["CONFIDENCE_THRESHOLD"]

    # 1. Cek apakah URL sudah ada di dataset (cache)
    existing = JudolDataset.query.filter_by(url=url).first()
    is_judol = existing is not None
    if not existing:
        existing = SafeDataset.query.filter_by(url=url).first()
    if existing:
        if is_judol:
            existing.scan_count = (existing.scan_count or 0) + 1
        db.session.commit()
        return ok({
            "url": url,
            "label": "Judol" if is_judol else "Aman",
            "confidence": 0.95 if is_judol else 0.05,
            "rfScore": 0.95 if is_judol else 0.05,
            "whoisAge": None,
            "crawlStatus": "skipped",
            "featuresUsed": FEATURES_USED,
            "scannedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "fromCache": True,
        }, "Scan berhasil dilakukan.")

    # 2. Tiga lapis pemindaian paralel: ML + Crawl + WHOIS
    wordlist = get_active_wordlist()
    feats = extract_features(url, wordlist)
    feats.pop("_matched_keywords", None)
    rf_score = predict(feats)
    feats.pop("_hostname", None)

    crawl_result = crawl(url)
    whois_result = whois_lookup(url)

    risk_score = compute_risk_score(rf_score, crawl_result, whois_result)
    label = label_from_confidence(rf_score, threshold, crawl_result)

    admin_identity = get_optional_admin()
    log = ScanLog(
        url=url, label=label, confidence=rf_score, rf_score=rf_score,
        whois_age=whois_result.get("ageInDays"), crawl_status=crawl_result.get("status"),
        features_used=FEATURES_USED, from_cache=False,
        admin_id=int(admin_identity) if admin_identity else None,
    )
    db.session.add(log)
    db.session.commit()

    return ok({
        "url": url,
        "label": label,
        "confidence": rf_score,
        "rfScore": rf_score,
        "whoisAge": whois_result.get("ageInDays"),
        "crawlStatus": crawl_result.get("status"),
        "featuresUsed": FEATURES_USED,
        "scannedAt": log.scanned_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "fromCache": False,
    }, "Scan berhasil dilakukan.")


@scan_bp.get("/scan/history")
@admin_required
def scan_history():
    """
    Get Scan History
    ---
    tags: [Scan]
    security: [{Bearer: []}]
    parameters:
      - in: query
        name: page
        type: integer
      - in: query
        name: limit
        type: integer
      - in: query
        name: label
        type: string
    responses:
      200:
        description: Daftar riwayat scan milik akun ini
    """
    page = request.args.get("page", 1, type=int)
    limit = min(request.args.get("limit", 10, type=int), 100)
    label = request.args.get("label")

    # from flask_jwt_extended import get_jwt_identity
    # admin_id = get_jwt_identity()

    query = ScanLog.query 
    # .filter_by(admin_id=int(admin_id))
    if label:
        query = query.filter_by(label=label)
    query = query.order_by(ScanLog.scanned_at.desc())

    pagination = query.paginate(page=page, per_page=limit, error_out=False)
    if not pagination.items:
        return not_found(detail="Tidak ada data yang sesuai filter.")

    return ok(
        [r.to_dict() for r in pagination.items],
        "Data history berhasil diambil.",
    )


@scan_bp.get("/scan/result/<int:scan_id>")
@admin_required
def scan_result(scan_id):
    """
    Get Scan Result by ID
    ---
    tags: [Scan]
    parameters:
      - in: path
        name: scan_id
        required: true
        type: integer
        description: ID scan yang ingin dilihat detailnya
    security: [{Bearer: []}]
    responses:
      200:
        description: Detail hasil scan
    """
    log = ScanLog.query.get(scan_id)
    if not log:
        return not_found(detail=f"Scan result dengan ID {scan_id} tidak ditemukan.")
    return ok(log.to_dict(detailed=True), "Data berhasil diambil.")
