"""lexical_service.py -- dipakai oleh GET /lexical/analyze dan POST /scan/url."""
from models.wordlist import Wordlist
from utils.feature_extractor import extract_features
from services.ml_service import predict, compute_risk_score


def get_active_wordlist() -> list[str]:
    rows = Wordlist.query.filter_by(is_active=True).all()
    return [r.keyword.lower() for r in rows]


def analyze_url(url: str, crawl_result=None, whois_result=None, threshold: float = 0.5) -> dict:
    wordlist = get_active_wordlist()
    feats = extract_features(url, wordlist)
    matched = feats.pop("_matched_keywords")
    rf_score = predict(feats)
    hostname = feats.pop("_hostname")
    risk_score = compute_risk_score(rf_score, crawl_result, whois_result)

    if rf_score >= threshold + 0.2:
        label = "JUDOL"
    elif rf_score >= threshold - 0.2:
        label = "TIDAK PASTI"
    else:
        label = "AMAN"

    return {
        "url": url,
        "hostname": hostname,
        "features": {
            "url_length": feats["url_length"],
            "has_ip": feats["has_ip"],
            "has_https": feats["has_https"],
            "special_char_count": feats["special_char_count"],
            "subdomain_count": feats["subdomain_count"],
            "keyword_score": feats["keyword_score"],
            "domain_age_days": whois_result.get("ageInDays") if whois_result else None,
        },
        "matchedKeywords": matched,
        "rfScore": rf_score,
        "riskScore": risk_score,
        "label": label,
    }
