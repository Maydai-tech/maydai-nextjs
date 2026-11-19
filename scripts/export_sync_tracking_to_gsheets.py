#!/usr/bin/env python3
"""Exporte le suivi de synchronisation des modèles LLM vers Google Sheets.

Le classeur est une table plate : une ligne par modèle, sans section ni
agrégat fournisseur, pour filtrer directement dans Google Sheets.

Authentification Google
-----------------------
Même compte de service que les exports Drive / Control Tower, lu dans
`.env.local` :

    GOOGLE_DRIVE_CLIENT_EMAIL
    GOOGLE_DRIVE_PRIVATE_KEY

Partager le dossier Drive de destination avec cette adresse, en droit Éditeur.
Un JSON explicite reste possible via --credentials.

Dossier de destination
----------------------
ID nu ou URL du dossier, via --folder ou la variable GOOGLE_DRIVE_FOLDER_ID.

    --folder 1AbCdEfGhIjKlMnOpQrStUvWxYz
    --folder "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz"

Le classeur « MaydAI — Synchronisation LLM » est créé dans ce dossier, ou
réécrit s’il existe déjà. Chaque exécution efface la feuille avant d’écrire.

Base
----
Lecture Supabase (service role) depuis .env.local :
NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.

Installation
------------
    python3 -m pip install gspread google-auth gspread-formatting

Exemples
--------
    python3 scripts/export_sync_tracking_to_gsheets.py --dry-run
    python3 scripts/export_sync_tracking_to_gsheets.py \\
        --folder "https://drive.google.com/drive/folders/FOLDER_ID"
"""

from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = REPO_ROOT / ".env.local"
DEFAULT_CREDENTIALS = REPO_ROOT / "config" / "google_credentials.json"
SPREADSHEET_TITLE = "MaydAI — Synchronisation LLM"
WORKSHEET_TITLE = "Synchronisation"
DEFAULT_COMPL_AI_BENCHMARK_TOTAL = 31
PAGE_SIZE = 1000

HEADERS = [
    "FOURNISSEUR",
    "MODÈLE",
    "SLUG",
    "DISPONIBLE\nQUESTIONNAIRE",
    "STATUT\nCYCLE DE VIE",
    "ALL",
    "MAYDAI",
    "COMPL-AI",
    "COMPAR:\nIA",
    "LLM\nSTATS",
    "ECO\nLOGITS",
    "SYSTEM\nCARD",
]
COLUMN_WIDTHS = [124, 130, 136, 136, 122, 44, 64, 98, 78, 58, 72, 74]

# Ordre demandé pour le suivi. Les autres fournisseurs ne sont inclus qu’avec --all-providers.
TRACKED_PROVIDERS = [
    "Anthropic",
    "DeepSeek",
    "Google",
    "Meta",
    "Microsoft",
    "Mistral",
    "OpenAI",
    "Perplexity",
    "Qwen",
    "xAI",
]

PROVIDER_ALIASES = {
    "anthropic": "Anthropic",
    "deepseek": "DeepSeek",
    "google": "Google",
    "googleai": "Google",
    "meta": "Meta",
    "facebook": "Meta",
    "metalama": "Meta",
    "microsoft": "Microsoft",
    "azure": "Microsoft",
    "mistral": "Mistral",
    "mistralai": "Mistral",
    "openai": "OpenAI",
    "perplexity": "Perplexity",
    "qwen": "Qwen",
    "alibaba": "Qwen",
    "xai": "xAI",
    "x-ai": "xAI",
}

LIFECYCLE_LABELS = {
    "active": "Actif",
    "legacy": "Legacy",
    "deprecated": "Déprécié",
    "retired": "Retiré",
    "actif": "Actif",
    "deprecie": "Déprécié",
    "déprécié": "Déprécié",
    "retire": "Retiré",
    "retiré": "Retiré",
}
LIFECYCLE_RANK = {"active": 1, "legacy": 2, "deprecated": 3, "retired": 4}
LIFECYCLE_FILE = REPO_ROOT / "lib" / "bench-llm" / "provider-lifecycle.ts"
LIFECYCLE_RECORD_RE = re.compile(r"\{\s*id:\s*'([^']+)'\s*,\s*status:\s*'([^']+)'")

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

FOLDER_ID_RE = re.compile(r"/folders/([a-zA-Z0-9_-]+)")


