#!/usr/bin/env python3
"""Ajoute statut_cycle_vie (OpenAI / Anthropic) au CSV de correspondance EcoLogits."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = REPO_ROOT / "tmp" / "ecologits-correspondance.csv"

# Snapshot API OpenAI au 2026-09-22 (85 identifiants EcoLogits).
# gpt-35-* : inférence depuis l’équivalent gpt-3.5-* ; Azure à confirmer.
OPENAI_API_STATUS: dict[str, str] = {
    "chat-latest": "Actif",
    "gpt-4.1": "Actif",
    "gpt-4.1-2025-04-14": "Actif",
    "gpt-4.1-mini": "Actif",
    "gpt-4.1-mini-2025-04-14": "Actif",
    "gpt-4o": "Actif",
    "gpt-4o-2024-08-06": "Actif",
    "gpt-4o-2024-11-20": "Actif",
    "gpt-4o-mini": "Actif",
    "gpt-4o-mini-2024-07-18": "Actif",
    "gpt-4o-mini-tts": "Actif",
    "gpt-4o-mini-tts-2025-03-20": "Actif",
    "gpt-4o-mini-tts-2025-12-15": "Actif",
    "gpt-5": "Actif",
    "gpt-5-mini": "Actif",
    "gpt-5-nano": "Actif",
    "gpt-5-pro": "Actif",
    "gpt-5-search-api": "Actif",
    "gpt-5-search-api-2025-10-14": "Actif",
    "gpt-5.1": "Actif",
    "gpt-5.1-2025-11-13": "Actif",
    "gpt-5.2": "Actif",
    "gpt-5.2-2025-12-11": "Actif",
    "gpt-5.2-pro": "Actif",
    "gpt-5.2-pro-2025-12-11": "Actif",
    "gpt-5.3-codex": "Actif",
    "gpt-5.4": "Actif",
    "gpt-5.4-2026-03-05": "Actif",
    "gpt-5.4-mini": "Actif",
    "gpt-5.4-mini-2026-03-17": "Actif",
    "gpt-5.4-nano": "Actif",
    "gpt-5.4-nano-2026-03-17": "Actif",
    "gpt-5.4-pro": "Actif",
    "gpt-5.4-pro-2026-03-05": "Actif",
    "gpt-5.5": "Actif",
    "gpt-5.5-2026-04-23": "Actif",
    "gpt-5.5-pro": "Actif",
    "gpt-5.5-pro-2026-04-23": "Actif",
    "gpt-3.5-turbo": "Déprécié",
    "gpt-3.5-turbo-0125": "Déprécié",
    "gpt-3.5-turbo-1106": "Déprécié",
    "gpt-3.5-turbo-instruct": "Déprécié",
    "gpt-35-turbo": "Déprécié",
    "gpt-35-turbo-0125": "Déprécié",
    "gpt-35-turbo-1106": "Déprécié",
    "gpt-35-turbo-instruct": "Déprécié",
    "gpt-4": "Déprécié",
    "gpt-4-0613": "Déprécié",
    "gpt-4-turbo": "Déprécié",
    "gpt-4-turbo-2024-04-09": "Déprécié",
    "gpt-4.1-nano": "Déprécié",
    "gpt-4.1-nano-2025-04-14": "Déprécié",
    "gpt-4o-2024-05-13": "Déprécié",
    "gpt-4o-mini-search-preview": "Déprécié",
    "gpt-4o-mini-transcribe": "Déprécié",
    "gpt-4o-mini-transcribe-2025-03-20": "Déprécié",
    "gpt-4o-mini-transcribe-2025-12-15": "Déprécié",
    "gpt-4o-search-preview": "Déprécié",
    "gpt-5-2025-08-07": "Déprécié",
    "gpt-5-mini-2025-08-07": "Déprécié",
    "gpt-5-nano-2025-08-07": "Déprécié",
    "gpt-5-pro-2025-10-06": "Déprécié",
    "o1": "Déprécié",
    "o1-2024-12-17": "Déprécié",
    "o3-mini": "Déprécié",
    "o3-mini-2025-01-31": "Déprécié",
    "o4-mini": "Déprécié",
    "o4-mini-2025-04-16": "Déprécié",
    "o4-mini-deep-research": "Déprécié",
    "gpt-3.5-turbo-16k": "Retiré",
    "gpt-3.5-turbo-instruct-0914": "Retiré",
    "gpt-35-turbo-16k": "Retiré",
    "gpt-35-turbo-instruct-0914": "Retiré",
    "gpt-4o-mini-search-preview-2025-03-11": "Retiré",
    "gpt-4o-search-preview-2025-03-11": "Retiré",
    "gpt-5-chat-latest": "Retiré",
    "gpt-5-codex": "Retiré",
    "gpt-5.1-chat-latest": "Retiré",
    "gpt-5.1-codex": "Retiré",
    "gpt-5.1-codex-max": "Retiré",
    "gpt-5.1-codex-mini": "Retiré",
    "gpt-5.2-chat-latest": "Retiré",
    "gpt-5.2-codex": "Retiré",
    "gpt-5.3-chat-latest": "Retiré",
    "o4-mini-deep-research-2025-06-26": "Retiré",
}

ANTHROPIC_RETIRED = ("claude-1", "claude-2", "claude-3-")
ANTHROPIC_DEPRECATED = ("claude-4-0", "claude-4-1", "-4-0", "-4-1")
ANTHROPIC_ACTIVE = ("claude-4-5", "claude-4-6", "claude-4-7", "claude-4-8", "-4-5", "-4-6", "-4-7", "-4-8")
ANTHROPIC_DATED_4_RE = re.compile(r"claude-[a-z0-9]+-4-\d{8}")


def contains_any(text: str, tokens: tuple[str, ...]) -> bool:
    return any(token in text for token in tokens)


def openai_lifecycle(name: str) -> str:
    return OPENAI_API_STATUS.get(name, "À vérifier")


def anthropic_lifecycle(name: str) -> str:
    if contains_any(name, ANTHROPIC_RETIRED):
        return "Retiré"
    if contains_any(name, ANTHROPIC_ACTIVE):
        return "Actif"
    if contains_any(name, ANTHROPIC_DEPRECATED) or ANTHROPIC_DATED_4_RE.search(name):
        return "Déprécié"
    return "À vérifier"


def lifecycle_status(provider: object, eco_name: object) -> str:
    vendor = str(provider or "").strip().lower()
    name = str(eco_name or "").strip()
    if vendor == "openai":
        return openai_lifecycle(name)
    if vendor == "anthropic":
        return anthropic_lifecycle(name.lower())
    return ""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    correspondance = pd.read_csv(args.csv, encoding="utf-8-sig")
    correspondance["statut_cycle_vie"] = [
        lifecycle_status(provider, eco_name)
        for provider, eco_name in zip(
            correspondance["eco_provider"],
            correspondance["eco_name"],
        )
    ]
    correspondance.to_csv(args.csv, index=False)

    scoped = correspondance.loc[
        correspondance["eco_provider"].isin(("openai", "anthropic")),
        ["eco_provider", "statut_cycle_vie"],
    ]
    print(f"CSV mis à jour : {args.csv}")
    print(scoped.value_counts(["eco_provider", "statut_cycle_vie"]).sort_index().to_string())

    openai_names = set(
        correspondance.loc[correspondance["eco_provider"] == "openai", "eco_name"].astype(str)
    )
    missing = sorted(set(OPENAI_API_STATUS) - openai_names)
    extra = sorted(openai_names - set(OPENAI_API_STATUS))
    if missing:
        print(f"Absents du CSV : {len(missing)}")
        print("\n".join(missing))
    if extra:
        print(f"Hors snapshot 2026-09-22 : {len(extra)}")
        print("\n".join(extra))


if __name__ == "__main__":
    main()
