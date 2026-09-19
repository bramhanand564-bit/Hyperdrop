"""Small, dependency-free web page reader for research.

It extracts visible text from HTML and keeps a bounded amount of content so a
small local model does not receive an entire page unnecessarily.
"""
import re
from html import unescape
from urllib.request import Request, urlopen


def read_page(url: str, *, max_chars: int = 12000, timeout: int = 15) -> str:
    if not url.strip():
        raise ValueError("url cannot be empty")
    request = Request(url, headers={"User-Agent": "HyperdropResearch/0.1"})
    with urlopen(request, timeout=timeout) as response:
        raw = response.read(max_chars * 2).decode("utf-8", errors="ignore")

    raw = re.sub(r"<(script|style|noscript)[^>]*>.*?</\1>", " ", raw, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", raw)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]
