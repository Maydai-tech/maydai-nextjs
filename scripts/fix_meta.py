#!/usr/bin/env python3
"""Corrige les slugs MaydAI CodeLlama / Llama-Guard dans le CSV EcoLogits."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = REPO_ROOT / "tmp" / "ecologits-correspondance.csv"

SIZE_RE = re.compile(r"(?<![a-z0-9])(\d{1,3}b)(?![a-z0-9])", re.IGNORECASE)
CODELLAMA_RE = re.compile(r"codellama|code-llama", re.IGNORECASE)
GUARD_SCOPE_RE = re.compile(r"llama|guard", re.IGNORECASE)


def as_text(value: object) -> str:
    text = str(value or "").strip()
    if not text or text.lower() in {"nan", "none"}:
        return ""
    return text


def code_llama_slug(name: str) -> str:
    match = SIZE_RE.search(name)
    if match:
        return f"code-llama-{match.group(1).lower()}"
    return "code-llama"


def llama_guard_slug(name: str) -> str | None:
    lowered = name.lower().replace("_", "-")
    if "prompt-guard" in lowered:
        return "prompt-guard-86m"
    if "llama-guard-3-8b" in lowered:
        return "llama-guard-3-8b"
    if "llama-guard-2-8b" in lowered or "meta-llama-guard-2-8b" in lowered:
        return "llama-guard-2-8b"
    compact = lowered.replace("-", "")
    if "llamaguard-7b" in lowered or "llamaguard7b" in compact:
        return "llama-guard-1-7b"
    return None


def remediate(eco_name: object, current_slug: object, current_statut: object) -> tuple[str, str]:
    name = as_text(eco_name)
    slug = as_text(current_slug)
    statut = as_text(current_statut)

    if CODELLAMA_RE.search(name.replace("-", "")) or CODELLAMA_RE.search(name):
        return code_llama_slug(name), "proposition"

    guard_slug = llama_guard_slug(name)
    if guard_slug:
        return guard_slug, "proposition"
    return slug, statut


def apply_fixes(correspondance: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    names = correspondance["eco_name"].fillna("").astype(str)
    editable = (
        (correspondance["eco_provider"] == "huggingface_hub")
        & names.str.contains(GUARD_SCOPE_RE)
        & (correspondance["statut"] != "lie")
    )

    previous_slugs = correspondance.loc[editable, "maydai_slug"].map(as_text)
    previous_statuts = correspondance.loc[editable, "statut"].map(as_text)
    updated = [
        remediate(eco_name, slug, statut)
        for eco_name, slug, statut in zip(
            correspondance.loc[editable, "eco_name"],
            previous_slugs,
            previous_statuts,
        )
    ]
    new_slugs = [row[0] for row in updated]
    new_statuts = [row[1] for row in updated]

    correspondance = correspondance.copy()
    correspondance.loc[editable, "maydai_slug"] = new_slugs
    correspondance.loc[editable, "statut"] = new_statuts

    changed = (previous_slugs.to_numpy() != new_slugs) | (previous_statuts.to_numpy() != new_statuts)
    changes = correspondance.loc[editable].loc[changed, ["eco_provider", "statut", "eco_name", "maydai_slug"]].copy()
    changes.insert(3, "maydai_slug_avant", previous_slugs[changed].to_numpy())
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
    print(f"CSV mis à jour : {args.csv} ({len(changes)} lignes corrigées)")
    if not changes.empty:
        print(changes.to_string(index=False))


if __name__ == "__main__":
    main()
