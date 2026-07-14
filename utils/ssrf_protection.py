import ipaddress
import socket
from urllib.parse import urlparse

# Rentang IP privat/lokal yang diblokir (SSRF protection) -- API Contract 2.2 (responseCode 14)
PRIVATE_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
]


def is_url_format_valid(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False
    if len(url) > 2048:
        return False
    return url.strip().lower().startswith(("http://", "https://"))


def is_safe_url(url: str) -> bool:
    """Mengembalikan False jika hostname mengarah ke IP privat/loopback (SSRF)."""
    try:
        hostname = urlparse(url).hostname
        if not hostname:
            return False
        infos = socket.getaddrinfo(hostname, None)
        for info in infos:
            ip = ipaddress.ip_address(info[4][0])
            if any(ip in net for net in PRIVATE_NETWORKS):
                return False
        return True
    except (socket.gaierror, ValueError):
        # Tidak bisa resolve -- biarkan proses lanjut, crawler yang akan menandai gagal (dns_failed)
        return True
