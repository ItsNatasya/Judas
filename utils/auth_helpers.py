from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from utils.response import forbidden, unauthorized_token


def admin_required(fn):
    """Wajib Bearer token DAN role == admin (responseCode 16/17)."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
        except Exception:
            return unauthorized_token(detail="Sertakan header Authorization: Bearer <access_token>.")
        claims = get_jwt()
        if claims.get("role") != "admin":
            return forbidden(detail="Endpoint ini hanya dapat diakses oleh admin.")
        return fn(*args, **kwargs)
    return wrapper


def get_optional_admin():
    """Untuk /scan/url -- token opsional. Mengembalikan identity jika ada & valid, None jika tidak."""
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt_identity()
    except Exception:
        return None
