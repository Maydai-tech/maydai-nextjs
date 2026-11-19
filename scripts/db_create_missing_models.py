#!/usr/bin/env python3
"""Remappe les faux-manquants puis crée les vraies fiches MaydAI manquantes."""

from __future__ import annotations

import argparse
import json
import os
import ssl
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = REPO_ROOT / "tmp" / "ecologits-correspondance.csv"
DEFAULT_HUB = REPO_ROOT / "tmp" / "maydai-compl-ai-models.json"
CREER_FICHE = "CRÉER_FICHE"

PREFERRED_REMAP = {
    "mistral-large": "mistral-large-3",
    "mistral-medium": "mistral-medium-3-5",
    "voxtral-mini": "voxtral-mini-25-07",
    "magistral-small": "magistral-small-2506",
    "ministral-8b": "ministral-8b-instruct",
}

PROVIDER_BY_SLUG_PREFIX = (
    ("aya-", ("Cohere", 25)),
    ("code-llama", ("Meta", 5)),
    ("llama-guard", ("Meta", 5)),
    ("prompt-guard", ("Meta", 5)),
    ("phi-3", ("Microsoft", 1)),
    ("gemma-", ("Google", 4)),
    ("dbrx", ("Databricks", None)),
    ("dolly-", ("Databricks", None)),
    ("mathstral", ("Mistral", 6)),
    ("ministral", ("Mistral", 6)),
    ("magistral", ("Mistral", 6)),
    ("mistral", ("Mistral", 6)),
    ("voxtral", ("Mistral", 6)),
    ("mixtral", ("Mistral", 6)),
)

DISPLAY_NAMES = {
    "aya-expanse-32b": "Aya Expanse 32B",
    "aya-vision-32b": "Aya Vision 32B",
    "aya-23-35b": "Aya 23 35B",
    "aya-23-8b": "Aya 23 8B",
    "code-llama-7b": "Code Llama 7B",
    "code-llama-13b": "Code Llama 13B",
    "code-llama-34b": "Code Llama 34B",
    "code-llama-70b": "Code Llama 70B",
    "dbrx-instruct": "DBRX Instruct",
    "dolly-v1-6b": "Dolly v1 6B",
    "dolly-v2-3b": "Dolly v2 3B",
    "dolly-v2-7b": "Dolly v2 7B",
    "dolly-v2-12b": "Dolly v2 12B",
    "gemma-1-1-7b": "Gemma 1.1 7B",
    "llama-guard-1-7b": "Llama Guard 1 7B",
    "llama-guard-2-8b": "Llama Guard 2 8B",
    "llama-guard-3-8b": "Llama Guard 3 8B",
    "mathstral-7b": "Mathstral 7B",
    "phi-3-mini": "Phi-3 Mini",
    "phi-3-small": "Phi-3 Small",
    "phi-3-medium": "Phi-3 Medium",
    "phi-3-vision": "Phi-3 Vision",
    "prompt-guard-86m": "Prompt Guard 86M",
    "magistral-medium": "Magistral Medium",
    "ministral-3b": "Ministral 3B",
    "ministral-14b": "Ministral 14B",
    "mistral-tiny": "Mistral Tiny",
}

ACTIVE_SLUGS = {
    "aya-expanse-32b",
    "aya-vision-32b",
    "ministral-3b",
    "ministral-14b",
}


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

    def list_models(self) -> list[dict[str, object]]:
        query = urllib.parse.urlencode(
            {"select": "id,slug,model_name,model_provider", "limit": 5000}
        )
        rows = self._request("GET", f"compl_ai_models?{query}")
        if not isinstance(rows, list):
            raise SystemExit("Réponse inattendue pour compl_ai_models")
        return rows

    def insert_model(self, row: dict[str, object]) -> dict[str, object]:
        try:
            created = self._request("POST", "compl_ai_models", row)
        except SystemExit as error:
            if "lifecycle_status" in str(error) and "PGRST204" in str(error):
                fallback = {key: value for key, value in row.items() if key != "lifecycle_status"}
                created = self._request("POST", "compl_ai_models", fallback)
            else:
                raise
        if isinstance(created, list) and created:
            first = created[0]
            if isinstance(first, dict):
                return first
        if isinstance(created, dict):
            return created
        raise SystemExit(f"INSERT sans UUID pour {row.get('slug')}")


