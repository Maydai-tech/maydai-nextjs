#!/usr/bin/env python3
"""UPSERT des 356 liens EcoLogits ↔ MaydAI dans ecologits_model_links."""

from __future__ import annotations

import argparse
import json
import os
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = REPO_ROOT / "tmp" / "ecologits-correspondance.csv"
TABLE = "ecologits_model_links"
BATCH_SIZE = 50
RETRIES = 3


def as_text(value: object) -> str:
    text = str(value or "").strip()
    if not text or text.lower() in {"nan", "none"}:
        return ""
    return text


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


def _urlopen(request: urllib.request.Request) -> tuple[int, str]:
    try:
        with urllib.request.urlopen(request, context=ssl.create_default_context()) as response:
            return response.status, response.read().decode()
    except urllib.error.URLError:
        with urllib.request.urlopen(request, context=ssl._create_unverified_context()) as response:
            return response.status, response.read().decode()


class SupabaseRest:
    def __init__(self, url: str, key: str) -> None:
        self.url = url
        self.key = key

    def request(
        self,
        method: str,
        path: str,
        payload: object | None = None,
        prefer: str = "return=representation",
    ) -> list[dict[str, object]]:
        body = None if payload is None else json.dumps(payload).encode()
        last_error: Exception | None = None
        for attempt in range(1, RETRIES + 1):
            request = urllib.request.Request(
                f"{self.url}/rest/v1/{path}",
                data=body,
                method=method,
                headers={
                    "apikey": self.key,
                    "Authorization": f"Bearer {self.key}",
                    "Content-Type": "application/json",
                    "Prefer": prefer,
                },
            )
            try:
                _status, raw = _urlopen(request)
                if not raw:
                    return []
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [row for row in parsed if isinstance(row, dict)]
                if isinstance(parsed, dict):
                    return [parsed]
                return []
            except urllib.error.HTTPError as error:
                detail = error.read().decode()
                if error.code >= 500 and attempt < RETRIES:
                    last_error = error
                    time.sleep(attempt)
                    continue
                raise RuntimeError(f"Supabase {method} {path} → {error.code}: {detail}") from error
            except urllib.error.URLError as error:
                last_error = error
                if attempt < RETRIES:
                    time.sleep(attempt)
                    continue
                raise RuntimeError(f"Erreur réseau Supabase ({error.reason})") from error
        raise RuntimeError(f"Échec réseau après {RETRIES} essais : {last_error}")

    def existing_links(self) -> dict[str, str]:
        query = urllib.parse.urlencode(
            {"select": "ecologits_model_id,maydai_model_id", "limit": 5000}
        )
        rows = self.request("GET", f"{TABLE}?{query}")
        links: dict[str, str] = {}
        for row in rows:
            eco_id = as_text(row.get("ecologits_model_id"))
            maydai_id = as_text(row.get("maydai_model_id"))
            if eco_id and maydai_id:
                links[eco_id] = maydai_id
        return links

    def upsert_links(self, rows: list[dict[str, str]]) -> list[dict[str, object]]:
        query = urllib.parse.urlencode({"on_conflict": "ecologits_model_id"})
        return self.request(
            "POST",
            f"{TABLE}?{query}",
            rows,
            prefer="resolution=merge-duplicates,return=representation",
        )


def load_pairs(csv_path: Path) -> list[tuple[str, str]]:
    frame = pd.read_csv(csv_path, encoding="utf-8-sig")
    missing = [column for column in ("eco_id", "maydai_id") if column not in frame.columns]
    if missing:
        raise SystemExit(f"Colonnes manquantes dans {csv_path} : {', '.join(missing)}")

    pairs: list[tuple[str, str]] = []
    seen: set[str] = set()
    errors: list[str] = []
    for index, row in frame.iterrows():
        eco_id = as_text(row.get("eco_id"))
        maydai_id = as_text(row.get("maydai_id"))
        if not eco_id or not maydai_id:
            errors.append(f"ligne {int(index) + 2} : eco_id/maydai_id vide")
            continue
        if eco_id in seen:
            continue
        seen.add(eco_id)
        pairs.append((eco_id, maydai_id))

    if errors:
        raise SystemExit("CSV incomplet :\n  " + "\n  ".join(errors[:20]))
    if len(pairs) != 356:
        print(f"Attention : {len(pairs)} paires uniques au lieu de 356.")
    return pairs


def chunks(items: list[dict[str, str]], size: int) -> list[list[dict[str, str]]]:
    return [items[start : start + size] for start in range(0, len(items), size)]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    pairs = load_pairs(args.csv)
    now = datetime.now(timezone.utc).isoformat()
    payloads = [
        {
            "ecologits_model_id": eco_id,
            "maydai_model_id": maydai_id,
            "match_method": "manual",
            "updated_at": now,
        }
        for eco_id, maydai_id in pairs
    ]

    client = SupabaseRest(*supabase_config())
    existing = client.existing_links()
    to_create = sum(1 for eco_id, _maydai_id in pairs if eco_id not in existing)
    to_update = sum(
        1
        for eco_id, maydai_id in pairs
        if eco_id in existing and existing[eco_id] != maydai_id
    )
    unchanged = len(pairs) - to_create - to_update

    print(f"Paires CSV : {len(pairs)}")
    print(f"Liens déjà présents : {len(existing)}")
    print(f"À créer : {to_create} | à mettre à jour : {to_update} | identiques : {unchanged}")

    if args.dry_run:
        print("Dry-run : aucun UPSERT envoyé.")
        return

    upserted = 0
    failures: list[str] = []
    for batch in chunks(payloads, BATCH_SIZE):
        try:
            saved = client.upsert_links(batch)
            upserted += len(saved) or len(batch)
            continue
        except RuntimeError as batch_error:
            print(f"Lot de {len(batch)} en échec, repli ligne à ligne.")
            print(f"  {batch_error}")
        for row in batch:
            try:
                saved = client.upsert_links([row])
                upserted += len(saved) or 1
            except RuntimeError as row_error:
                failures.append(f"{row['ecologits_model_id']} → {row['maydai_model_id']} : {row_error}")

    print(f"\nLiens créés ou mis à jour avec succès : {upserted}")
    if failures:
        print(f"Échecs : {len(failures)}")
        for line in failures:
            print(f"  {line}")
        raise SystemExit(1)

    if upserted != len(pairs):
        raise SystemExit(f"Attendu {len(pairs)} liens, obtenu {upserted}.")

    print(
        f"Succès : {upserted}/{len(pairs)} relations sont dans {TABLE} "
        f"(créés {to_create}, mis à jour {to_update}, déjà alignés {unchanged})."
    )


if __name__ == "__main__":
    main()
