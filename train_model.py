"""
train_model.py
================
Melatih model klasifikasi JUDAS menggunakan dataset judol_dataset.csv
(label=1 / "Judol") dan safe_dataset.csv (label=0 / "Aman"), plus
wordlist.csv untuk menghitung fitur keyword_score.

VERSI 2 (peningkatan dari versi awal, lihat Bab 13 buku panduan):
selain 9 fitur leksikal numerik, sekarang model JUGA memakai fitur
character n-gram (TF-IDF, n=3-5, analisis "char_wb") dari nama domain --
teknik yang lazim dipakai untuk deteksi DGA/domain berbahaya karena
menangkap pola sub-string (mis. "-slot-", "gacor", "99x") yang tidak
tertangkap fitur numerik biasa maupun wordlist tetap.

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
"""
import json
import os
import sys
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
from utils.feature_extractor import extract_features, LEXICAL_FEATURES  # noqa: E402

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
MODEL_DIR = os.path.join(BASE_DIR, "ml_model")
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODEL_DIR, "random_forest_model.joblib")
METRICS_PATH = os.path.join(MODEL_DIR, "model_metrics.json")

TEXT_COL = "domain_text"  # kolom teks mentah dipakai TF-IDF char n-gram


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


def extract_all_features(df: pd.DataFrame, wordlist: list[str]) -> pd.DataFrame:
    rows = []
    for domain in df["domain"]:
        feats = extract_features(domain, wordlist)
        row = {name: feats[name] for name in LEXICAL_FEATURES}
        row[TEXT_COL] = feats["_hostname"] or str(domain)
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
    print("[1/5] Memuat wordlist...")
    wordlist = load_wordlist()
    print(f"      {len(wordlist)} keyword aktif dimuat.")

    print("[2/5] Menyusun dataset gabungan (judol_dataset + safe_dataset)...")
    df = build_training_frame()
    print(f"      Total baris unik: {len(df)}  |  Judol: {(df.label==1).sum()}  |  Aman: {(df.label==0).sum()}")

    print("[3/5] Ekstraksi fitur leksikal + teks domain untuk seluruh baris...")
    feat_df = extract_all_features(df, wordlist)

    X = feat_df[LEXICAL_FEATURES + [TEXT_COL]]
    y = feat_df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("[4/5] Melatih pipeline (TF-IDF char n-gram + RandomForestClassifier)...")
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
        "modelVersion": 2,
    }

    print("[5/5] Menyimpan pipeline dan metrik...")
    joblib.dump(pipeline, MODEL_PATH, compress=3)
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    print("\n=== HASIL TRAINING ===")
    print(json.dumps(metrics, indent=2))
    print(f"\nModel disimpan di: {MODEL_PATH}")
    print(f"Metrik disimpan di: {METRICS_PATH}")


if __name__ == "__main__":
    train()
