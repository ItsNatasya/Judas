"""
build_datasets.py
==================
Membersihkan dan menyusun 3 dataset TERPISAH untuk JUDAS sesuai API Contract v3.6:

  1. judol_dataset.csv  -> domain judi online (tabel: judol_dataset)
  2. safe_dataset.csv   -> domain aman/legitimate (tabel: safe_dataset)
  3. wordlist.csv        -> kata kunci judol per kategori (tabel: wordlist)

Sumber data mentah: judol_domains.xlsx (29.625 baris) & safe_domains.xlsx (60.188 baris)
yang diunggah oleh tim JUDAS.

Jalankan:
    python build_datasets.py
Output tersimpan di folder ini: judol_dataset.csv, safe_dataset.csv, wordlist.csv
"""
import re
import pandas as pd
from datetime import datetime, timezone

RAW_JUDOL = "raw_source/judol_domains.xlsx"
RAW_SAFE = "raw_source/safe_domains.xlsx"

CATEGORY_KEYWORDS = {
    "Slot": ["slot", "gacor", "maxwin", "scatter", "mahjong", "olympus", "zeus", "pragmatic", "spin", "mpo"],
    "Togel": ["togel", "toto", "4d", "3d", "2d", "pools", "prediksi", "keluaran", "hoki"],
    "Casino": ["casino", "kasino", "baccarat", "roulette"],
    "Poker": ["poker", "domino", "ceme", "qq"],
    "Sportbook": ["sbobet", "sportbook", "bola", "taruhan", "parlay"],
}


def guess_category(domain: str) -> str:
    d = domain.lower()
    for cat, kws in CATEGORY_KEYWORDS.items():
        if any(kw in d for kw in kws):
            return cat
    return "Lainnya"


def guess_risk(domain: str, category: str) -> str:
    """Heuristik sederhana: makin banyak kata kunci judol yang cocok, makin tinggi risikonya."""
    d = domain.lower()
    hits = sum(1 for kws in CATEGORY_KEYWORDS.values() for kw in kws if kw in d)
    if category == "Lainnya" and hits == 0:
        return "Sedang"
    if hits >= 2:
        return "Tinggi"
    return "Tinggi" if category != "Lainnya" else "Sedang"


def build_judol_dataset(path: str) -> pd.DataFrame:
    df = pd.read_excel(path)
    df = df.drop_duplicates(subset="domain").reset_index(drop=True)
    df["domain"] = df["domain"].str.strip().str.lower()
    df["category"] = df["domain"].apply(guess_category)
    df["risk"] = df.apply(lambda r: guess_risk(r["domain"], r["category"]), axis=1)
    df["status"] = df["is_active"].apply(lambda x: "Aktif" if bool(x) else "Nonaktif")
    df["reported_by"] = "Dataset Riset Cybersecurity JUDAS"
    df["notes"] = df["description"].fillna("")
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    df["added_at"] = now
    df["added_by"] = df["added_by"].fillna("system")
    out = df[["domain", "category", "risk", "status", "reported_by", "notes", "added_at", "added_by"]]
    return out


def build_safe_dataset(path: str) -> pd.DataFrame:
    df = pd.read_excel(path)
    df = df.drop_duplicates(subset="domain").reset_index(drop=True)
    df["domain"] = df["domain"].str.strip().str.lower()
    df["category"] = "Aman"
    df["risk"] = "Rendah"
    df["status"] = df["is_active"].apply(lambda x: "Aktif" if bool(x) else "Nonaktif")
    df["notes"] = df["description"].fillna("")
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    df["added_at"] = now
    df["added_by"] = df["added_by"].fillna("system")
    out = df[["domain", "category", "risk", "status", "notes", "added_at", "added_by"]]
    return out


# Wordlist kata kunci judol -- 54 entri, 8 kategori sesuai API Contract Bab 4.7 & FSD
WORDLIST_SEED = [
    ("slot", "Slot"), ("slot88", "Slot"), ("slot777", "Slot"), ("gacor", "Slot"),
    ("maxwin", "Slot"), ("scatter", "Slot"), ("mahjong", "Slot"), ("olympus", "Slot"),
    ("zeus", "Slot"), ("pragmatic", "Slot"), ("spin", "Slot"), ("mpo", "Slot"),
    ("togel", "Togel"), ("toto", "Togel"), ("4d", "Togel"), ("3d", "Togel"),
    ("2d", "Togel"), ("pools", "Togel"), ("keluaran", "Togel"), ("prediksi", "Togel"),
    ("casino", "Casino"), ("kasino", "Casino"), ("baccarat", "Casino"), ("roulette", "Casino"),
    ("poker", "Poker"), ("domino", "Poker"), ("ceme", "Poker"), ("qq", "Poker"),
    ("sbobet", "Sportbook"), ("sportbook", "Sportbook"), ("taruhan", "Sportbook"),
    ("bola", "Sportbook"), ("parlay", "Sportbook"),
    ("judi", "Umum"), ("judol", "Umum"), ("bet", "Umum"), ("betting", "Umum"), ("gambling", "Umum"),
    ("jackpot", "Slang"), ("hoki", "Slang"), ("cuan", "Slang"), ("wd", "Slang"),
    ("anti rungkad", "Slang"), ("rtp", "Slang"), ("jp", "Slang"),
    ("live", "Operasional"), ("livechat", "Operasional"), ("login", "Operasional"),
    ("daftar", "Operasional"), ("deposit", "Operasional"), ("withdraw", "Operasional"),
    ("akong", "Operasional"), ("agen", "Operasional"), ("bandar", "Operasional"),
    ("winrate", "Operasional"),
]


def build_wordlist() -> pd.DataFrame:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows = [
        {
            "keyword": kw, "category": cat,
            "description": f"Kata kunci kategori {cat}",
            "is_active": True, "added_at": now, "added_by": "system",
        }
        for kw, cat in WORDLIST_SEED
    ]
    return pd.DataFrame(rows)


if __name__ == "__main__":
    judol_df = build_judol_dataset(RAW_JUDOL)
    safe_df = build_safe_dataset(RAW_SAFE)
    wordlist_df = build_wordlist()

    judol_df.to_csv("judol_dataset.csv", index=False)
    safe_df.to_csv("safe_dataset.csv", index=False)
    wordlist_df.to_csv("wordlist.csv", index=False)

    print(f"judol_dataset.csv : {len(judol_df)} baris")
    print(f"safe_dataset.csv  : {len(safe_df)} baris")
    print(f"wordlist.csv       : {len(wordlist_df)} baris ({wordlist_df['category'].nunique()} kategori)")
