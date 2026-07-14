# JUDAS Backend — Judol Domain Scanner

Backend Flask untuk sistem deteksi domain judi online JUDAS, sesuai
**API Contract v3.6**, **BRD**, dan **FSD** proyek Cybersecurity JUDAS
(Program Studi Informatika, President University).

Panduan instalasi & konfigurasi lengkap ada di
**`JUDAS_Buku_Panduan_Lengkap.md`** (root proyek, satu tingkat di atas folder ini).
Baca dokumen itu dulu sebelum menjalankan apa pun di bawah ini.

## Ringkasan cepat

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # lalu isi DATABASE_URL dsb.

# Buat tabel & isi data awal
python scripts/init_db.py
python scripts/seed_admin.py
python scripts/import_dataset_to_db.py

# (opsional) retrain model dari data terbaru di PostgreSQL/CSV
python train_model.py

# Jalankan server
python app.py
```

- API berjalan di `http://localhost:5000/api/v1`
- Swagger UI: `http://localhost:5000/apidocs/`

## Struktur folder

```
JUDAS_Backend/
├── app.py                     Entry point Flask
├── config.py                  Semua konfigurasi (.env)
├── requirements.txt
├── .env.example
├── train_model.py             Training/retraining Random Forest
├── database/
│   ├── extensions.py          db, jwt, limiter, cors, swagger
│   └── schema.sql             DDL manual (opsional, alternatif init_db.py)
├── models/                    8 model SQLAlchemy (1 tabel per file)
├── routes/                    9 blueprint = 25 endpoint API Contract
├── services/                  ml_service, crawler, whois_service, lexical_service
├── utils/                     feature_extractor, response, auth_helpers, ssrf_protection
├── dataset/
│   ├── build_datasets.py      Membangun 3 CSV dari raw_source/*.xlsx
│   ├── raw_source/            xlsx asli (judol_domains, safe_domains)
│   ├── judol_dataset.csv      29.614 baris (SUDAH di-generate)
│   ├── safe_dataset.csv       60.188 baris (SUDAH di-generate)
│   └── wordlist.csv           55 kata kunci / 8 kategori (SUDAH di-generate)
├── ml_model/
│   ├── random_forest_model.joblib   Model hasil training NYATA (lihat metrics)
│   └── model_metrics.json           accuracy/precision/recall/f1 asli
└── scripts/
    ├── init_db.py              Buat semua tabel via SQLAlchemy
    ├── seed_admin.py            Buat akun admin pertama
    └── import_dataset_to_db.py  Impor 3 CSV ke 3 tabel PostgreSQL terpisah
```

## Hasil training nyata (v2: fitur leksikal + TF-IDF character n-gram + Random Forest)

Dijalankan pada 89.775 baris unik (29.614 judol + 60.161 aman setelah
dedup domain yang tumpang tindih antara kedua sumber) dengan fitur
leksikal + TF-IDF character n-gram (3-5) dari nama domain (lihat Bab 13
buku panduan untuk penjelasan lengkap peningkatan ini):

| Metrik    | v1 (leksikal saja) | v2 (+ TF-IDF char n-gram) |
|-----------|---------------------|----------------------------|
| Accuracy  | 0.7645 | **0.8366** |
| Precision | 0.6280 | **0.7607** |
| Recall    | 0.7017 | **0.7363** |
| F1-Score  | 0.6628 | **0.7483** |

Angka v2 ini APA ADANYA dari hasil `python train_model.py` yang sungguh
dijalankan ulang setelah menambahkan fitur character n-gram — bukan
simulasi. File model naik dari ~6.3 MB menjadi ~7.8 MB (masih wajar untuk
disimpan di Git).
