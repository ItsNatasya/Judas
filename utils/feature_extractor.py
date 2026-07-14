"""
feature_extractor.py
=====================
Ekstraksi fitur leksikal URL/domain untuk model Random Forest JUDAS.

CATATAN DESAIN PENTING (baca ini sebelum retrain):
---------------------------------------------------
API Contract v3.6 (Bab 4.6.1 & 4.2.1) menyebutkan 7 nama fitur pada
response ("featuresUsed"): url_length, has_ip, has_https,
special_char_count, subdomain_count, keyword_score, domain_age_days.

Dari 7 fitur itu, HANYA 5 fitur leksikal (url_length, has_ip, has_https,
special_char_count, subdomain_count) + keyword_score yang bisa dihitung
murni dari string domain/URL secara instan. Model Random Forest DILATIH
menggunakan ke-6 fitur leksikal ini (LEXICAL_FEATURES di bawah).

Sedangkan domain_age_days berasal dari WHOIS -- yang butuh network call
per-domain, sehingga TIDAK dijadikan fitur training untuk 89.802 baris
dataset dataset (tidak realistis melakukan WHOIS lookup massal secara
offline). Sebagai gantinya, sesuai flowchart "Scan URL" (3 lapis
paralel): domain_age_days dipakai sebagai PENYESUAI riskScore di
services/ml_service.py::compute_risk_score(), BUKAN sebagai input RF.
Ini konsisten dengan arsitektur JUDAS: RF + Crawl + WHOIS digabung
setelah masing-masing skor didapat, bukan digabung jadi satu vektor
fitur tunggal.

Jika suatu saat dataset punya kolom domain_age_days terisi penuh (misal
dari histori scan_log yang terkumpul), silakan tambahkan ke
LEXICAL_FEATURES dan retrain -- kodenya sudah disiapkan agar mudah
diperluas.

UPDATE v2 (lihat buku panduan Bab 13.1): selain LEXICAL_FEATURES di
bawah, train_model.py SEKARANG JUGA menambahkan fitur TF-IDF character
n-gram dari hostname (lihat TEXT_COL di train_model.py & ml_service.py)
untuk menangkap pola sub-string yang tidak tertangkap fitur numerik di
sini. Fungsi-fungsi di file ini (extract_features, dst.) TIDAK berubah --
hostname yang dikembalikan lewat key "_hostname" itulah yang dipakai
sebagai input TF-IDF di kedua file tersebut.
"""
import ipaddress
import math
import re
from urllib.parse import urlparse

LEXICAL_FEATURES = [
    "url_length",
    "has_ip",
    "has_https",
    "special_char_count",
    "subdomain_count",
    "keyword_score",
    "digit_count",
    "hyphen_count",
    "entropy",
]

SPECIAL_CHARS = set("-_~%=&?#")


def _shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    probs = [s.count(c) / len(s) for c in set(s)]
    return round(-sum(p * math.log2(p) for p in probs), 4)


def _looks_like_ip(hostname: str) -> bool:
    try:
        ipaddress.ip_address(hostname)
        return True
    except ValueError:
        return False


def normalize_input(raw: str) -> str:
    """Menerima domain polos ('slot88gacor.com') ATAU URL penuh
    ('https://slot88gacor.com/path') dan mengembalikan bentuk URL
    lengkap (menambahkan skema https:// jika belum ada)."""
    raw = raw.strip()
    if not re.match(r"^https?://", raw, re.IGNORECASE):
        raw = "https://" + raw
    return raw


def extract_url_features(url: str) -> dict:
    """Menghitung seluruh fitur leksikal murni dari string URL/domain.
    Tidak melakukan network call apa pun (aman dipakai untuk 90.000+ baris)."""
    url = normalize_input(url)
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    scheme = (parsed.scheme or "").lower()

    special_char_count = sum(1 for c in url if c in SPECIAL_CHARS)
    subdomain_count = max(hostname.count(".") - 1, 0) if hostname else 0
    digit_count = sum(1 for c in hostname if c.isdigit())
    hyphen_count = hostname.count("-")

    return {
        "url_length": len(url),
        "has_ip": 1 if _looks_like_ip(hostname) else 0,
        "has_https": 1 if scheme == "https" else 0,
        "special_char_count": special_char_count,
        "subdomain_count": subdomain_count,
        "digit_count": digit_count,
        "hyphen_count": hyphen_count,
        "entropy": _shannon_entropy(hostname),
        "hostname": hostname,
    }


def keyword_score_and_matches(hostname: str, wordlist: list[str]) -> tuple[int, list[str]]:
    """wordlist: daftar keyword aktif (lowercase) dari tabel wordlist."""
    hostname = hostname.lower()
    matched = [kw for kw in wordlist if kw in hostname]
    return len(matched), matched


def extract_features(url: str, wordlist: list[str]) -> dict:
    """Fungsi utama dipakai oleh training script maupun endpoint /scan/url
    dan /lexical/analyze. Mengembalikan dict fitur leksikal + keyword_score
    + metadata (hostname, matchedKeywords) siap dipakai model & response API."""
    feats = extract_url_features(url)
    hostname = feats.pop("hostname")
    score, matched = keyword_score_and_matches(hostname, wordlist)
    feats["keyword_score"] = score
    feats["_matched_keywords"] = matched
    feats["_hostname"] = hostname
    return feats


def feature_vector(feats: dict) -> list:
    """Urutan vektor HARUS selalu sama antara training dan inference."""
    return [feats[name] for name in LEXICAL_FEATURES]
