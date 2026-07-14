"""crawler.py -- Web crawling & scraping konten situs (lapis ke-2 dari 3 lapis paralel)."""
import requests
from bs4 import BeautifulSoup
from flask import current_app

GAMBLING_HINTS = ["slot", "togel", "judi", "casino", "poker", "bet", "jackpot", "gacor", "maxwin"]

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; JUDAS-Scanner/1.0; +https://judas.example/bot)"}


def crawl(url: str) -> dict:
    """Mengembalikan dict berisi status crawlStatus sesuai enum API Contract 4.2.1."""
    timeout = current_app.config.get("CRAWL_TIMEOUT", 8)
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
    except requests.exceptions.SSLError:
        return {"status": "ssl_failed", "gambling_content_hit": False}
    except requests.exceptions.ConnectionError as e:
        if "Name or service not known" in str(e) or "getaddrinfo failed" in str(e):
            return {"status": "dns_failed", "gambling_content_hit": False}
        return {"status": "connection_refused", "gambling_content_hit": False}
    except requests.exceptions.Timeout:
        return {"status": "timeout", "gambling_content_hit": False}
    except requests.exceptions.RequestException:
        return {"status": "fallback", "gambling_content_hit": False}

    if resp.status_code == 403:
        return {"status": "blocked_403", "gambling_content_hit": False}
    if resp.status_code == 404:
        return {"status": "not_found_404", "gambling_content_hit": False}
    if resp.status_code >= 400:
        return {"status": "fallback", "gambling_content_hit": False}

    try:
        soup = BeautifulSoup(resp.text, "html.parser")
        text = soup.get_text(" ", strip=True).lower()
        title = (soup.title.string if soup.title else "").lower()
        hit = any(kw in text or kw in title for kw in GAMBLING_HINTS)
        return {"status": "success", "gambling_content_hit": hit}
    except Exception:
        return {"status": "fallback", "gambling_content_hit": False}
