"""Safe provider boundary for public HTTP pages; no login or browser-control claims."""
from dataclasses import dataclass
from urllib.parse import urlparse
from urllib.request import Request, urlopen

@dataclass(frozen=True)
class PageResponse:
    url: str
    status: int
    content_type: str
    body: str

class PublicHttpProvider:
    def __init__(self, timeout: float = 10.0, max_bytes: int = 1_000_000):
        self.timeout, self.max_bytes = timeout, max_bytes

    def fetch(self, url: str) -> PageResponse:
        parsed=urlparse(url)
        if parsed.scheme not in {"http","https"} or not parsed.netloc:
            raise ValueError("only absolute http(s) URLs are allowed")
        req=Request(url,headers={"User-Agent":"Hyperdrop/0.2"})
        with urlopen(req, timeout=self.timeout) as response:
            body=response.read(self.max_bytes).decode("utf-8","replace")
            return PageResponse(response.geturl(), response.status, response.headers.get("Content-Type",""), body)
