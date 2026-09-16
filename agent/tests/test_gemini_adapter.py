from pydantic import BaseModel

from contextcue_agent.gemini import GeminiStructuredModel


class Output(BaseModel):
    answer: str


class FakeRunnable:
    def __init__(self):
        self.messages = None

    def invoke(self, messages):
        self.messages = messages
        return Output(answer="grounded")


class RetryRunnable(FakeRunnable):
    def __init__(self):
        super().__init__(); self.calls = 0
    def invoke(self, messages):
        self.calls += 1
        if self.calls == 1: return {"wrong": "shape"}
        return Output(answer="recovered")


class FakeChat:
    def __init__(self):
        self.schema = None
        self.method = None
        self.runnable = FakeRunnable()

    def with_structured_output(self, schema, method):
        self.schema = schema
        self.method = method
        return self.runnable


def test_gemini_adapter_uses_native_json_schema_without_secret_in_payload():
    chat = FakeChat()
    model = GeminiStructuredModel(chat=chat)

    result = model.invoke(Output, "interpret_context", {"situation": "A teammate said okay."})

    assert result.answer == "grounded"
    assert chat.schema is Output
    assert chat.method == "json_schema"
    serialized = str(chat.runnable.messages).lower()
    assert "api_key" not in serialized
    assert "test-secret" not in serialized


def test_gemini_adapter_retries_one_invalid_structured_result():
    chat = FakeChat(); chat.runnable = RetryRunnable()
    result = GeminiStructuredModel(chat=chat).invoke(Output, "interpret_context", {"situation": "data"})
    assert result.answer == "recovered"
    assert chat.runnable.calls == 2
