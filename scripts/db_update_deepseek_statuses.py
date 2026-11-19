#!/usr/bin/env python3
"""Met à jour lifecycle_status pour les slugs DeepSeek listés.

La colonne n'accepte que active, deprecated, retired et legacy.
Actif, Déprécié et Retiré sont enregistrés sous ces valeurs canoniques.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from db_update_missing_statuses import SupabaseRest, supabase_config

STATUS_BY_LABEL = {
    "Actif": "active",
    "Déprécié": "deprecated",
    "Retiré": "retired",
}

SLUGS_BY_LABEL = {
    "Actif": [
        "deepseek-v4-1-flash",
        "deepseek-v4-flash-0423",
        "deepseek-v4-flash-0731",
        "deepseek-v4-flash-max",
        "deepseek-v4-flash-vision-exp",
        "deepseek-v4-pro-0813",
        "deepseek-v4-pro-max",
    ],
    "Déprécié": [
        "deepseek-r1",
        "deepseek-r1-0528",
        "deepseek-r1-distill-llama-70b",
        "deepseek-r1-distill-llama-8b",
        "deepseek-r1-distill-qwen-1-5b",
        "deepseek-r1-distill-qwen-14b",
        "deepseek-r1-distill-qwen-32b",
        "deepseek-r1-distill-qwen-7b",
        "deepseek-r1-zero",
        "deepseek-v3",
        "deepseek-v3-0324",
        "deepseek-v3-1",
        "deepseek-v3-2",
        "deepseek-v3-2-exp",
        "deepseek-v3-2-non-thinking",
        "deepseek-v3-2-speciale",
        "deepseek-v3-2-thinking",
        "deepseek-vl2",
        "deepseek-vl2-small",
        "deepseek-vl2-tiny",
    ],
    "Retiré": [
        "deepseek-v2-5",
    ],
}


def main() -> None:
    url, key = supabase_config()
    client = SupabaseRest(url, key)
    requested = [slug for slugs in SLUGS_BY_LABEL.values() for slug in slugs]
    existing = {str(row.get("slug")): row for row in client.find_by_slugs(requested)}
    missing = [slug for slug in requested if slug not in existing]
    if missing:
        print("Slugs introuvables :")
        for slug in missing:
            print(f"  - {slug}")

    updated = 0
    for label, slugs in SLUGS_BY_LABEL.items():
        status = STATUS_BY_LABEL[label]
        present = [slug for slug in slugs if slug in existing]
        if not present:
            continue
        rows = client.update_status(present, status)
        updated += len(rows)
        for row in rows:
            print(f"{row.get('slug')} → {label} ({status})")

    print(f"{updated} fiche(s) mise(s) à jour.")
    if missing:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
