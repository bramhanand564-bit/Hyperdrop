"""End-to-end research -> verification -> answer -> lesson preparation."""
from dataclasses import dataclass

from core.memory.lesson import Lesson, compress_lesson
from core.mind.answer_builder import AnswerDraft, build_answer
from core.research.verified_research import VerifiedResearchEngine
from core.verification.contradictions import ContradictionReport, detect_contradictions


@dataclass(frozen=True)
class ResearchAnswer:
    draft: AnswerDraft
    contradictions: ContradictionReport
    lesson: Lesson | None


class ResearchAnswerPipeline:
    def __init__(self, verified_engine: VerifiedResearchEngine):
        self.verified_engine = verified_engine

    def run(self, task_id: str, query: str) -> ResearchAnswer:
        research = self.verified_engine.run(task_id, query)
        contradictions = detect_contradictions(research.evidence)

        if contradictions.conflicting:
            return ResearchAnswer(
                draft=AnswerDraft(
                    answer="मुझे स्रोतों में आपस में विरोध मिला है, इसलिए मैं इसे अभी निश्चित तथ्य की तरह नहीं बताऊँगा।",
                    sources=tuple(e.source for e in research.evidence),
                ),
                contradictions=contradictions,
                lesson=None,
            )

        draft = build_answer(query, research.evidence)
        lesson = None
        if draft.answer and research.evidence and any(e.verified for e in research.evidence):
            lesson = compress_lesson(
                topic=query,
                summary=draft.answer,
                confidence=max(e.reliability for e in research.evidence if e.verified),
                source_ids=tuple(e.id for e in research.evidence if e.verified),
            )
        return ResearchAnswer(draft=draft, contradictions=contradictions, lesson=lesson)