@dataclass
class ModelView:
    provider: str
    name: str
    slug: str
    in_questionnaire: bool
    active: bool
    lifecycle: str
    sources_filled: int
    maydai_score: int | None
    compl_ai_filled: int
    compl_ai_total: int
    comparia_rank: int | None
    llm_stats_rank: int | None
    has_maydai: bool
    has_compl_ai: bool
    has_comparia: bool
    has_llm_stats: bool
    has_ecologits: bool
    has_system_card: bool


@dataclass
class ProviderGroup:
    provider: str
    models: list[ModelView] = field(default_factory=list)

    @property
    def scored_count(self) -> int:
        return sum(1 for model in self.models if model.has_compl_ai)

    @property
    def in_questionnaire(self) -> bool:
        return any(model.in_questionnaire for model in self.models)


@dataclass
class SheetRow:
    kind: str
    values: list[str]


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


def _read_response(response) -> tuple[str, dict[str, str]]:
    headers = {name.lower(): value for name, value in response.headers.items()}
    return response.read().decode(), headers


def _urlopen(request: urllib.request.Request) -> tuple[str, dict[str, str]]:
    try:
        with urllib.request.urlopen(request, context=ssl.create_default_context()) as response:
            return _read_response(response)
    except urllib.error.HTTPError:
        raise
    except urllib.error.URLError:
        # Même repli que les autres scripts : le Python macOS n’a pas toujours les CA.
        with urllib.request.urlopen(request, context=ssl._create_unverified_context()) as response:
            return _read_response(response)


class SupabaseRest:
    def __init__(self, url: str, key: str) -> None:
        self.url = url
        self.key = key

    def _headers(self, extra: dict[str, str] | None = None) -> dict[str, str]:
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        if extra:
            headers.update(extra)
        return headers

    def fetch_all(self, table: str, select: str, filters: dict[str, str] | None = None, order: str | None = None) -> list[dict]:
        rows: list[dict] = []
        offset = 0
        while True:
            params: dict[str, str] = {"select": select}
            if filters:
                params.update(filters)
            if order:
                params["order"] = order
            query = urllib.parse.urlencode(params, safe="(),.:*")
            request = urllib.request.Request(
                f"{self.url}/rest/v1/{table}?{query}",
                headers=self._headers(
                    {
                        "Range-Unit": "items",
                        "Range": f"{offset}-{offset + PAGE_SIZE - 1}",
                    }
                ),
            )
            try:
                raw, _headers = _urlopen(request)
            except urllib.error.HTTPError as error:
                if error.code == 416 and rows:
                    break
                detail = error.read().decode()
                raise SystemExit(f"Supabase GET {table} → {error.code}: {detail}") from error
            batch = json.loads(raw) if raw else []
            if not isinstance(batch, list):
                raise SystemExit(f"Réponse inattendue pour {table}")
            rows.extend(batch)
            if len(batch) < PAGE_SIZE:
                break
            offset += PAGE_SIZE
        return rows

    def count(self, table: str) -> int:
        request = urllib.request.Request(
            f"{self.url}/rest/v1/{table}?select=id",
            headers=self._headers(
                {
                    "Prefer": "count=exact",
                    "Range-Unit": "items",
                    "Range": "0-0",
                }
            ),
        )
        try:
            _raw, headers = _urlopen(request)
        except urllib.error.HTTPError as error:
            if error.code == 416:
                content_range = error.headers.get("content-range", "")
                return _count_from_content_range(content_range)
            detail = error.read().decode()
            raise SystemExit(f"Supabase COUNT {table} → {error.code}: {detail}") from error
        return _count_from_content_range(headers.get("content-range", ""))


def _count_from_content_range(header: str) -> int:
    # Format PostgREST : "0-0/123" ou "*/0"
    match = re.search(r"/(\d+|\*)$", header.strip())
    if not match or match.group(1) == "*":
        return 0
    return int(match.group(1))


def to_title_case(value: str) -> str:
    trimmed = value.strip()
    if not trimmed:
        return trimmed

    def convert(token: str) -> str:
        if not token or token.isspace():
            return token
        has_lower = any(char.islower() for char in token)
        has_upper = any(char.isupper() for char in token)
        if has_lower and has_upper:
            return token
        return token[:1].upper() + token[1:].lower()

    return "".join(convert(token) for token in re.split(r"(\s+)", trimmed))


