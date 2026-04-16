"""Load job setup sections + fields from config/job_setup_flow.yml."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml


@lru_cache
def load_job_setup_catalog() -> list[dict[str, Any]]:
    root = Path(__file__).resolve().parents[2]
    path = root / "config" / "job_setup_flow.yml"
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    out: list[dict[str, Any]] = []
    for raw_section in data.get("sections") or []:
        if not isinstance(raw_section, dict):
            continue
        section_id = str(raw_section.get("id") or "").strip()
        label = str(raw_section.get("label") or "").strip()
        if not section_id or not label:
            continue

        fields_out: list[dict[str, str]] = []
        seen_field_ids: set[str] = set()
        for raw_field in raw_section.get("fields") or []:
            if not isinstance(raw_field, dict):
                continue
            field_id = str(raw_field.get("id") or "").strip()
            field_label = str(raw_field.get("label") or "").strip()
            if not field_id or not field_label or field_id in seen_field_ids:
                continue
            seen_field_ids.add(field_id)
            fields_out.append({"id": field_id, "label": field_label})

        if not fields_out:
            fields_out = [{"id": "main", "label": "Main"}]

        out.append({"id": section_id, "label": label, "fields": fields_out})

    return out


def job_setup_section_ids() -> list[str]:
    return [row["id"] for row in load_job_setup_catalog()]


def job_setup_fields_by_section() -> dict[str, list[str]]:
    return {row["id"]: [field["id"] for field in row.get("fields", [])] for row in load_job_setup_catalog()}
