from core.memory.decay import decay, should_archive
from core.memory.lesson import Lesson

def test_unused_memory_decays():
    assert decay(Lesson("x", "fact", .9), unused_cycles=2).confidence == .8

def test_weak_unused_memory_can_archive():
    assert should_archive(Lesson("x", "fact", .4)) is True
