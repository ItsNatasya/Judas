"""
import_dataset_to_db.py
=========================
Mengimpor 3 file dataset CSV (hasil dataset/build_datasets.py) ke dalam
3 TABEL POSTGRESQL TERPISAH:

    dataset/judol_dataset.csv  -> tabel judol_dataset
    dataset/safe_dataset.csv   -> tabel safe_dataset
    dataset/wordlist.csv        -> tabel wordlist

Jalankan setelah:
  1. PostgreSQL sudah aktif & database judas_db sudah dibuat
  2. Tabel sudah dibuat (via database/schema.sql ATAU `flask shell` -> db.create_all())
  3. .env sudah diisi DATABASE_URL yang benar

Cara pakai:
    python scripts/import_dataset_to_db.py
    python scripts/import_dataset_to_db.py --truncate   # kosongkan tabel dulu sebelum impor
"""
import argparse
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402
from database.extensions import db  # noqa: E402
from models.judol_dataset import JudolDataset  # noqa: E402
from models.safe_dataset import SafeDataset  # noqa: E402
from models.wordlist import Wordlist  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")


def import_judol(truncate: bool):
    path = os.path.join(DATASET_DIR, "judol_dataset.csv")
    df = pd.read_csv(path)
    if truncate:
        JudolDataset.query.delete()
        db.session.commit()

    inserted = 0
    for _, row in df.iterrows():
        if JudolDataset.query.filter_by(url=row["domain"]).first():
            continue
        db.session.add(JudolDataset(
            url=row["domain"], category=row["category"], risk=row["risk"],
            status=row["status"], reported_by=row.get("reported_by"),
            notes=row.get("notes") if pd.notna(row.get("notes")) else None,
        ))
        inserted += 1
        if inserted % 2000 == 0:
            db.session.commit()
            print(f"  ... {inserted} baris judol_dataset diimpor")
    db.session.commit()
    print(f"[judol_dataset] {inserted} baris baru diimpor dari {len(df)} total baris CSV.")


def import_safe(truncate: bool):
    path = os.path.join(DATASET_DIR, "safe_dataset.csv")
    df = pd.read_csv(path)
    if truncate:
        SafeDataset.query.delete()
        db.session.commit()

    inserted = 0
    for _, row in df.iterrows():
        if SafeDataset.query.filter_by(url=row["domain"]).first():
            continue
        db.session.add(SafeDataset(
            url=row["domain"], category=row["category"], risk=row["risk"],
            status=row["status"], notes=row.get("notes") if pd.notna(row.get("notes")) else None,
        ))
        inserted += 1
        if inserted % 2000 == 0:
            db.session.commit()
            print(f"  ... {inserted} baris safe_dataset diimpor")
    db.session.commit()
    print(f"[safe_dataset] {inserted} baris baru diimpor dari {len(df)} total baris CSV.")


def import_wordlist(truncate: bool):
    path = os.path.join(DATASET_DIR, "wordlist.csv")
    df = pd.read_csv(path)
    if truncate:
        Wordlist.query.delete()
        db.session.commit()

    inserted = 0
    for _, row in df.iterrows():
        if Wordlist.query.filter_by(keyword=row["keyword"]).first():
            continue
        db.session.add(Wordlist(
            keyword=row["keyword"], category=row["category"],
            description=row.get("description") if pd.notna(row.get("description")) else None,
            is_active=bool(row["is_active"]), added_by=row.get("added_by", "system"),
        ))
        inserted += 1
    db.session.commit()
    print(f"[wordlist] {inserted} baris baru diimpor dari {len(df)} total baris CSV.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--truncate", action="store_true", help="Kosongkan tabel sebelum impor")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        import_judol(args.truncate)
        import_safe(args.truncate)
        import_wordlist(args.truncate)
        print("\nSelesai. Cek jumlah baris dengan: SELECT COUNT(*) FROM judol_dataset; dst.")
