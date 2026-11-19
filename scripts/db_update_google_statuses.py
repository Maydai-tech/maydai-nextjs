#!/usr/bin/env python3
"""Met à jour lifecycle_status pour les slugs Google listés.

La colonne n'accepte que active, deprecated, retired et legacy.
Actif est enregistré sous la valeur canonique active.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from db_update_missing_statuses import SupabaseRest, supabase_config

STATUS_BY_LABEL = {
    "Actif": "active",
}

SLUGS_BY_LABEL = {
    "Actif": [
        "gemini-3-1-flash",
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
