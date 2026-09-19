"""V0.1 evidence contract used by HyperResearch and HyperVerify."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Evidence:
    id: str
    task_id: str
    source: str
    claim: str
    note: str = ""
    source_type: str = "web"
    reliability: float = 0.0
    verified: bool = False
