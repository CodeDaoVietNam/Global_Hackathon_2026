from dataclasses import dataclass
from pathlib import Path
from typing import Protocol, TypeVar

from pydantic import BaseModel


T = TypeVar("T", bound=BaseModel)


class StructuredModel(Protocol):
    def invoke(self, schema: type[T], task: str, payload: dict) -> T: ...


class Embedder(Protocol):
    def embed_query(self, text: str) -> list[float]: ...

    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...


@dataclass(frozen=True)
class RuntimeContext:
    cards_path: Path
    model: StructuredModel | None = None
    embedder: Embedder | None = None