def canonical_provider(raw: object) -> str:
    text = str(raw or "").strip()
    if not text:
        return "—"
    key = re.sub(r"[^a-z0-9]+", "", text.lower())
    if key in PROVIDER_ALIASES:
        return PROVIDER_ALIASES[key]
    return to_title_case(text) or "—"


def lifecycle_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.strip().lower())


def load_lifecycle_records() -> list[tuple[str, str]]:
    """Lit le même catalogue que le tableau de bord (provider-lifecycle.ts)."""
    if not LIFECYCLE_FILE.is_file():
        return []
    return [
        (record_id, status)
        for record_id, status in LIFECYCLE_RECORD_RE.findall(LIFECYCLE_FILE.read_text())
        if status in LIFECYCLE_RANK
    ]


def lookup_lifecycle_status(key: str, records: list[tuple[str, str]]) -> str | None:
    exact = [status for record_id, status in records if lifecycle_key(record_id) == key]
    if exact:
        return max(exact, key=lambda status: LIFECYCLE_RANK[status])
    dated = []
    prefix = f"{key}-"
    for record_id, status in records:
        normalized = lifecycle_key(record_id)
        if normalized.startswith(prefix) and re.fullmatch(r"\d{8}", normalized[len(prefix) :]):
            dated.append(status)
    if not dated:
        return None
    return max(dated, key=lambda status: LIFECYCLE_RANK[status])


def resolve_lifecycle(identifiers: list[object], override: object, records: list[tuple[str, str]]) -> str:
    override_key = str(override or "").strip().lower()
    if override_key in LIFECYCLE_LABELS and override_key in LIFECYCLE_RANK:
        return LIFECYCLE_LABELS[override_key]

    matches: list[str] = []
    seen: set[str] = set()
    for raw in identifiers:
        text = str(raw or "").strip()
        if not text:
            continue
        key = lifecycle_key(text)
        if not key or key in seen:
            continue
        seen.add(key)
        candidates = [key, key[:-2]] if key.endswith("-0") else [key]
        for candidate in candidates:
            status = lookup_lifecycle_status(candidate, records)
            if status:
                matches.append(status)
    if override_key in LIFECYCLE_LABELS:
        return LIFECYCLE_LABELS[override_key]
    if not matches:
        return "—"
    return LIFECYCLE_LABELS[max(matches, key=lambda status: LIFECYCLE_RANK[status])]


def as_int(value: object) -> int | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return None


def as_float(value: object) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        number = float(value)
        return number if number == number and number not in {float("inf"), float("-inf")} else None
    return None


def first_relation(value: object) -> dict | None:
    if isinstance(value, list):
        first = value[0] if value else None
        return first if isinstance(first, dict) else None
    if isinstance(value, dict):
        return value
    return None


def maydai_score_from_evaluations(evaluations: list[dict]) -> int | None:
    scores = [score for row in evaluations if (score := as_float(row.get("score"))) is not None]
    if not scores:
        return None
    return round(sum(scores) / len(scores) * 100)


