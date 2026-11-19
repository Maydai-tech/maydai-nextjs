#!/usr/bin/env python3
"""Met à jour lifecycle_status pour les slugs Meta listés.

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
        "llama-4-maverick",
        "llama-4-scout",
        "llama-guard-4-12b",
        "muse-glimmer-30b",
        "muse-spark-1-3",
    ],
    "Déprécié": [
        "llama-3-3-70b-instruct",
        "llama-3-2-90b-instruct",
        "llama-3-2-11b-instruct",
        "llama-3-2-3b-instruct",
        "llama-3-1-405b-instruct",
        "llama-3-1-70b-instruct",
        "llama-3-1-8b-instruct",
        "muse-spark-1-2",
        "muse-spark-1-1",
        "muse-spark",
    ],
    "Retiré": [
        "llama-2",
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
