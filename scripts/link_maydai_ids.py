#!/usr/bin/env python3
"""Peuple maydai_id dans le CSV EcoLogits par correspondance exacte de slug hub."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = REPO_ROOT / "tmp" / "ecologits-correspondance.csv"
DEFAULT_HUB = REPO_ROOT / "tmp" / "maydai-compl-ai-models.json"
CREER_FICHE = "CRÉER_FICHE"


def as_text(value: object) -> str:
    text = str(value or "").strip()
    if not text or text.lower() in {"nan", "none"}:
        return ""
    return text


def load_hub(path: Path) -> dict[str, dict[str, str]]:
    rows = json.loads(path.read_text())
    hub: dict[str, dict[str, str]] = {}
    for row in rows:
        slug = as_text(row.get("slug"))
        model_id = as_text(row.get("id"))
        if not slug or not model_id:
            continue
        hub[slug] = {
            "id": model_id,
            "name": as_text(row.get("model_name")) or slug,
            "provider": as_text(row.get("model_provider")),
        }
    if not hub:
        raise SystemExit(f"Aucune fiche MaydAI dans {path}")
    return hub


def needs_link(statut: object, maydai_id: object) -> bool:
    return as_text(statut) != "lie" or not as_text(maydai_id)


def apply_links(
    correspondance: pd.DataFrame,
    hub: dict[str, dict[str, str]],
) -> tuple[pd.DataFrame, int, pd.DataFrame]:
    updated = correspondance.copy()
    for column in ("maydai_id", "maydai_name", "maydai_provider", "statut", "action", "maydai_slug"):
        if column not in updated.columns:
            updated[column] = ""
        updated[column] = updated[column].map(as_text).astype("string")

    linked = 0
    create_rows: list[dict[str, str]] = []

    for index, row in updated.iterrows():
        if not needs_link(row.get("statut"), row.get("maydai_id")):
            continue

        slug = as_text(row.get("maydai_slug"))
        fiche = hub.get(slug)
        if fiche:
            updated.at[index, "maydai_id"] = fiche["id"]
            updated.at[index, "maydai_name"] = fiche["name"]
            if fiche["provider"]:
                updated.at[index, "maydai_provider"] = fiche["provider"]
            updated.at[index, "statut"] = "lie"
            if as_text(row.get("action")) == CREER_FICHE:
                updated.at[index, "action"] = ""
            linked += 1
            continue

        updated.at[index, "maydai_id"] = ""
        updated.at[index, "action"] = CREER_FICHE
        create_rows.append(
            {
                "eco_provider": as_text(row.get("eco_provider")),
                "maydai_slug": slug,
            }
        )

    to_create = (
        pd.DataFrame(create_rows)
        .drop_duplicates(subset=["eco_provider", "maydai_slug"])
        .sort_values(["eco_provider", "maydai_slug"])
        .reset_index(drop=True)
        if create_rows
        else pd.DataFrame(columns=["eco_provider", "maydai_slug"])
    )
    return updated, linked, to_create


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument(
        "--hub",
        type=Path,
        default=DEFAULT_HUB,
        help="Dump JSON de compl_ai_models (id, slug, model_name, model_provider)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.hub.exists():
        raise SystemExit(
            f"Dump hub introuvable : {args.hub}\n"
            "Exporte compl_ai_models (id, slug, model_name, model_provider) en JSON."
        )

    hub = load_hub(args.hub)
    correspondance = pd.read_csv(args.csv, encoding="utf-8-sig")
    updated, linked, to_create = apply_links(correspondance, hub)
    updated.to_csv(args.csv, index=False)

    print(f"Hub chargé : {len(hub)} fiches ({args.hub})")
    print(f"CSV mis à jour : {args.csv}")
    print(f"Rattachements réussis (passés à lie) : {linked}")
    print(f"Slugs à créer (CRÉER_FICHE, dédoublonnés) : {len(to_create)}")
    if to_create.empty:
        print("Aucun slug orphelin.")
        return

    print("\nCRÉER_FICHE :")
    print(to_create.to_string(index=False))


if __name__ == "__main__":
    main()