def load_catalog(client: SupabaseRest) -> tuple[list[ModelView], int]:
    models = client.fetch_all(
        "compl_ai_models",
        "id,slug,model_name,model_provider,model_provider_id,updated_at,llm_leader_rank,comparia_rank,lifecycle_status",
        order="id.asc",
    )
    evaluations = client.fetch_all(
        "compl_ai_evaluations",
        "model_id,score,maydai_score,rang_compar_ia",
        order="model_id.asc,principle_id.asc",
    )
    eco_models = client.fetch_all(
        "ecologits_models",
        "id,provider,name,is_active,last_seen_at,link:ecologits_model_links(maydai_model_id)",
        order="id.asc",
    )
    comparia_models = client.fetch_all(
        "comparia_models",
        "id,source_id,organisation,rank,is_active,last_imported_at,maydai_model_id",
        order="id.asc",
    )
    source_ids = client.fetch_all(
        "llm_model_source_ids",
        "model_id,source,source_id",
        order="id.asc",
    )
    system_cards = client.fetch_all(
        "llm_system_cards",
        "model_identifier",
        order="model_identifier.asc",
    )
    questionnaire_providers = client.fetch_all(
        "model_providers",
        "id",
        filters={"tooltip_title": "not.is.null"},
        order="id.asc",
    )
    compl_ai_total = client.count("compl_ai_benchmarks")
    if compl_ai_total <= 0:
        compl_ai_total = DEFAULT_COMPL_AI_BENCHMARK_TOTAL

    evaluations_by_model: dict[str, list[dict]] = defaultdict(list)
    for row in evaluations:
        model_id = str(row.get("model_id") or "")
        if model_id:
            evaluations_by_model[model_id].append(row)

    links_by_model: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for row in source_ids:
        source = str(row.get("source") or "")
        if source not in {"llm_stats", "ecologits", "comparia"}:
            continue
        model_id = str(row.get("model_id") or "")
        source_id = str(row.get("source_id") or "")
        if model_id and source_id:
            links_by_model[model_id].append((source, source_id))

    eco_by_maydai: dict[str, dict] = {}
    eco_names_by_maydai: dict[str, list[str]] = defaultdict(list)
    for eco in eco_models:
        link = first_relation(eco.get("link"))
        maydai_id = str((link or {}).get("maydai_model_id") or "")
        if maydai_id:
            eco_by_maydai[maydai_id] = eco
            eco_name = str(eco.get("name") or "").strip()
            if eco_name:
                eco_names_by_maydai[maydai_id].append(eco_name)

    lifecycle_records = load_lifecycle_records()

    comparia_by_maydai: dict[str, dict] = {}
    for comparia in comparia_models:
        maydai_id = str(comparia.get("maydai_model_id") or "")
        if maydai_id:
            comparia_by_maydai[maydai_id] = comparia

    system_card_slugs = {
        str(card.get("model_identifier") or "").strip()
        for card in system_cards
        if str(card.get("model_identifier") or "").strip()
    }
    questionnaire_ids = {provider_id for row in questionnaire_providers if (provider_id := as_int(row.get("id"))) is not None}

    views: list[ModelView] = []
    seen: set[str] = set()
    for model in models:
        model_id = str(model.get("id") or "")
        if not model_id or model_id in seen:
            continue
        seen.add(model_id)
        model_evaluations = evaluations_by_model.get(model_id, [])
        links = links_by_model.get(model_id, [])
        eco = eco_by_maydai.get(model_id)
        comparia = comparia_by_maydai.get(model_id)
        slug = str(model.get("slug") or "").strip() or str(model.get("model_name") or "").strip()
        raw_name = str(model.get("model_name") or "").strip() or slug
        score = maydai_score_from_evaluations(model_evaluations)
        has_compl_ai = any(as_float(row.get("score")) is not None for row in model_evaluations)
        has_comparia = bool(comparia) or any(source == "comparia" for source, _ in links) or as_int(model.get("comparia_rank")) is not None or any(
            as_int(row.get("rang_compar_ia")) is not None for row in model_evaluations
        )
        has_llm_stats = any(source == "llm_stats" for source, _ in links)
        has_ecologits = bool(eco) or any(source == "ecologits" for source, _ in links)
        has_maydai = score is not None
        sources = [has_maydai, has_compl_ai, has_comparia, has_llm_stats, has_ecologits]
        comparia_rank = as_int((comparia or {}).get("rank"))
        if comparia_rank is None:
            comparia_rank = as_int(model.get("comparia_rank"))
        if comparia_rank is None:
            comparia_rank = next((rank for row in model_evaluations if (rank := as_int(row.get("rang_compar_ia"))) is not None), None)
        provider_id = as_int(model.get("model_provider_id"))
        views.append(
            ModelView(
                provider=canonical_provider(model.get("model_provider")),
                name=raw_name,
                slug=slug,
                in_questionnaire=provider_id is not None and provider_id in questionnaire_ids,
                active=bool(eco.get("is_active")) if eco and eco.get("is_active") is not None else True,
                lifecycle=resolve_lifecycle(
                    [
                        slug,
                        model.get("model_name"),
                        *eco_names_by_maydai.get(model_id, []),
                        (eco or {}).get("name"),
                        *[source_id for _source, source_id in links],
                    ],
                    model.get("lifecycle_status"),
                    lifecycle_records,
                ),
                sources_filled=sum(1 for present in sources if present),
                maydai_score=score,
                compl_ai_filled=sum(1 for row in model_evaluations if as_float(row.get("score")) is not None),
                compl_ai_total=compl_ai_total,
                comparia_rank=comparia_rank,
                llm_stats_rank=as_int(model.get("llm_leader_rank")),
                has_maydai=has_maydai,
                has_compl_ai=has_compl_ai,
                has_comparia=has_comparia,
                has_llm_stats=has_llm_stats,
                has_ecologits=has_ecologits,
                has_system_card=slug in system_card_slugs,
            )
        )
    views.sort(key=lambda model: (model.provider.lower(), model.slug.lower()))
    return views, compl_ai_total


