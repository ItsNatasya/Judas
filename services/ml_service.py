"""
ml_service.py
==============
Memuat pipeline terlatih (TF-IDF char n-gram + Random Forest, dari
train_model.py) dan melakukan prediksi + menggabungkan skor akhir sesuai
flowchart "Gabungkan & Analisis Bobot Skor Akhir" (3 lapis: ML + Crawl +
WHOIS).
"""
import json
import os

import joblib

from utils.feature_extractor import LEXICAL_FEATURES

_MODEL = None
_METRICS = None
TEXT_COL = "domain_text"  # harus sama persis dengan TEXT_COL di train_model.py


def _model_path():
    from flask import current_app
    return current_app.config["MODEL_PATH"]


def _metrics_path():
    from flask import current_app
    return current_app.config["METRICS_PATH"]


def load_model():
    global _MODEL
    path = _model_path()
    if os.path.exists(path):
        _MODEL = joblib.load(path)
    else:
        _MODEL = None
    return _MODEL


def get_model():
    global _MODEL
    if _MODEL is None:
        load_model()
    return _MODEL


def get_metrics() -> dict | None:
    global _METRICS
    path = _metrics_path()
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def predict(feats: dict) -> float:
    """Mengembalikan rfScore (probabilitas kelas 'Judol', 0.0-1.0).
    `feats` HARUS masih memuat key "_hostname" (belum di-pop) -- dipakai
    sebagai input TF-IDF char n-gram, persis seperti saat training."""
    import pandas as pd

    model = get_model()
    if model is None:
        # Fallback jika model belum pernah dilatih: gunakan keyword_score sbg proxy kasar
        score = min(1.0, 0.15 + 0.2 * feats.get("keyword_score", 0))
        return round(score, 4)

    row = {name: feats[name] for name in LEXICAL_FEATURES}
    row[TEXT_COL] = feats.get("_hostname") or ""
    vec_df = pd.DataFrame([row])

    proba = model.predict_proba(vec_df)[0]
    # index kelas 1 = "Judol" (label training: judol_dataset=1, safe_dataset=0)
    classes = list(model.classes_)
    idx = classes.index(1) if 1 in classes else 1
    return round(float(proba[idx]), 4)


def compute_risk_score(rf_score: float, crawl_result: dict | None, whois_result: dict | None) -> int:
    """Menggabungkan RF + crawl + WHOIS menjadi riskScore 0-100.
    Bobot: RF 70%, sinyal crawl 15%, umur domain (WHOIS) 15%.
    Domain sangat baru (<30 hari) menaikkan risiko; domain lama menurunkan."""
    score = rf_score * 70

    if crawl_result:
        if crawl_result.get("status") == "success" and crawl_result.get("gambling_content_hit"):
            score += 15
        elif crawl_result.get("status") in ("blocked_403", "timeout", "connection_refused"):
            score += 5  # sedikit mencurigakan jika situs aktif menyembunyikan diri
    else:
        score += 7.5  # netral jika crawl tidak dilakukan

    age_days = whois_result.get("ageInDays") if whois_result else None
    if age_days is None:
        score += 7.5  # netral jika WHOIS tidak tersedia
    elif age_days < 30:
        score += 15
    elif age_days < 180:
        score += 8

    return max(0, min(100, round(score)))


def label_from_confidence(confidence: float, threshold: float) -> str:
    return "Judol" if confidence >= threshold else "Aman"
