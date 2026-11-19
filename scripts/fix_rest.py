#!/usr/bin/env python3
"""Corrige les slugs MaydAI restants (Mistral, Cohere, Phi-3, Databricks, Gemma)."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = REPO_ROOT / "tmp" / "ecologits-correspondance.csv"

SIZE_RE = re.compile(r"(?<![a-z0-9])(\d{1,3}b)(?![a-z0-9])", re.IGNORECASE)


def as_text(value: object) -> str:
    text = str(value or "").strip()
    if not text or text.lower() in {"nan", "none"}:
        return ""
    return text


def proposed_slug(eco_name: object) -> str | None:
    name = as_text(eco_name)
    if not name:
        return None
    lowered = name.lower().replace("_", "-")

    if "8x22b" in lowered:
        return "mixtral-8x22b"
    if "8x7b" in lowered:
        return "mixtral-8x7b"
    if "mathstral" in lowered:
        return "mathstral-7b"
    if "voxtral-mini" in lowered:
        return "voxtral-mini"
    if "voxtral-small" in lowered:
        return "voxtral-small"
    if "magistral-small" in lowered:
        return "magistral-small"
    if "magistral-medium" in lowered:
        return "magistral-medium"
    if "devstral-medium" in lowered:
        return "devstral-medium"
    if "mistral-tiny" in lowered:
        return "mistral-tiny"
    if "ministral-3b" in lowered:
        return "ministral-3b"
    if "ministral-8b" in lowered:
        return "ministral-8b"
    if "ministral-14b" in lowered:
        return "ministral-14b"
    if "mistral-large" in lowered:
        return "mistral-large"
    if "mistral-medium" in lowered:
        return "mistral-medium"
    if "mistral-small" in lowered:
        return "mistral-small"

    if "aya-23-35" in lowered:
        return "aya-23-35b"
    if "aya-23-8" in lowered:
        return "aya-23-8b"
    if "aya-vision-32b" in lowered:
        return "aya-vision-32b"
    if "aya-expanse-32b" in lowered:
        return "aya-expanse-32b"

    if "phi-3-mini" in lowered:
        return "phi-3-mini"
    if "phi-3-small" in lowered:
        return "phi-3-small"
    if "phi-3-medium" in lowered:
        return "phi-3-medium"
    if "phi-3-vision" in lowered:
        return "phi-3-vision"
    if "dbrx" in lowered:
        return "dbrx-instruct"
    if "dolly-v2" in lowered:
        match = SIZE_RE.search(lowered)
        if match:
            return f"dolly-v2-{match.group(1).lower()}"
        return "dolly-v2"

    if "codegemma" in lowered:
        if "2b" in lowered:
            return "codegemma-2b"
        if "7b" in lowered:
            return "codegemma-7b"
    if "gemma-1.1-2b" in lowered or "gemma-1-1-2b" in lowered:
        return "gemma-1-1-2b"
    if "gemma-1.1-7b" in lowered or "gemma-1-1-7b" in lowered:
        return "gemma-1-1-7b"
    if "gemma-2-2b" in lowered:
        return "gemma-2-2b"
    if "gemma-2b" in lowered and "1.1" not in lowered and "2-" not in lowered:
        return "gemma-2b"
    if "gemma-7b" in lowered and "1.1" not in lowered and "codegemma" not in lowered:
        return "gemma-7b"
    return None


def apply_fixes(correspondance: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    editable = correspondance["statut"] != "lie"
    previous_slugs = correspondance.loc[editable, "maydai_slug"].map(as_text)
    previous_statuts = correspondance.loc[editable, "statut"].map(as_text)
    names = correspondance.loc[editable, "eco_name"]

    new_slugs: list[str] = []
    new_statuts: list[str] = []
    changed_mask: list[bool] = []
    for name, slug, statut in zip(names, previous_slugs, previous_statuts):
        proposed = proposed_slug(name)
        if proposed is None:
            new_slugs.append(slug)
            new_statuts.append(statut)
            changed_mask.append(False)
            continue
        new_slugs.append(proposed)
        new_statuts.append("proposition")
        changed_mask.append(proposed != slug or statut != "proposition")

    correspondance = correspondance.copy()
    correspondance.loc[editable, "maydai_slug"] = new_slugs
    correspondance.loc[editable, "statut"] = new_statuts

    changes = correspondance.loc[editable].loc[changed_mask, ["eco_provider", "statut", "eco_name", "maydai_slug"]].copy()
    changes.insert(3, "maydai_slug_avant", previous_slugs.to_numpy()[changed_mask])
    return correspondance, changes.reset_index(drop=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    correspondance = pd.read_csv(args.csv, encoding="utf-8-sig")
    updated, changes = apply_fixes(correspondance)
    updated.to_csv(args.csv, index=False)
    print(f"CSV mis à jour : {args.csv}")
    print(f"Lignes corrigées : {len(changes)}")
    if not changes.empty:
        print(changes.to_string(index=False))


if __name__ == "__main__":
    main()
