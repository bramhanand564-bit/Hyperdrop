"""Research pipeline: discover -> read -> score evidence -> select usable claims."""
from dataclasses import dataclass

from core.contracts.evidence import Evidence
from core.research.evidence_builder import results_to_evidence
from core.research.engine import ResearchEngine
from core.research.page_reader import read_page
from core.verification.verifier import verify_evidence


@dataclass(frozen=True)
class VerifiedResearch:
    query: str
    evidence: tuple[Evidence, ...]


class VerifiedResearchEngine:
    def __init__(self, research_engine: ResearchEngine):
        self.research_engine = research_engine

    def run(self, task_id: str, query: str, limit: int = 5) -> VerifiedResearch:
        response = self.research_engine.run(query, limit=limit)
        raw = results_to_evidence(task_id, response.results)
        checked = []
        for item in raw:
            # Discovery gets a conservative base score. Reading the page proves
            # availability, not truth; final reliability remains explicit.
            try:
                page = read_page(item.source)
                claim = page[:2000] if page else item.claim
            except Exception:
                claim = item.claim
            checked.append(verify_evidence(
                Evidence(
                    id=item.id,
                    task_id=item.task_id,
                    source=item.source,
                    claim=claim,
                    note=item.note,
                    source_type=item.source_type,
                    reliability=0.6,
                    verified=False,
                )
            ))
        return VerifiedResearch(query=query.strip(), evidence=tuple(checked))
