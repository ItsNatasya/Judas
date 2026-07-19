"""
train_model.py
================
Melatih model klasifikasi JUDAS menggunakan dataset judol_dataset.csv
(label=1 / "Judol") dan safe_dataset.csv (label=0 / "Aman"), plus
wordlist.csv untuk menghitung fitur keyword_score.

VERSI 3 (Juli 2026) -- lihat catatan lengkap di utils/feature_extractor.py
(UPDATE v3). Ringkasnya: audit terhadap dataset menemukan 70,6% domain
judol TIDAK mengandung keyword apapun (domain acak/nomor seperti
"03032004.net"), dan model v2 hanya mencapai recall 66,5% pada subset
ini (vs 99,1% saat ada keyword match). Versi ini menambahkan 3 fitur
leksikal baru (digit_ratio, tld_risk, keyword_score_leet) yang terbukti
membedakan domain judol vs aman secara empiris pada dataset ini, TANPA
mengubah 9 fitur lama maupun arsitektur TF-IDF char n-gram + Random
Forest.

PENTING soal tld_risk (cegah data leakage):
Tabel risiko TLD (ml_model/tld_risk.json) dihitung HANYA dari X_train
SETELAH train_test_split -- bukan dari seluruh dataset -- lalu dipakai
untuk memberi skor baik pada baris train maupun test. Ini konsisten
dengan praktik target/frequency encoding yang benar: kalau dihitung
dari seluruh dataset (termasuk test), metrik test akan bias optimis.
TLD yang tidak pernah muncul di train diberi skor prior global
(proporsi judol keseluruhan di train).

Pipeline: ColumnTransformer(fitur numerik passthrough + TF-IDF char n-gram
pada teks domain) -> RandomForestClassifier. Seluruh pipeline (bukan cuma
classifier-nya) disimpan sebagai satu file joblib, supaya proses transformasi
fitur saat training dan saat inference SELALU identik (tidak ada risiko
"training-serving skew").

Dijalankan manual:
    python train_model.py

Dipanggil otomatis oleh endpoint POST /admin/model/retrain (lihat
routes/admin_model.py) melalui subprocess / background job.

Output:
    ml_model/random_forest_model.joblib   -> pipeline terlatih (TF-IDF + RF)
    ml_model/model_metrics.json           -> accuracy/precision/recall/f1
                                              (dibaca oleh GET /admin/model/metrics)
    ml_model/tld_risk.json                -> tabel risiko TLD (dipakai feature_extractor.py saat inference)
"""
import json
import os
import sys
from collections import Counter
from datetime import datetime, timezone

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

sys.path.insert(0, os.path.dirname(__file__))
from utils.feature_extractor import (  # noqa: E402
    extract_features, LEXICAL_FEATURES, get_tld, keyword_score_and_matches,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
MODEL_DIR = os.path.join(BASE_DIR, "ml_model")
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODEL_DIR, "random_forest_model.joblib")
METRICS_PATH = os.path.join(MODEL_DIR, "model_metrics.json")
TLD_RISK_PATH = os.path.join(MODEL_DIR, "tld_risk.json")

TEXT_COL = "domain_text"  # kolom teks mentah dipakai TF-IDF char n-gram
TLD_SMOOTHING_ALPHA = 5  # semakin besar, semakin "hati-hati" pada TLD yang jarang muncul


def load_wordlist() -> list[str]:
    wl = pd.read_csv(os.path.join(DATASET_DIR, "wordlist.csv"))
    return wl[wl["is_active"] == True]["keyword"].str.lower().tolist()  # noqa: E712


def build_training_frame() -> pd.DataFrame:
    judol = pd.read_csv(os.path.join(DATASET_DIR, "judol_dataset.csv"))
    safe = pd.read_csv(os.path.join(DATASET_DIR, "safe_dataset.csv"))

    judol = judol[["domain"]].copy()
    judol["label"] = 1
    safe = safe[["domain"]].copy()
    safe["label"] = 0

    df = pd.concat([judol, safe], ignore_index=True).drop_duplicates(subset="domain")
    return df


def build_tld_risk_table(train_tlds: pd.Series, train_labels: pd.Series) -> dict:
    """Hitung skor risiko per-TLD HANYA dari baris training (Bayesian
    smoothing supaya TLD langka tidak overfit ke 0.0/1.0 murni).
    `train_tlds` HARUS sudah berupa TLD yang sudah diekstrak (bukan domain
    mentah) -- lihat pemanggilnya di train()."""
    tlds = train_tlds
    global_prior = float(train_labels.mean())

    counts = Counter()
    judol_counts = Counter()
    for tld, label in zip(tlds, train_labels):
        counts[tld] += 1
        if label == 1:
            judol_counts[tld] += 1

    table = {}
    for tld, total in counts.items():
        j = judol_counts.get(tld, 0)
        smoothed = (j + TLD_SMOOTHING_ALPHA * global_prior) / (total + TLD_SMOOTHING_ALPHA)
        table[tld] = round(float(smoothed), 4)

    return {"tld_risk": table, "default_risk": round(global_prior, 4)}