def _urlopen(request: urllib.request.Request) -> str:
    try:
        with urllib.request.urlopen(request, context=ssl.create_default_context()) as response:
            return response.read().decode()
    except urllib.error.URLError:
        with urllib.request.urlopen(request, context=ssl._create_unverified_context()) as response:
            return response.read().decode()


def load_hub_json(path: Path) -> dict[str, dict[str, str]]:
    rows = json.loads(path.read_text())
    if not isinstance(rows, list):
        raise SystemExit(f"Dump hub invalide : {path}")
    return hub_from_rows(rows)


def hub_from_rows(rows: list[dict[str, object]]) -> dict[str, dict[str, str]]:
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
    return hub


def resolve_remap(alias: str, preferred: str, hub: dict[str, dict[str, str]]) -> str:
    if preferred in hub:
        return preferred
    prefix = f"{alias}-"
    candidates = sorted(slug for slug in hub if slug == alias or slug.startswith(prefix))
    if not candidates:
        raise SystemExit(f"Aucun slug hub pour remapper {alias} → {preferred}")
    return candidates[-1]


def provider_for_slug(slug: str) -> tuple[str, int | None]:
    for prefix, provider in PROVIDER_BY_SLUG_PREFIX:
        if slug.startswith(prefix):
            return provider
    return ("Unknown", None)


def lifecycle_for_slug(slug: str, csv_status: str) -> tuple[str, str]:
    normalized = csv_status.strip().lower()
    if normalized in {"actif", "active"}:
        return "active", "Actif"
    if normalized in {"retiré", "retire", "retired"}:
        return "retired", "Retiré"
    if slug in ACTIVE_SLUGS:
        return "active", "Actif"
    return "retired", "Retiré"


def display_name(slug: str) -> str:
    if slug in DISPLAY_NAMES:
        return DISPLAY_NAMES[slug]
    return slug.replace("-", " ").title()


def stringify_columns(frame: pd.DataFrame, columns: tuple[str, ...]) -> pd.DataFrame:
    updated = frame.copy()
    for column in columns:
        if column not in updated.columns:
            updated[column] = ""
        updated[column] = updated[column].map(as_text).astype("string")
    return updated


def apply_remaps(
    frame: pd.DataFrame,
    hub: dict[str, dict[str, str]],
) -> tuple[pd.DataFrame, list[tuple[str, str, str]]]:
    remapped: list[tuple[str, str, str]] = []
    for alias, preferred in PREFERRED_REMAP.items():
        target = resolve_remap(alias, preferred, hub)
        fiche = hub[target]
        mask = frame["maydai_slug"] == alias
        if not mask.any():
            continue
        frame.loc[mask, "maydai_slug"] = target
        frame.loc[mask, "maydai_id"] = fiche["id"]
        frame.loc[mask, "maydai_name"] = fiche["name"]
        if fiche["provider"]:
            frame.loc[mask, "maydai_provider"] = fiche["provider"]
        frame.loc[mask, "statut"] = "lie"
        frame.loc[mask, "action"] = ""
        remapped.append((alias, target, fiche["id"]))
    return frame, remapped


def slugs_to_create(frame: pd.DataFrame) -> list[str]:
    pending = frame.loc[
        (frame["statut"] != "lie") | (frame["maydai_id"] == "") | (frame["action"] == CREER_FICHE)
    ]
    slugs = sorted({as_text(slug) for slug in pending["maydai_slug"] if as_text(slug)})
    return slugs


