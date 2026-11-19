#!/usr/bin/env python3
"""Met à jour lifecycle_status pour les slugs Qwen listés.

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
        "qwen3-8-2-4t-a95b",
        "qwen3-8-27b",
        "qwen3-8-flash",
        "qwen3-8-flash-next",
        "qwen3-8-max",
        "qwen3-7-max",
        "qwen3-7-plus",
        "qwen3-next-80b-a3b",
        "qwen3-next-80b-a3b-base",
        "qwen3-next-80b-a3b-instruct",
        "qwen3-next-80b-a3b-thinking",
        "qwq-32b",
        "qvq-72b-preview",
    ],
    "Déprécié": [
        "qwen-3-6",
        "qwen3-6-27b",
        "qwen3-6-35b-a3b",
        "qwen3-6-plus",
        "qwen-3-5",
        "qwen3-5-0-8b",
        "qwen3-5-122b-a10b",
        "qwen3-5-27b",
        "qwen3-5-2b",
        "qwen3-5-35b-a3b",
        "qwen3-5-397b-a17b",
        "qwen3-5-4b",
        "qwen3-5-9b",
        "qwen3-14b",
        "qwen3-235b-a22b",
        "qwen3-235b-a22b-instruct-2507",
        "qwen3-235b-a22b-thinking-2507",
        "qwen3-30b-a3b",
        "qwen3-32b",
        "qwen3-coder",
        "qwen3-coder-480b-a35b-instruct",
        "qwen3-max",
        "qwen3-max-thinking",
        "qwen3-vl-235b-a22b-instruct",
        "qwen3-vl-235b-a22b-thinking",
        "qwen3-vl-30b-a3b",
        "qwen3-vl-30b-a3b-instruct",
        "qwen3-vl-30b-a3b-thinking",
        "qwen3-vl-32b",
        "qwen3-vl-32b-instruct",
        "qwen3-vl-32b-thinking",
        "qwen3-vl-4b-instruct",
        "qwen3-vl-4b-thinking",
        "qwen3-vl-8b-instruct",
        "qwen3-vl-8b-thinking",
        "qwq-32b-preview",
        "qwen2-5-14b-instruct",
        "qwen2-5-32b-instruct",
        "qwen2-5-72b-instruct",
        "qwen2-5-7b-instruct",
        "qwen2-5-coder-32b-instruct",
        "qwen2-5-coder-7b-instruct",
        "qwen2-5-omni-7b",
        "qwen2-5-vl-32b-instruct",
        "qwen2-5-vl-72b-instruct",
        "qwen2-5-vl-7b-instruct",
    ],
    "Retiré": [
        "qwen-1-5-72b-chat",
        "qwen2-72b-instruct",
        "qwen2-7b-instruct",
        "qwen2-vl-72b-instruct",
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