def provider_sort_key(name: str, tracked_only: bool) -> tuple[int, str]:
    if name in TRACKED_PROVIDERS:
        return (TRACKED_PROVIDERS.index(name), name.lower())
    if tracked_only:
        return (len(TRACKED_PROVIDERS) + 1, name.lower())
    return (len(TRACKED_PROVIDERS), name.lower())


def group_models(models: list[ModelView], include_other_providers: bool) -> tuple[list[ProviderGroup], int]:
    grouped: dict[str, list[ModelView]] = defaultdict(list)
    skipped = 0
    for model in models:
        tracked = model.provider in TRACKED_PROVIDERS
        if not tracked and not include_other_providers:
            skipped += 1
            continue
        grouped[model.provider].append(model)

    groups = [ProviderGroup(provider=provider, models=rows) for provider, rows in grouped.items()]
    groups.sort(key=lambda group: provider_sort_key(group.provider, tracked_only=not include_other_providers))
    return groups, skipped


def presence(available: bool) -> str:
    return "Oui" if available else "Non"


def rank_cell(rank: int | None) -> str:
    return f"#{rank}" if rank is not None else "—"


def ratio(filled: int, total: int) -> str:
    return f"{filled}/{total}"


def plain_cell(value: str) -> str:
    return " ".join(value.replace("\n", " ").split())


def model_values(model: ModelView) -> list[str]:
    maydai = f"{model.maydai_score}/100" if model.maydai_score is not None else "—"
    return [
        plain_cell(model.provider),
        plain_cell(model.name or model.slug),
        plain_cell(model.slug),
        presence(model.in_questionnaire),
        model.lifecycle,
        ratio(model.sources_filled, 5),
        maydai,
        ratio(model.compl_ai_filled, model.compl_ai_total),
        rank_cell(model.comparia_rank),
        rank_cell(model.llm_stats_rank),
        presence(model.has_ecologits),
        presence(model.has_system_card),
    ]


def build_sheet_rows(groups: list[ProviderGroup]) -> list[SheetRow]:
    rows = [SheetRow("header", HEADERS)]
    for group in groups:
        rows.extend(SheetRow("model", model_values(model)) for model in group.models)
    if len(rows) == 1:
        rows.append(SheetRow("model", ["Aucun modèle.", *([""] * (len(HEADERS) - 1))]))
    return rows


def column_letter(index: int) -> str:
    letters = ""
    while index > 0:
        index, remainder = divmod(index - 1, 26)
        letters = chr(65 + remainder) + letters
    return letters


def parse_folder_id(value: str) -> str:
    text = value.strip()
    if not text:
        raise SystemExit("Indiquez l’ID ou l’URL du dossier Drive (--folder ou GOOGLE_DRIVE_FOLDER_ID).")
    if "drive.google.com" in text or text.startswith("http"):
        match = FOLDER_ID_RE.search(text)
        if not match:
            raise SystemExit(f"URL de dossier Drive illisible : {text}")
        return match.group(1)
    if re.fullmatch(r"[a-zA-Z0-9_-]+", text):
        return text
    raise SystemExit(f"Identifiant de dossier Drive illisible : {text}")


def service_account_info_from_env() -> dict[str, str] | None:
    email = (
        os.environ.get("GOOGLE_DRIVE_CLIENT_EMAIL")
        or os.environ.get("GOOGLE_SERVICE_ACCOUNT_EMAIL")
        or ""
    ).strip()
    raw_key = os.environ.get("GOOGLE_DRIVE_PRIVATE_KEY") or os.environ.get("GOOGLE_PRIVATE_KEY") or ""
    if not email or not raw_key.strip():
        return None
    return {
        "type": "service_account",
        "client_email": email,
        "private_key": raw_key.replace("\\n", "\n"),
        "token_uri": "https://oauth2.googleapis.com/token",
    }


