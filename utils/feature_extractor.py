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

UPDATE v2 (lihat buku panduan Bab 13.1): selain LEXICAL_FEATURES di
bawah, train_model.py SEKARANG JUGA menambahkan fitur TF-IDF character
n-gram dari hostname (lihat TEXT_COL di train_model.py & ml_service.py)
untuk menangkap pola sub-string yang tidak tertangkap fitur numerik di
sini. hostname yang dikembalikan lewat key "_hostname" itulah yang
dipakai sebagai input TF-IDF di kedua file tersebut.

UPDATE v3 (riset ulang dataset judol_dataset.csv, Juli 2026):
----------------------------------------------------------------------
Audit terhadap 29.614 domain judol asli menemukan bahwa 70,6% di
antaranya TIDAK mengandung satupun keyword dari wordlist (mis.
"03032004.net", "05517.com", "0728aa.com", "levhoo.com") -- operator
judol banyak memakai domain "burner" acak/nomor yang sengaja tidak
mengandung kata kunci apapun supaya lolos dari deteksi berbasis
wordlist/blacklist. Pada model v2, recall untuk subset TANPA keyword
match ini hanya 66,5% (dibanding 99,1% pada subset YANG match keyword)
-- model v2 pada dasarnya masih berfungsi seperti keyword matcher, dan
TF-IDF char n-gram belum cukup menggeneralisasi ke pola non-keyword ini
karena n-gram digit acak terlalu jarang & beragam untuk tertangkap
TfidfVectorizer(min_df=3).

Tiga fitur baru ditambahkan untuk menutup celah ini (lihat
dataset/analyze_patterns.py untuk validasi angkanya terhadap dataset
asli):

1. digit_ratio       -- proporsi digit pada hostname. Domain judol acak
   umumnya digit-heavy (rasio digit>=0.3 terjadi 2,7x lebih sering pada
   domain judol vs domain aman).
2. tld_risk           -- skor risiko TLD (0-1) dari tabel empiris
   (ml_model/tld_risk.json) yang dihitung HANYA dari data training
   (smoothing Bayesian, alpha=5) supaya tidak bocor ke test set. TLD
   seperti .vip/.shop/.store/.xyz/.online/.site secara empiris >=95%
   dipakai domain judol pada dataset ini.
3. keyword_score_leet -- jumlah keyword yang cocok SETELAH normalisasi
   leetspeak (0->o, 1->i/l, 3->e, 4->a, 5->s, 7->t, 8->b), untuk
   menangkap variasi seperti "s1ot88", "gac0r", "p0ker".

