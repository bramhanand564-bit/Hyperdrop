"""Fast conversational response policy for Hyperdrop.

The policy keeps user-facing conversation short while the system performs
research internally. Unknown information is a routing signal, not a reason
to make the user wait for a status message.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class ResponsePolicy:
    """Controls when research is exposed to the user."""

    acknowledge_research: bool = False
    max_preview_words: int = 18

    def pre_research_message(self, goal: str) -> str:
        if self.acknowledge_research:
            return "एक सेकंड, मैं इसे चेक कर रहा हूँ।"
        return ""

    def no_result_message(self) -> str:
        return "मुझे अभी भरोसेमंद जानकारी नहीं मिली।"

    def answer_prefix(self, researched: bool) -> str:
        return "" if researched else "मेरी उपलब्ध जानकारी के अनुसार, "
