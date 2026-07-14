"""whois_service.py -- Pengecekan umur & data registrasi domain (lapis ke-3 dari 3 lapis paralel)."""
from datetime import datetime, timezone
from urllib.parse import urlparse

import whois as python_whois


def _to_utc_iso(dt) -> str | None:
    if dt is None:
        return None
    if isinstance(dt, list):
        dt = dt[0]
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def lookup(url: str) -> dict:
    """Mengembalikan dict: domain, registrar, createdAt, expiresAt, ageInDays, status.
    ageInDays = None jika WHOIS Privacy / TLD tidak didukung / timeout."""
    hostname = urlparse(url).hostname or url
    try:
        w = python_whois.whois(hostname)
    except Exception:
        return {
            "domain": hostname, "registrar": None, "createdAt": None,
            "expiresAt": None, "ageInDays": None, "status": None,
        }

    created = w.creation_date
    if isinstance(created, list):
        created = created[0]
    age_days = None
    if created:
        c = created if created.tzinfo else created.replace(tzinfo=timezone.utc)
        age_days = (datetime.now(timezone.utc) - c).days

    status = w.status
    if isinstance(status, list):
        status = status[0]

    return {
        "domain": hostname,
        "registrar": w.registrar,
        "createdAt": _to_utc_iso(created),
        "expiresAt": _to_utc_iso(w.expiration_date),
        "ageInDays": age_days,
        "status": status,
    }
