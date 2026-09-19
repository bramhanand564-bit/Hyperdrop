from core.research.page_reader import read_page


class FakeResponse:
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass
    def read(self, size=-1):
        return b"<html><script>x</script><body>Hello <b>world</b></body></html>"


def test_page_reader_extracts_visible_text(monkeypatch):
    monkeypatch.setattr("core.research.page_reader.urlopen", lambda *a, **k: FakeResponse())
    assert read_page("https://example.com") == "Hello world"
