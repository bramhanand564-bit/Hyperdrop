"""Convert search results into explicit Evidence records."""
from core.contracts.evidence import Evidence
from core.research.provider import SearchResult


def results_to_evidence(task_id: str, results: list[SearchResult] | tuple[SearchResult, ...]) -> list[Evidence]:
    evidence = []
    for index, result in enumerate(results, start=1):
        evidence.append(
            Evidence(
                id=f"{task_id}:web:{index}",
                task_id=task_id,
                source=result.url,
                claim=result.snippet or result.title,
                note=result.title,
                source_type="web",
                reliability=0.0,
                verified=False,
            )
        )
    return evidence
