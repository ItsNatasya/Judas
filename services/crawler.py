"""crawler.py -- Web crawling & scraping konten situs (lapis ke-2 dari 3 lapis paralel).

CATATAN (Juli 2026): sebelumnya fungsi ini HANYA membaca teks visible +
title halaman utama (soup.get_text()). Ini tidak menangkap kasus situs
yang domainnya sendiri bersih tapi DISUSUPI konten judol lewat:
  - iframe pihak ketiga (pop-up/redirect judol yang disuntik lewat iklan
    atau situs yang di-hack, sangat umum di situs WordPress lama)
  - <script src=...> dari domain iklan/tracker yang dikenal terkait judol
  - meta refresh / window.location redirect ke domain lain

Sekarang ditambahkan pengecekan terpisah untuk ketiganya, dilaporkan
sebagai field baru (embedded_gambling_hit, dst.) supaya BEDA dari
gambling_content_hit (konten halaman utama) -- keduanya sinyal yang
beda maknanya: satu berarti "situs ini SENDIRI adalah situs judol",
yang lain berarti "situs ini kemungkinan disusupi/memuat iklan judol
pihak ketiga", meski tindakan yang disarankan sama (waspada)."""
import re
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from flask import current_app

GAMBLING_HINTS = ["slot", "togel", "judi", "casino", "poker", "bet", "jackpot", "gacor", "maxwin"]

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; JUDAS-Scanner/1.0; +https://judas.example/bot)"}

MAX_IFRAMES_CHECKED = 5  # batasi supaya tidak lambat -- iframe pertama biasanya yang paling relevan
IFRAME_FETCH_TIMEOUT = 4  # timeout lebih pendek dari request utama, ini cuma pengecekan tambahan


