#!/usr/bin/env python3
"""Audit des propositions EcoLogits ↔ MaydAI pour Anthropic et OpenAI."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

STATUTS_A_AUDITER = (
    "proposition",
    "orphelin",
    "plusieurs_candidats",
    "famille_a_confirmer",
)
FOURNISSEURS = ("anthropic", "openai")

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = REPO_ROOT / "tmp" / "ecologits-correspondance.csv"
DEFAULT_OUTPUT = REPO_ROOT / "tmp" / "audit_anthropic_openai.csv"

ISO_DATE_RE = re.compile(r"(?:19|20)\d{2}-\d{2}-\d{2}")
COMPACT_DATE_RE = re.compile(r"(?:19|20)\d{2}\d{4}")
YEAR_RE = re.compile(r"(?:19|20)\d{2}")
SNAPSHOT_RE = re.compile(r"(?<![\d.])-\d{4}(?!\d)")
MINOR_VERSION_RE = re.compile(r"(?<!\d)(\d{1,2})[.\-](\d{1,2})(?!\d)")
MAJOR_VERSION_RE = re.compile(r"(?<!\d)(\d{1,2})(?!\d)")


def extract_version(value: object) -> tuple[int, int] | None:
    """Retourne (majeur, mineur) en ignorant les dates et snapshots."""
    text = str(value or "").strip().lower()
    if not text or text in {"nan", "none"}:
        return None

    text = text.replace("gpt-35", "gpt-3.5").replace("gpt35", "gpt-3.5")
    text = ISO_DATE_RE.sub(" ", text)
    text = COMPACT_DATE_RE.sub(" ", text)
    text = YEAR_RE.sub(" ", text)
    text = SNAPSHOT_RE.sub(" ", text)

    minor_match = MINOR_VERSION_RE.search(text)
    if minor_match:
        return int(minor_match.group(1)), int(minor_match.group(2))

    major_match = MAJOR_VERSION_RE.search(text)
    if major_match:
        return int(major_match.group(1)), 0
    return None


def detect_anomalie(eco_name: object, maydai_slug: object) -> str:
    slug = str(maydai_slug or "").strip()
    if not slug or slug.lower() in {"nan", "none"}:
        return "Aucune proposition"

    eco_version = extract_version(eco_name)
    slug_version = extract_version(slug)
    if eco_version is None or slug_version is None:
        return ""

    if eco_version[0] != slug_version[0]:
        return "Décalage de version majeure"
    if eco_version[1] != slug_version[1]:
        return "Décalage de version mineure"
    return ""


def build_audit(correspondance: pd.DataFrame) -> pd.DataFrame:
    filtered = correspondance.loc[
        correspondance["eco_provider"].isin(FOURNISSEURS)
        & correspondance["statut"].isin(STATUTS_A_AUDITER)
    ].copy()

    filtered["maydai_slug"] = filtered["maydai_slug"].fillna("").astype(str).str.strip()
    filtered["anomalie_detectee"] = [
        detect_anomalie(eco_name, slug)
        for eco_name, slug in zip(filtered["eco_name"], filtered["maydai_slug"])
    ]

    return filtered.loc[
        :,
        ["eco_provider", "statut", "eco_name", "maydai_slug", "anomalie_detectee"],
    ].reset_index(drop=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    correspondance = pd.read_csv(args.input, encoding="utf-8-sig")
    audit = build_audit(correspondance)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    audit.to_csv(args.output, index=False)

    anomalies = audit.loc[audit["anomalie_detectee"] != ""]
    print(f"Audit écrit : {args.output} ({len(audit)} lignes, {len(anomalies)} anomalies)")
    if anomalies.empty:
        print("Aucune anomalie de version détectée.")
        return

    print("\nLignes avec anomalie :")
    print(anomalies.to_string(index=False))


if __name__ == "__main__":
    main()
