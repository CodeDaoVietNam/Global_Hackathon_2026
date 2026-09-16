"""Evidence repository protocol for hybrid retrieval."""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class EvidenceRepositoryProtocol(Protocol):
    def eligible_cards(self) -> list[dict]:
        """Return cards eligible for retrieval (synthetic seeds and approved versions only)."""
        ...
