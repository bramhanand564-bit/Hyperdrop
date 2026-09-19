from core.agent.checkpoint_v2 import ResumeState,ResumeStore

def test_resume_state_round_trip(tmp_path):
    s=ResumeStore(str(tmp_path/"resume.json"))
    s.save(ResumeState("t1",2,"research",.5,{"q":"x"}))
    assert s.load("t1").step=="research"
