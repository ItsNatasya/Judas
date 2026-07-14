from flask import Blueprint, request

from database.extensions import limiter
from services.lexical_service import analyze_url
from services.whois_service import lookup as whois_lookup
from utils.ssrf_protection import is_url_format_valid, is_safe_url
from utils.response import ok, bad_request, invalid_format, unprocessable

lexical_bp = Blueprint("lexical", __name__)


@lexical_bp.get("/lexical/analyze")
@limiter.limit("30/minute")
def analyze():
    """
    Analyze URL (Lexical)
    ---
    tags: [Lexical Analysis]
    parameters:
      - in: query
        name: url
        type: string
        required: true
    responses:
      200:
        description: Fitur leksikal + rfScore + label
    """
    url = request.args.get("url", "").strip()
    if not url:
        return bad_request(detail="Parameter url wajib diisi.")
    if not is_url_format_valid(url):
        return invalid_format(detail="Parameter url harus berformat http:// atau https://.")
    if not is_safe_url(url):
        return unprocessable(detail="Domain tidak dapat diproses (IP privat / SSRF protection).")

    whois_result = whois_lookup(url)
    result = analyze_url(url, crawl_result=None, whois_result=whois_result)
    result.pop("hostname", None)
    return ok(result, "Analisis leksikal berhasil.")
