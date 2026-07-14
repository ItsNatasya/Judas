import random
import string
from datetime import datetime, timezone
from flask import jsonify

API_VERSION = "1.0"


def _trace_id() -> str:
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    rand_part = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"judas-{date_part}-{rand_part}"


def envelope(response_code: str, message: str, data=None, error_detail=None):
    body = {
        "responseCode": response_code,
        "responseMessage": message,
        "apiVersion": API_VERSION,
        "traceId": _trace_id(),
    }
    if error_detail is not None:
        body["errorDetail"] = error_detail
    else:
        body["data"] = data
    return body


def ok(data, message="Berhasil.", http_status=200):
    return jsonify(envelope("00", message, data=data)), http_status


def created(data, message="Berhasil dibuat."):
    return jsonify(envelope("00", message, data=data)), 201


def accepted(data, message="Diterima."):
    return jsonify(envelope("00", message, data=data)), 202


def not_found(message="Data tidak ditemukan.", detail=None):
    return jsonify(envelope("11", message, error_detail=detail)), 404


def bad_request(message="Field wajib kosong.", detail=None):
    return jsonify(envelope("12", message, error_detail=detail)), 400


def invalid_format(message="Format field tidak valid.", detail=None):
    return jsonify(envelope("13", message, error_detail=detail)), 400


def unprocessable(message="Domain tidak dapat diproses.", detail=None):
    return jsonify(envelope("14", message, error_detail=detail)), 422


def unauthorized_credentials(message="Kredensial tidak valid.", detail=None):
    return jsonify(envelope("15", message, error_detail=detail)), 401


def unauthorized_token(message="Token tidak valid atau telah kedaluwarsa.", detail=None):
    return jsonify(envelope("16", message, error_detail=detail)), 401


def forbidden(message="Akses ditolak.", detail=None):
    return jsonify(envelope("17", message, error_detail=detail)), 403


def conflict(message="Data duplikat.", detail=None):
    return jsonify(envelope("18", message, error_detail=detail)), 409


def rate_limited(message="Rate limit terlampaui.", detail=None):
    return jsonify(envelope("19", message, error_detail=detail)), 429


def retrain_conflict(message="Retraining sedang berjalan.", detail=None):
    return jsonify(envelope("20", message, error_detail=detail)), 409


def export_failed(message="Export gagal.", detail=None):
    return jsonify(envelope("21", message, error_detail=detail)), 404
