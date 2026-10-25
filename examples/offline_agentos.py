"""Real Agno 2.5.9 agents; deterministic model adapter, no external API calls.

This intentionally tiny synthetic document extractor is a protocol demonstration,
not an OCR implementation or a claim about any language model's quality.
"""
import asyncio
import json
import re
from dataclasses import dataclass
from typing import Any

from agno.agent import Agent
from agno.db.sqlite import SqliteDb
from agno.models.base import Model
from agno.models.response import ModelResponse
from agno.os import AgentOS
from fastapi.middleware.cors import CORSMiddleware


def extract_invoice(document: str) -> str:
    """Extract synthetic invoice fields, leaving currency unnormalized."""
    invoice = re.search(r"Invoice (INV-\d+)", document)
    amount = re.search(r"Total [^\d]*(\d+\.\d+)", document)
    currency = re.search(r"Currency ([A-Z]{3})", document)
    if not invoice or not amount or not currency:
        raise ValueError("Expected the documented synthetic invoice format")
    return json.dumps({"invoice_id": invoice[1], "total": float(amount[1]), "currency_raw": currency[1]})


def normalize_currency(extraction: str) -> str:
    """Normalize the raw currency into the required ISO currency field."""
    value = json.loads(extraction)
    value["currency"] = value.pop("currency_raw")
    return json.dumps(value)


@dataclass
class OfflineInvoiceModel(Model):
    id: str = "runduel-deterministic-v1"
    name: str = "RunDuel deterministic fixture model"
    provider: str = "offline-fixture"
    normalize: bool = True

    def next_response(self, messages) -> ModelResponse:
        user = next((m.content for m in reversed(messages) if m.role == "user"), "")
        tool_messages = [m for m in messages if m.role == "tool"]
        if not tool_messages:
            name, args = "extract_invoice", {"document": str(user)}
        elif self.normalize and len(tool_messages) == 1:
            name, args = "normalize_currency", {"extraction": str(tool_messages[-1].content)}
        else:
            result = json.loads(tool_messages[-1].content)
            # Intentional regression: drop the raw field without normalizing it.
            result.pop("currency_raw", None)
            return ModelResponse(role="assistant", content=json.dumps(result))
        return ModelResponse(role="assistant", tool_calls=[{
            "id": f"offline-{len(tool_messages) + 1}", "type": "function",
            "function": {"name": name, "arguments": json.dumps(args)}
        }])

    def invoke(self, messages, **kwargs):
        return self.next_response(messages)

    async def ainvoke(self, messages, **kwargs):
        return self.next_response(messages)

    def invoke_stream(self, messages, **kwargs):
        response = self.next_response(messages)
        if response.tool_calls:
            yield response
        else:
            for chunk in re.findall(r".{1,12}", response.content):
                yield ModelResponse(role="assistant", content=chunk)

    async def ainvoke_stream(self, messages, **kwargs):
        for item in self.invoke_stream(messages, **kwargs):
            await asyncio.sleep(0.03)
            yield item

    def _parse_provider_response(self, response: Any, **kwargs):
        return response

    def _parse_provider_response_delta(self, response: Any):
        return response


db = SqliteDb(db_file=".tmp/offline-agentos.db")
agents = [Agent(
    id=f"extractor-{label}", name=f"Invoice extractor ({label})",
    model=OfflineInvoiceModel(normalize=normalize),
    tools=[extract_invoice, normalize_currency], db=db,
    markdown=False, telemetry=False,
) for label, normalize in [("baseline", True), ("regressed", False)]]
app = AgentOS(agents=agents).get_app()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3107", "http://127.0.0.1:3107"], allow_methods=["*"], allow_headers=["*"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=7777)