def _hostname(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def _text_has_gambling_hint(text: str) -> bool:
    text = text.lower()
    return any(kw in text for kw in GAMBLING_HINTS)


def _check_embedded_iframes(soup: BeautifulSoup, base_url: str, session: requests.Session) -> tuple[bool, list[str]]:
    """Cek iframe yang di-embed di halaman -- pop-up/redirect judol sering
    disuntik lewat iframe dari domain lain (bukan konten halaman itu sendiri).
    Mengembalikan (ditemukan_atau_tidak, daftar_src_yang_mencurigakan)."""
    base_host = _hostname(base_url)
    iframes = soup.find_all("iframe", src=True)[:MAX_IFRAMES_CHECKED]
    suspicious_srcs = []

    for iframe in iframes:
        src = iframe.get("src", "").strip()
        if not src or src.startswith("javascript:") or src.startswith("data:"):
            continue
        full_src = urljoin(base_url, src)

        # Cek 1: src iframe itu sendiri mengandung keyword judol (paling murah, tanpa network call)
        if _text_has_gambling_hint(src):
            suspicious_srcs.append(full_src)
            continue

        # Cek 2: iframe dari domain PIHAK KETIGA (bukan domain sendiri) --
        # ambil isinya untuk cek kontennya (biaya network call, dibatasi
        # MAX_IFRAMES_CHECKED supaya tidak memperlambat scan secara signifikan)
        iframe_host = _hostname(full_src)
        if iframe_host and iframe_host != base_host:
            try:
                resp = session.get(full_src, headers=HEADERS, timeout=IFRAME_FETCH_TIMEOUT)
                if resp.status_code < 400 and _text_has_gambling_hint(resp.text[:20000]):
                    suspicious_srcs.append(full_src)
            except requests.exceptions.RequestException:
                continue  # iframe pihak ketiga gagal diakses -- bukan berarti aman, tapi kita tidak menebak

    return (len(suspicious_srcs) > 0, suspicious_srcs)


def _check_embedded_scripts(soup: BeautifulSoup, base_url: str) -> tuple[bool, list[str]]:
    """Cek <script src=...> dari domain pihak ketiga yang nama filenya
    mengandung keyword judol -- pola umum untuk script iklan/redirect
    judol yang disisipkan (mis. lewat plugin CMS yang di-hack). Ini
    HANYA cek nama file/URL script, TIDAK mengeksekusi/membaca isi
    script (menjalankan JS pihak ketiga berisiko dan di luar scope
    crawler statis ini)."""
    base_host = _hostname(base_url)
    suspicious = []
    for script in soup.find_all("script", src=True):
        src = script.get("src", "").strip()
        if not src:
            continue
        full_src = urljoin(base_url, src)
        script_host = _hostname(full_src)
        if script_host and script_host != base_host and _text_has_gambling_hint(src):
            suspicious.append(full_src)
    return (len(suspicious) > 0, suspicious)


def _check_meta_redirect(soup: BeautifulSoup, base_url: str, session: requests.Session) -> tuple[bool, str | None]:
    """Cek <meta http-equiv="refresh"> yang mengarahkan ke domain lain --
    pola umum untuk halaman "gerbang" yang tampak normal tapi langsung
    redirect ke situs judol. requests dengan allow_redirects=True SUDAH
    menangani redirect HTTP 3xx biasa, tapi TIDAK menangani meta-refresh
    (itu redirect di level HTML, bukan HTTP header)."""
    meta = soup.find("meta", attrs={"http-equiv": re.compile("refresh", re.I)})
    if not meta or not meta.get("content"):
        return (False, None)
    content = meta["content"]
    match = re.search(r"url\s*=\s*['\"]?([^'\";]+)", content, re.I)
    if not match:
        return (False, None)
    target = urljoin(base_url, match.group(1).strip())
    target_host = _hostname(target)
    base_host = _hostname(base_url)
    if target_host and target_host != base_host:
        try:
            resp = session.get(target, headers=HEADERS, timeout=IFRAME_FETCH_TIMEOUT)
            if resp.status_code < 400 and _text_has_gambling_hint(resp.text[:20000]):
                return (True, target)
        except requests.exceptions.RequestException:
            pass
    return (False, target if target_host != base_host else None)


def crawl(url: str) -> dict:
    """Mengembalikan dict berisi status crawlStatus sesuai enum API Contract 4.2.1."""
    timeout = current_app.config.get("CRAWL_TIMEOUT", 8)
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
    except requests.exceptions.SSLError:
        return {"status": "ssl_failed", "gambling_content_hit": False, "embedded_gambling_hit": False, "embedded_sources": []}
    except requests.exceptions.ConnectionError as e:
        if "Name or service not known" in str(e) or "getaddrinfo failed" in str(e):
            return {"status": "dns_failed", "gambling_content_hit": False, "embedded_gambling_hit": False, "embedded_sources": []}
        return {"status": "connection_refused", "gambling_content_hit": False, "embedded_gambling_hit": False, "embedded_sources": []}
    except requests.exceptions.Timeout:
        return {"status": "timeout", "gambling_content_hit": False, "embedded_gambling_hit": False, "embedded_sources": []}
    except requests.exceptions.RequestException:
        return {"status": "fallback", "gambling_content_hit": False, "embedded_gambling_hit": False, "embedded_sources": []}

    if resp.status_code == 403:
        return {"status": "blocked_403", "gambling_content_hit": False, "embedded_gambling_hit": False, "embedded_sources": []}
    if resp.status_code == 404:
        return {"status": "not_found_404", "gambling_content_hit": False, "embedded_gambling_hit": False, "embedded_sources": []}
    if resp.status_code >= 400:
        return {"status": "fallback", "gambling_content_hit": False, "embedded_gambling_hit": False, "embedded_sources": []}

    try:
        soup = BeautifulSoup(resp.text, "html.parser")
        text = soup.get_text(" ", strip=True).lower()
        title = (soup.title.string if soup.title else "").lower()
        hit = any(kw in text or kw in title for kw in GAMBLING_HINTS)

        # Lapis tambahan: cek apakah situs ini SENDIRI bersih tapi
        # DISUSUPI konten judol pihak ketiga (iframe/script/redirect).
        # Dilaporkan terpisah dari `gambling_content_hit` supaya beda
        # makna: gambling_content_hit = "situs ini SENDIRI situs judol",
        # embedded_gambling_hit = "situs ini kemungkinan disusupi iklan/
        # pop-up judol pihak ketiga" -- keduanya perlu ditampilkan beda
        # di UI (mis. label "Terindikasi Judol" vs "Terindikasi Disusupi
        # Iklan Judol") supaya tidak menuduh pemilik situs asli.
        session = requests.Session()
        iframe_hit, iframe_srcs = _check_embedded_iframes(soup, url, session)
        script_hit, script_srcs = _check_embedded_scripts(soup, url)
        redirect_hit, redirect_target = _check_meta_redirect(soup, url, session)

        embedded_hit = iframe_hit or script_hit or redirect_hit
        embedded_sources = iframe_srcs + script_srcs + ([redirect_target] if redirect_hit and redirect_target else [])

        return {
            "status": "success",
            "gambling_content_hit": hit,
            "embedded_gambling_hit": embedded_hit,
            "embedded_sources": embedded_sources[:5],  # batasi supaya response tidak membengkak
        }
    except Exception:
        return {"status": "fallback", "gambling_content_hit": False, "embedded_gambling_hit": False, "embedded_sources": []}
