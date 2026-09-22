#!/usr/bin/env python3
"""Met à jour lifecycle_status pour une liste fixe de slugs MaydAI.

La colonne n'accepte que active, deprecated, retired et legacy.
Actif et Déprécié sont enregistrés sous ces valeurs canoniques.
"""

from __future__ import annotations

import json
import os
import ssl
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

# Libellés demandés → valeurs acceptées par compl_ai_models_lifecycle_status_check.
STATUS_BY_LABEL = {
    "Actif": "active",
    "Déprécié": "deprecated",
}

SLUGS_BY_LABEL = {
    "Actif": [
        "gpt-5-5-instant",
        "gpt-oss-120b-high",
        "gpt-oss-20b-high",
    ],
    "Déprécié": [
        "gpt-5-3",
        "gpt-5-1-high",
        "gpt-5-1-instant",
        "gpt-5-1-medium",
        "gpt-5-1-thinking",
        "gpt-5-1-codex-high",
        "gpt-5-high",
        "gpt-5-medium",
    ],
}


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("'").strip('"'))


def supabase_config() -> tuple[str, str]:
    load_env_file(REPO_ROOT / ".env.local")
    load_env_file(REPO_ROOT / ".env")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or ""
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not url or not key:
        raise SystemExit("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local")
    return url.rstrip("/"), key


def _urlopen(request: urllib.request.Request) -> str:
    try:
        with urllib.request.urlopen(request, context=ssl.create_default_context()) as response:
            return response.read().decode()
    except urllib.error.HTTPError:
        raise
    except urllib.error.URLError:
        with urllib.request.urlopen(request, context=ssl._create_unverified_context()) as response:
            return response.read().decode()


class SupabaseRest:
    def __init__(self, url: str, key: str) -> None:
        self.url = url
        self.key = key

    def _request(self, method: str, path: str, payload: object | None = None) -> object:
        body = None if payload is None else json.dumps(payload).encode()
        request = urllib.request.Request(
            f"{self.url}/rest/v1/{path}",
            data=body,
            method=method,
            headers={
                "apikey": self.key,
                "Authorization": f"Bearer {self.key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
        )
        try:
            raw = _urlopen(request)
        except urllib.error.HTTPError as error:
            detail = error.read().decode()
            raise SystemExit(f"Supabase {method} {path} → {error.code}: {detail}") from error
        return json.loads(raw) if raw else []

    def find_by_slugs(self, slugs: list[str]) -> list[dict]:
        query = urllib.parse.urlencode(
            {
                "select": "id,slug,lifecycle_status",
                "slug": f"in.({','.join(slugs)})",
            },
            safe="(),.",
        )
        rows = self._request("GET", f"compl_ai_models?{query}")
        if not isinstance(rows, list):
            raise SystemExit("Réponse inattendue pour compl_ai_models")
        return rows

    def update_status(self, slugs: list[str], status: str) -> list[dict]:
        query = urllib.parse.urlencode(
            {"slug": f"in.({','.join(slugs)})"},
            safe="(),.",
        )
        rows = self._request("PATCH", f"compl_ai_models?{query}", {"lifecycle_status": status})
        if not isinstance(rows, list):
            raise SystemExit("Réponse inattendue lors de la mise à jour")
        return rows


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
