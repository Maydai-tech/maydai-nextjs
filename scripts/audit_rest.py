#!/usr/bin/env python3
"""Audit des propositions EcoLogits ↔ MaydAI hors Anthropic / OpenAI / Llama."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = REPO_ROOT / "tmp" / "ecologits-correspondance.csv"
DEFAULT_OUTPUT = REPO_ROOT / "tmp" / "audit_rest.csv"

FOURNISSEURS = ("mistralai", "mistral-community", "cohere", "huggingface_hub")
DEJA_TRAITES_RE = re.compile(r"llama|guard", re.IGNORECASE)
MIXTRAL_8X22B_RE = re.compile(r"8x22b", re.IGNORECASE)
MIXTRAL_8X7B_RE = re.compile(r"8x7b", re.IGNORECASE)
MISTRAL_API_RE = re.compile(r"voxtral|magistral|devstral|tiny", re.IGNORECASE)
AYA_RE = re.compile(r"aya", re.IGNORECASE)
PHI3_RE = re.compile(r"phi-3", re.IGNORECASE)
DATABRICKS_RE = re.compile(r"dbrx|dolly", re.IGNORECASE)
SLUG_DATE_RE = re.compile(r"(?<!\d)2[0-6](?:0[1-9]|1[0-2])(?!\d)")
ANOMALY_ORDER = (
    "Erreur Mixtral 8x22B",
    "Erreur Mixtral 8x7B",
    "Orphelin API Mistral",
    "Slug API trop complexe / Daté",
    "Orphelin Aya",
    "Orphelin Phi-3",
    "Orphelin Databricks",
    "Orphelin non catégorisé",
)


def as_text(value: object) -> str:
    text = str(value or "").strip()
    if not text or text.lower() in {"nan", "none"}:
        return ""
    return text


def detect_anomalie(eco_name: object, maydai_slug: object) -> str:
    name = as_text(eco_name)
    slug = as_text(maydai_slug)

    if MIXTRAL_8X22B_RE.search(name) and slug != "mixtral-8x22b":
        return "Erreur Mixtral 8x22B"
    if MIXTRAL_8X7B_RE.search(name) and slug != "mixtral-8x7b":
        return "Erreur Mixtral 8x7B"
    if MISTRAL_API_RE.search(name) and not slug:
        return "Orphelin API Mistral"
    if slug and (SLUG_DATE_RE.search(slug) or "latest" in slug.lower()):
        return "Slug API trop complexe / Daté"
    if AYA_RE.search(name) and not slug:
        return "Orphelin Aya"
    if PHI3_RE.search(name) and not slug:
        return "Orphelin Phi-3"
    if DATABRICKS_RE.search(name) and not slug:
        return "Orphelin Databricks"
    if not slug:
        return "Orphelin non catégorisé"
    return ""


def build_audit(correspondance: pd.DataFrame) -> pd.DataFrame:
    names = correspondance["eco_name"].fillna("").astype(str)
    filtered = correspondance.loc[
        correspondance["eco_provider"].isin(FOURNISSEURS)
        & ~names.str.contains(DEJA_TRAITES_RE)
        & (correspondance["statut"] != "lie")
    ].copy()

    filtered["maydai_slug"] = filtered["maydai_slug"].map(as_text)
    filtered["anomalie_detectee"] = [
        detect_anomalie(eco_name, slug)
        for eco_name, slug in zip(filtered["eco_name"], filtered["maydai_slug"])
    ]
    return filtered.loc[
        :,
        ["eco_provider", "statut", "eco_name", "maydai_slug", "anomalie_detectee"],
    ].reset_index(drop=True)


def print_summary(audit: pd.DataFrame) -> None:
    anomalies = audit.loc[audit["anomalie_detectee"] != ""]
    print(f"Audit écrit : {len(audit)} lignes, {len(anomalies)} anomalies")
    if anomalies.empty:
        print("Aucune anomalie détectée.")
        return

    counts = anomalies["anomalie_detectee"].value_counts()
    print("\nRésumé par catégorie :")
    for label in ANOMALY_ORDER:
        if label not in counts.index:
            continue
        subset = anomalies.loc[anomalies["anomalie_detectee"] == label]
        print(f"\n{label} ({len(subset)})")
        print(subset[["eco_provider", "eco_name", "maydai_slug"]].to_string(index=False))

    extras = [label for label in counts.index if label not in ANOMALY_ORDER]
    for label in extras:
        subset = anomalies.loc[anomalies["anomalie_detectee"] == label]
        print(f"\n{label} ({len(subset)})")
        print(subset[["eco_provider", "eco_name", "maydai_slug"]].to_string(index=False))


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
    print(f"Fichier : {args.output}")
    print_summary(audit)


if __name__ == "__main__":
    main()