def load_google_credentials(credentials_cls, explicit_path: str | None):
    """Charge le compte de service déjà présent dans .env.local."""
    if explicit_path:
        path = Path(explicit_path)
        if not path.is_absolute():
            path = REPO_ROOT / path
        if not path.is_file():
            raise SystemExit(f"Clé de compte de service introuvable : {path}")
        credentials = credentials_cls.from_service_account_file(str(path), scopes=GOOGLE_SCOPES)
        return credentials, str(path)

    info = service_account_info_from_env()
    if info:
        credentials = credentials_cls.from_service_account_info(info, scopes=GOOGLE_SCOPES)
        return credentials, str(ENV_FILE)

    if DEFAULT_CREDENTIALS.is_file():
        credentials = credentials_cls.from_service_account_file(str(DEFAULT_CREDENTIALS), scopes=GOOGLE_SCOPES)
        return credentials, str(DEFAULT_CREDENTIALS)

    raise SystemExit(
        "Compte de service introuvable dans .env.local "
        "(GOOGLE_DRIVE_CLIENT_EMAIL et GOOGLE_DRIVE_PRIVATE_KEY)."
    )


def print_preview(rows: list[SheetRow]) -> None:
    widths = [len(header) for header in HEADERS]
    printable = [row.values for row in rows]
    for values in printable:
        for index, value in enumerate(values):
            widths[index] = min(42, max(widths[index], len(value.replace("\n", " / "))))
    for values in printable:
        cells = [value.replace("\n", " / ")[:42].ljust(widths[index]) for index, value in enumerate(values)]
        print(" | ".join(cells))


def write_google_sheet(rows: list[SheetRow], folder_id: str, explicit_credentials: str | None, title: str) -> str:
    try:
        import gspread
        from google.auth.transport.requests import AuthorizedSession
        from google.oauth2.service_account import Credentials
        from gspread_formatting import CellFormat, Color, TextFormat, format_cell_range, set_frozen
    except ImportError as error:
        raise SystemExit(
            "Dépendances manquantes. Installez-les avec :\n"
            "python3 -m pip install gspread google-auth gspread-formatting"
        ) from error

    credentials, credentials_source = load_google_credentials(Credentials, explicit_credentials)
    client_email = getattr(credentials, "service_account_email", "")
    print(f"Compte de service : {client_email} ({credentials_source})")
    session = AuthorizedSession(credentials)
    spreadsheet_id = find_or_create_spreadsheet(session, title, folder_id, client_email)
    gc = gspread.authorize(credentials)
    spreadsheet = gc.open_by_key(spreadsheet_id)
    worksheet = reset_worksheet(spreadsheet, WORKSHEET_TITLE, max(len(rows) + 5, 20), len(HEADERS))
    worksheet.update([row.values for row in rows], "A1", value_input_option="RAW")

    if len(COLUMN_WIDTHS) != len(HEADERS):
        raise SystemExit("COLUMN_WIDTHS et HEADERS n'ont pas le même nombre de colonnes.")
    last_row = max(len(rows), 1)
    last_column = column_letter(len(HEADERS))
    header_format = CellFormat(
        backgroundColor=Color(0.953, 0.957, 0.965),
        textFormat=TextFormat(bold=True, fontSize=9),
        horizontalAlignment="CENTER",
        verticalAlignment="MIDDLE",
        wrapStrategy="WRAP",
    )
    format_cell_range(worksheet, f"A1:{last_column}1", header_format)
    set_frozen(worksheet, rows=1)
    worksheet.set_basic_filter(f"A1:{last_column}{last_row}")
    spreadsheet.batch_update(
        {
            "requests": [
                {
                    "updateDimensionProperties": {
                        "range": {
                            "sheetId": worksheet.id,
                            "dimension": "ROWS",
                            "startIndex": 0,
                            "endIndex": 1,
                        },
                        "properties": {"pixelSize": 36},
                        "fields": "pixelSize",
                    }
                },
                *[
                    {
                        "updateDimensionProperties": {
                            "range": {
                                "sheetId": worksheet.id,
                                "dimension": "COLUMNS",
                                "startIndex": index,
                                "endIndex": index + 1,
                            },
                            "properties": {"pixelSize": width},
                            "fields": "pixelSize",
                        }
                    }
                    for index, width in enumerate(COLUMN_WIDTHS)
                ],
            ]
        }
    )
    return f"https://docs.google.com/spreadsheets/d/{spreadsheet.id}"


