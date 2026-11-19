#!/usr/bin/env python3
"""Corrige les slugs MaydAI Anthropic / OpenAI dans le CSV de correspondance EcoLogits."""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

FOURNISSEURS = ("anthropic", "openai")

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = REPO_ROOT / "tmp" / "ecologits-correspondance.csv"


def remediate_slug(provider: object, eco_name: object, current_slug: object) -> str:
    name = str(eco_name or "").strip().lower()
    slug = str(current_slug or "").strip()
    vendor = str(provider or "").strip().lower()

    if vendor == "anthropic":
        if "claude-opus-4-1" in name:
            return "claude-opus-4-1"
        if "claude-opus-4-5" in name:
            return "claude-opus-4-5"
        if "claude-sonnet-4-5" in name:
            return "claude-sonnet-4-5"
        return slug

    if vendor != "openai":
        return slug

    if "gpt-35" in name or "gpt-3.5" in name:
        return "gpt-3-5-turbo-instruct" if "instruct" in name else "gpt-3-5-turbo"

    if "gpt-5.1-codex" in name:
        return "gpt-5-1-codex"
    if "gpt-5.1" in name:
        return "gpt-5-1"
    if "gpt-5.4-pro" in name:
        return "gpt-5-4-pro"
    if "gpt-5.2" in name and "pro" not in name:
        return "gpt-5-2"
    if name.startswith("gpt-5-2025"):
        return "gpt-5"
    return slug


def apply_fixes(correspondance: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    editable = correspondance["eco_provider"].isin(FOURNISSEURS) & (
        correspondance["statut"] != "lie"
    )
    previous = correspondance.loc[editable, "maydai_slug"].fillna("").astype(str)
    updated = [
        remediate_slug(provider, eco_name, slug)
        for provider, eco_name, slug in zip(
            correspondance.loc[editable, "eco_provider"],
            correspondance.loc[editable, "eco_name"],
            previous,
        )
    ]
    correspondance = correspondance.copy()
    correspondance.loc[editable, "maydai_slug"] = updated

    changes = correspondance.loc[editable].loc[previous.to_numpy() != updated, [
        "eco_provider",
        "statut",
        "eco_name",
        "maydai_slug",
    ]].copy()
    changes.insert(3, "maydai_slug_avant", previous[previous.to_numpy() != updated].to_numpy())
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
    print(f"CSV mis à jour : {args.csv} ({len(changes)} slugs corrigés)")
    if not changes.empty:
        print(changes.to_string(index=False))


if __name__ == "__main__":
    main()