def extract_all_features(df: pd.DataFrame, wordlist: list[str]) -> pd.DataFrame:
    """Fitur non-TLD dihitung langsung lewat extract_features (aman dari
    leakage karena tidak bergantung split). Kolom `_tld` disimpan terpisah
    supaya tld_risk bisa di-attach BELAKANGAN setelah tabel train-only siap."""
    rows = []
    for domain in df["domain"]:
        feats = extract_features(domain, wordlist)
        row = {name: feats[name] for name in LEXICAL_FEATURES if name != "tld_risk"}
        row[TEXT_COL] = feats["_hostname"] or str(domain)
        row["_tld"] = get_tld(str(feats["_hostname"] or domain).lower())
        rows.append(row)
    feat_df = pd.DataFrame(rows)
    feat_df["label"] = df["label"].values
    return feat_df


def build_pipeline() -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", "passthrough", LEXICAL_FEATURES),
            ("domain_ngrams", TfidfVectorizer(
                analyzer="char_wb", ngram_range=(3, 5),
                max_features=400, sublinear_tf=True, min_df=3,
            ), TEXT_COL),
        ]
    )
    clf = RandomForestClassifier(
        n_estimators=250,
        max_depth=18,
        min_samples_split=6,
        min_samples_leaf=2,
        class_weight="balanced",
        n_jobs=-1,
        random_state=42,
    )
    return Pipeline(steps=[("features", preprocessor), ("clf", clf)])


def train():
    print("[1/6] Memuat wordlist...")
    wordlist = load_wordlist()
    print(f"      {len(wordlist)} keyword aktif dimuat.")

    print("[2/6] Menyusun dataset gabungan (judol_dataset + safe_dataset)...")
    df = build_training_frame()
    print(f"      Total baris unik: {len(df)}  |  Judol: {(df.label==1).sum()}  |  Aman: {(df.label==0).sum()}")

    print("[3/6] Ekstraksi fitur leksikal + teks domain untuk seluruh baris (tanpa tld_risk dulu)...")
    feat_df = extract_all_features(df, wordlist)

    non_tld_features = [f for f in LEXICAL_FEATURES if f != "tld_risk"]
    X = feat_df[non_tld_features + [TEXT_COL, "_tld"]]
    y = feat_df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("[4/6] Menghitung tabel tld_risk HANYA dari X_train (cegah data leakage)...")
    tld_table = build_tld_risk_table(X_train["_tld"], y_train)
    with open(TLD_RISK_PATH, "w") as f:
        json.dump(tld_table, f, indent=2)
    print(f"      {len(tld_table['tld_risk'])} TLD unik di training, default_risk={tld_table['default_risk']}")

    def attach_tld_risk(frame: pd.DataFrame) -> pd.DataFrame:
        frame = frame.copy()
        frame["tld_risk"] = frame["_tld"].map(tld_table["tld_risk"]).fillna(tld_table["default_risk"])
        return frame[LEXICAL_FEATURES + [TEXT_COL]]

    X_train = attach_tld_risk(X_train)
    X_test = attach_tld_risk(X_test)

    print("[5/6] Melatih pipeline (TF-IDF char n-gram + RandomForestClassifier)...")
    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    metrics = {
        "randomForest": {
            "accuracy": round(accuracy_score(y_test, y_pred), 4),
            "precision": round(precision_score(y_test, y_pred), 4),
            "recall": round(recall_score(y_test, y_pred), 4),
            "f1Score": round(f1_score(y_test, y_pred), 4),
        },
        "lastTrainedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "datasetSize": len(df),
        "featureNames": LEXICAL_FEATURES + ["domain_char_ngrams(tfidf,3-5,max400)"],
        "trainRows": len(X_train),
        "testRows": len(X_test),
        "modelVersion": 3,
    }

    # Recall khusus pada subset TANPA keyword match sama sekali -- ini metrik
    # yang paling relevan untuk memvalidasi apakah fitur baru benar-benar
    # menutup celah yang dilaporkan (domain acak seperti "03032004.net").
    no_kw_mask = X_test["keyword_score"] == 0
    if no_kw_mask.sum() > 0:
        recall_no_kw = recall_score(y_test[no_kw_mask], y_pred[no_kw_mask])
        metrics["recallNoKeywordMatch"] = round(float(recall_no_kw), 4)
        metrics["noKeywordMatchTestRows"] = int(no_kw_mask.sum())

    print("[6/6] Menyimpan pipeline dan metrik...")
    joblib.dump(pipeline, MODEL_PATH, compress=3)
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    print("\n=== HASIL TRAINING ===")
    print(json.dumps(metrics, indent=2))
    print(f"\nModel disimpan di: {MODEL_PATH}")
    print(f"Metrik disimpan di: {METRICS_PATH}")
    print(f"Tabel TLD risk disimpan di: {TLD_RISK_PATH}")


if __name__ == "__main__":
    train()
