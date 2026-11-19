#!/usr/bin/env python3
"""Audit des propositions EcoLogits ↔ MaydAI pour Llama (Hugging Face)."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = REPO_ROOT / "tmp" / "ecologits-correspondance.csv"
DEFAULT_OUTPUT = REPO_ROOT / "tmp" / "audit_meta.csv"

GENERATIONS = ("3.3", "3.2", "3.1")
INSTRUCT_SLUG_RE = re.compile(r"(?:instruct|llama-\d)")


def as_text(value: object) -> str:
    text = str(value or "").strip()
    if not text or text.lower() in {"nan", "none"}:
        return ""
    return text


def llama_generation(value: str) -> str | None:
    normalized = value.lower().replace("_", "-")
    for generation in GENERATIONS:
        if generation in normalized or generation.replace(".", "-") in normalized:
            return generation
    return None


def is_classic_instruct_slug(slug: str) -> bool:
    lowered = slug.lower()
    if "guard" in lowered:
        return False
    return "instruct" in lowered or bool(INSTRUCT_SLUG_RE.search(lowered))


def detect_anomalie(eco_name: object, maydai_slug: object) -> str:
    name = as_text(eco_name)
    slug = as_text(maydai_slug)
    name_l = name.lower()
    slug_l = slug.lower()

    if "codellama" in name_l.replace("-", "") or "code-llama" in name_l:
        if "code-llama" not in slug_l:
            return "Erreur CodeLlama"

    if not slug:
        return "Aucune proposition"

    if "llama-guard" in name_l or "llamaguard" in name_l:
        if is_classic_instruct_slug(slug):
            return "Erreur Guard"

    eco_generation = llama_generation(name)
    if eco_generation:
        slug_generation = llama_generation(slug)
        if slug_generation != eco_generation:
            return "Décalage de génération"
    return ""


def build_audit(correspondance: pd.DataFrame) -> pd.DataFrame:
    names = correspondance["eco_name"].fillna("").astype(str)
    filtered = correspondance.loc[
        (correspondance["eco_provider"] == "huggingface_hub")
        & names.str.contains("llama", case=False, regex=False)
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
        print("Aucune anomalie Llama détectée.")
        return

    print("\nLignes avec anomalie :")
    print(anomalies.to_string(index=False))
    print("\nRépartition :")
    print(anomalies["anomalie_detectee"].value_counts().to_string())


if __name__ == "__main__":
    main()
