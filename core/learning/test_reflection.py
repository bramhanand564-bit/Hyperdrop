from core.learning.reflection import reflect


def test_reflection():
    item = reflect("t1", "success", "Use source verification", True)
    assert item.reusable is True
