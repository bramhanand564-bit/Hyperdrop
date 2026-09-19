from core.agent.checkpoint import Checkpoint, CheckpointStore


def test_checkpoint_save_and_resume(tmp_path):
    store = CheckpointStore(str(tmp_path / "c.json"))
    store.save(Checkpoint("t1", "research", "researching", .4, {"query": "x"}))
    item = store.load("t1")
    assert item.step == "research"
    assert item.progress == .4