Fitur lama (keyword_score, digit_count, dst.) TETAP dipertahankan --
fitur baru ini melengkapi, bukan menggantikan.
"""
import ipaddress
import json
import math
import os
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
    "digit_ratio",
    "tld_risk",
    "keyword_score_leet",
]

SPECIAL_CHARS = set("-_~%=&?#")

LEETSPEAK_MAP = str.maketrans({
    "0": "o", "1": "i", "3": "e", "4": "a",
    "5": "s", "7": "t", "8": "b",
})

_TLD_RISK_TABLE = None
_TLD_RISK_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml_model", "tld_risk.json"
)
_TLD_RISK_DEFAULT = 0.33


def _load_tld_risk_table() -> dict:
    global _TLD_RISK_TABLE
    if _TLD_RISK_TABLE is None:
        if os.path.exists(_TLD_RISK_PATH):
            with open(_TLD_RISK_PATH) as f:
                data = json.load(f)
            _TLD_RISK_TABLE = data.get("tld_risk", {})
            global _TLD_RISK_DEFAULT
            _TLD_RISK_DEFAULT = data.get("default_risk", _TLD_RISK_DEFAULT)
        else:
            _TLD_RISK_TABLE = {}
    return _TLD_RISK_TABLE


def get_tld(hostname: str) -> str:
    parts = hostname.rsplit(".", 1)
    return parts[-1] if len(parts) > 1 else ""


def tld_risk_score(hostname: str) -> float:
    table = _load_tld_risk_table()
    tld = get_tld(hostname)
    return table.get(tld, _TLD_RISK_DEFAULT)


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
    raw = raw.strip()
    if not re.match(r"^https?://", raw, re.IGNORECASE):
        raw = "https://" + raw
    return raw


def normalize_leetspeak(s: str) -> str:
    return s.translate(LEETSPEAK_MAP)


def extract_url_features(url: str) -> dict:
    """PENTING (perbaikan bug train-serving skew, Juli 2026):
    url_length dan special_char_count DULU dihitung dari `url` PENUH
    (termasuk path/query, mis. "https://vt.tiktok.com/ZSXotHFaW/"), tapi
    train_model.py melatih model dari kolom `domain` di
    judol_dataset.csv/safe_dataset.csv yang isinya domain POLOS tanpa
    path (mis. "00789f.com"). Akibatnya url_length saat training selalu
    pendek (~panjang domain), sedangkan saat scan sungguhan URL nyata
    (short-link TikTok/Bit.ly dengan ID acak di path, URL dengan query
    string, dll) punya url_length jauh lebih besar dari apapun yang
    pernah dilihat model -- Random Forest salah mengartikan "URL panjang
    dengan path acak" sebagai sinyal judol, padahal itu cuma pola normal
    short-link. Contoh nyata: "vt.tiktok.com" -> P(judol)=0.40 (aman),
    tapi "https://vt.tiktok.com/ZSXotHFaW/" -> P(judol)=0.53 (positif
    palsu) -- hostname-nya PERSIS SAMA.

    Perbaikan: url_length dan special_char_count SEKARANG dihitung dari
    HOSTNAME saja, konsisten dengan data training. Path/query URL boleh
    tetap disimpan di scan_log untuk keperluan crawl (lihat crawler.py),
    tapi TIDAK ikut jadi fitur leksikal untuk model.
    """
    url = normalize_input(url)
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    scheme = (parsed.scheme or "").lower()

    # Dihitung dari HOSTNAME saja (bukan url penuh) supaya konsisten
    # dengan data training yang berasal dari domain polos tanpa path.
    special_char_count = sum(1 for c in hostname if c in SPECIAL_CHARS)
    subdomain_count = max(hostname.count(".") - 1, 0) if hostname else 0
    digit_count = sum(1 for c in hostname if c.isdigit())
    hyphen_count = hostname.count("-")
    digit_ratio = round(digit_count / len(hostname), 4) if hostname else 0.0

    return {
        "url_length": len(hostname),
        "has_ip": 1 if _looks_like_ip(hostname) else 0,
        "has_https": 1 if scheme == "https" else 0,
        "special_char_count": special_char_count,
        "subdomain_count": subdomain_count,
        "digit_count": digit_count,
        "hyphen_count": hyphen_count,
        "entropy": _shannon_entropy(hostname),
        "digit_ratio": digit_ratio,
        "tld_risk": tld_risk_score(hostname),
        "hostname": hostname,
    }


def keyword_score_and_matches(hostname: str, wordlist: list[str]) -> tuple[int, list[str]]:
    hostname = hostname.lower()
    matched = [kw for kw in wordlist if kw in hostname]
    return len(matched), matched


def keyword_score_leet(hostname: str, wordlist: list[str]) -> int:
    normalized = normalize_leetspeak(hostname.lower())
    return sum(1 for kw in wordlist if kw in normalized)


def extract_features(url: str, wordlist: list[str]) -> dict:
    feats = extract_url_features(url)
    hostname = feats.pop("hostname")
    score, matched = keyword_score_and_matches(hostname, wordlist)
    feats["keyword_score"] = score
    feats["keyword_score_leet"] = keyword_score_leet(hostname, wordlist)
    feats["_matched_keywords"] = matched
    feats["_hostname"] = hostname
    return feats


def feature_vector(feats: dict) -> list:
    return [feats[name] for name in LEXICAL_FEATURES]