def attach_created(frame: pd.DataFrame, slug: str, fiche: dict[str, str], cycle_label: str) -> None:
    mask = frame["maydai_slug"] == slug
    frame.loc[mask, "maydai_id"] = fiche["id"]
    frame.loc[mask, "maydai_name"] = fiche["name"]
    frame.loc[mask, "maydai_provider"] = fiche["provider"]
    frame.loc[mask, "statut"] = "lie"
    frame.loc[mask, "action"] = ""
    empty_cycle = frame.loc[mask, "statut_cycle_vie"].map(as_text) == ""
    frame.loc[mask & empty_cycle, "statut_cycle_vie"] = cycle_label


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--hub", type=Path, default=DEFAULT_HUB)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    url, key = supabase_config()
    client = SupabaseRest(url, key)
    try:
        hub = hub_from_rows(client.list_models())
    except (SystemExit, urllib.error.URLError, OSError):
        if not args.hub.exists():
            raise
        print(f"Lecture hub via dump local : {args.hub}")
        hub = load_hub_json(args.hub)

    frame = stringify_columns(
        pd.read_csv(args.csv, encoding="utf-8-sig"),
        (
            "maydai_slug",
            "maydai_id",
            "maydai_name",
            "maydai_provider",
            "statut",
            "action",
            "statut_cycle_vie",
        ),
    )
    frame, remapped = apply_remaps(frame, hub)

    print("Étape 1 — remappages :")
    if remapped:
        for alias, target, model_id in remapped:
            print(f"  {alias} → {target} ({model_id})")
    else:
        print("  aucun")

    created: list[dict[str, str]] = []
    print("\nÉtape 2 — créations :")
    for slug in slugs_to_create(frame):
        if slug in hub:
            fiche = hub[slug]
            attach_created(frame, slug, {**fiche, "provider": fiche["provider"]}, as_text(frame.loc[frame["maydai_slug"] == slug, "statut_cycle_vie"].iloc[0]))
            continue
        provider_name, provider_id = provider_for_slug(slug)
        csv_status = ""
        matches = frame.loc[frame["maydai_slug"] == slug, "statut_cycle_vie"]
        if not matches.empty:
            csv_status = as_text(matches.iloc[0])
        db_status, cycle_label = lifecycle_for_slug(slug, csv_status)
        name = display_name(slug)
        payload = {
            "slug": slug,
            "model_name": name,
            "short_name": name,
            "model_provider": provider_name,
            "model_provider_id": provider_id,
            "model_type": "large-language-model",
            "version": "",
            "lifecycle_status": db_status,
        }
        print(f"  INSERT {slug} / {provider_name} / {cycle_label}")
        if args.dry_run:
            created.append({"slug": slug, "id": "(dry-run)", "name": name, "provider": provider_name})
            continue
        row = client.insert_model(payload)
        fiche = {
            "id": as_text(row.get("id")),
            "name": as_text(row.get("model_name")) or name,
            "provider": as_text(row.get("model_provider")) or provider_name,
        }
        hub[slug] = fiche
        attach_created(frame, slug, fiche, cycle_label)
        created.append({"slug": slug, "id": fiche["id"], "name": fiche["name"], "provider": fiche["provider"]})

    if not args.dry_run:
        frame.to_csv(args.csv, index=False)
        dump_rows = [
            {"id": fiche["id"], "slug": slug, "model_name": fiche["name"], "model_provider": fiche["provider"]}
            for slug, fiche in sorted(hub.items())
        ]
        args.hub.write_text(json.dumps(dump_rows, ensure_ascii=False, indent=2) + "\n")

    print(f"\nCSV : {args.csv}")
    print(f"Remappés : {len(remapped)}")
    print(f"Fiches créées : {len(created)}")
    if created:
        print(pd.DataFrame(created).to_string(index=False))
    remaining = frame.loc[(frame["statut"] != "lie") | (frame["maydai_id"] == "")]
    print(f"Lignes encore sans rattachement : {len(remaining)}")


if __name__ == "__main__":
    main()
