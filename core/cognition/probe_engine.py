"""Generate diverse cognitive-training probes without requiring a teacher model."""
from __future__ import annotations
import json, random
from dataclasses import asdict, dataclass
from pathlib import Path

@dataclass(frozen=True)
class CognitiveProbe:
    question:str
    category:str
    difficulty:int
    expected_focus:tuple[str,...]

TEMPLATES={
 "knowledge_gap":["I need to understand {topic}, but I don't know where to start.","What should an agent do when it cannot reliably answer {topic}?"],
 "compression":["Imagine {topic} is a 100-page book. How should its core meaning be explained briefly?","What information from a long explanation about {topic} should be retained?"],
 "decision":["There are several ways to approach {topic}. How should the agent choose the next step?","What should be considered before acting on {topic}?"] ,
 "verification":["Two sources disagree about {topic}. What should the agent do?","How should an agent decide whether information about {topic} is trustworthy?"],
 "self_correction":["An earlier answer about {topic} may be wrong. How should the agent reassess it?","What should happen when new evidence conflicts with a previous belief about {topic}?"],
 "intent":["The user asks about {topic}, but what might they actually need to accomplish?","How should the agent distinguish the literal question from the user's underlying goal about {topic}?"]
}
FOCUS={"knowledge_gap":("intent","knowledge_gap","next_action"),"compression":("relevant_information","compression","response_strategy"),"decision":("context","next_action","self_correction"),"verification":("evidence_needed","relevant_information","self_correction"),"self_correction":("known","self_correction","response_strategy"),"intent":("intent","context","response_strategy")}

def generate(topics:list[str], per_category:int=2, seed:int=7)->list[CognitiveProbe]:
    rng=random.Random(seed); result=[]
    for topic in topics:
        for category,templates in TEMPLATES.items():
            chosen=list(templates); rng.shuffle(chosen)
            for template in chosen[:per_category]:
                difficulty=1 if category in {"intent","knowledge_gap"} else 2 if category in {"compression","verification"} else 3
                result.append(CognitiveProbe(template.format(topic=topic),category,difficulty,FOCUS[category]))
    return result

def write_jsonl(probes:list[CognitiveProbe],path:str)->int:
    p=Path(path); p.parent.mkdir(parents=True,exist_ok=True)
    with p.open("w",encoding="utf-8") as f:
        for probe in probes:f.write(json.dumps(asdict(probe),ensure_ascii=False)+"\n")
    return len(probes)