def find_or_create_spreadsheet(session, title: str, folder_id: str, client_email: str) -> str:
    escaped = title.replace("\\", "\\\\").replace("'", "\\'")
    query = (
        "mimeType = 'application/vnd.google-apps.spreadsheet' "
        f"and name = '{escaped}' and '{folder_id}' in parents and trashed = false"
    )
    response = session.get(
        "https://www.googleapis.com/drive/v3/files",
        params={
            "q": query,
            "supportsAllDrives": "true",
            "includeItemsFromAllDrives": "true",
            "corpora": "allDrives",
            "orderBy": "modifiedTime desc",
            "fields": "files(id,name)",
            "pageSize": 5,
        },
    )
    _raise_for_drive(response, client_email, folder_id)
    files = response.json().get("files") or []
    if files:
        return str(files[0]["id"])

    created = session.post(
        "https://www.googleapis.com/drive/v3/files",
        params={"supportsAllDrives": "true", "fields": "id"},
        json={
            "name": title,
            "mimeType": "application/vnd.google-apps.spreadsheet",
            "parents": [folder_id],
        },
    )
    _raise_for_drive(created, client_email, folder_id)
    return str(created.json()["id"])


def _raise_for_drive(response, client_email: str, folder_id: str) -> None:
    if response.status_code < 400:
        return
    hint = ""
    if response.status_code in {403, 404}:
        hint = (
            f"\nPartagez le dossier {folder_id} avec {client_email or 'le compte de service'} "
            "en droit Éditeur (les Drive partagés exigent aussi que le compte soit membre)."
        )
    raise SystemExit(f"Google Drive {response.status_code}: {response.text}{hint}")


def reset_worksheet(spreadsheet, title: str, rows: int, cols: int):
    existing = {worksheet.title: worksheet for worksheet in spreadsheet.worksheets()}
    if title in existing and len(existing) == 1:
        placeholder = spreadsheet.add_worksheet("_tmp_export", rows=1, cols=1)
        spreadsheet.del_worksheet(existing[title])
        worksheet = spreadsheet.add_worksheet(title, rows=rows, cols=cols)
        spreadsheet.del_worksheet(placeholder)
        return worksheet
    if title in existing:
        spreadsheet.del_worksheet(existing[title])
    worksheet = spreadsheet.add_worksheet(title, rows=rows, cols=cols)
    for other in spreadsheet.worksheets():
        if other.id != worksheet.id:
            spreadsheet.del_worksheet(other)
    return worksheet


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Exporte le suivi de synchronisation LLM vers Google Sheets.")
    parser.add_argument(
        "--folder",
        default=os.environ.get("GOOGLE_DRIVE_FOLDER_ID", ""),
        help="ID ou URL du dossier Drive de destination (ou GOOGLE_DRIVE_FOLDER_ID).",
    )
    parser.add_argument(
        "--credentials",
        default="",
        help="JSON de compte de service. Par défaut : GOOGLE_DRIVE_CLIENT_EMAIL et GOOGLE_DRIVE_PRIVATE_KEY dans .env.local.",
    )
    parser.add_argument("--title", default=SPREADSHEET_TITLE, help="Nom du classeur Google Sheets.")
    parser.add_argument(
        "--all-providers",
        action="store_true",
        help="Inclure aussi les fournisseurs hors de la liste de suivi (Anthropic, DeepSeek, Google, …).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Affiche le tableau dans le terminal, sans écrire dans Google Sheets.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    url, key = supabase_config()
    client = SupabaseRest(url, key)
    models, compl_ai_total = load_catalog(client)
    groups, skipped = group_models(models, include_other_providers=args.all_providers)
    rows = build_sheet_rows(groups)
    in_questionnaire = sum(1 for group in groups if group.in_questionnaire)
    catalog_only = len(groups) - in_questionnaire
    exported_models = sum(len(group.models) for group in groups)
    print(
        f"{exported_models} modèle(s) · {in_questionnaire} fournisseur(s) dans les questionnaires · "
        f"{catalog_only} hors questionnaires · benchmarks COMPL-AI : {compl_ai_total}"
    )
    if skipped:
        print(f"{skipped} modèle(s) hors liste de suivi ignorés (relancer avec --all-providers pour les inclure).")

    if args.dry_run:
        print_preview(rows)
        return

    folder_id = parse_folder_id(args.folder)
    sheet_url = write_google_sheet(rows, folder_id, args.credentials or None, args.title)
    print(f"Feuille mise à jour : {sheet_url}")


if __name__ == "__main__":
    main()
