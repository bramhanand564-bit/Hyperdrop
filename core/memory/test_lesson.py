from core.memory.lesson import compress_lesson


def test_lesson_is_compressed_and_bounded():
    lesson = compress_lesson(" Python ", "a   useful   fact", 1.2, ["s1"])
    assert lesson.topic == "Python"
    assert lesson.summary == "a useful fact"
    assert lesson.confidence == 1.0
    assert lesson.source_ids == ("s1",)
