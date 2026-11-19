#!/usr/bin/env python3
"""Génère un CSV de correspondance EcoLogits ↔ fiches MaydAI (hub canonique)."""

from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path

ECO_DUMP = Path(
    "/Users/thomaschippeaux/.cursor/projects/Users-thomaschippeaux-Desktop-workspacemaydai-maydai-nextjs/agent-tools/1fb5fca5-5667-43f1-a200-281a4ffb8fa8.txt"
)
MAYDAI_DUMP = Path(
    "/Users/thomaschippeaux/.cursor/projects/Users-thomaschippeaux-Desktop-workspacemaydai-maydai-nextjs/agent-tools/53937f36-31d7-4bb5-9f81-7e83fe82e949.txt"
)

OUT_DIR = Path("/Users/thomaschippeaux/Desktop/workspacemaydai/maydai-nextjs/tmp")
OUT_CSV = OUT_DIR / "ecologits-correspondance.csv"
OUT_MISTRAL = OUT_DIR / "ecologits-correspondance-mistral.csv"

PROVIDER_ALIASES = {
    "google": "google",
    "googleai": "google",
    "googledeepmind": "google",
    "googlegenai": "google",
    "google_genai": "google",
    "mistralai": "mistral",
    "mistral": "mistral",
    "mistralcommunity": "mistral",
    "openai": "openai",
    "anthropic": "anthropic",
    "cohere": "cohere",
    "cohereforai": "cohere",
    "meta": "meta",
    "metalama": "meta",
    "llama": "meta",
    "facebook": "meta",
    "microsoft": "microsoft",
    "azure": "microsoft",
    "qwen": "qwen",
    "alibaba": "qwen",
    "xai": "xai",
    "x-ai": "xai",
    "deepseek": "deepseek",
    "deepseekai": "deepseek",
    "nvidia": "nvidia",
    "perplexity": "perplexity",
    "huggingfacehub": "huggingface",
    "huggingface_hub": "huggingface",
}

HF_ORG_TO_PROVIDER = {
    "google": "google",
    "meta-llama": "meta",
    "facebook": "meta",
    "mistralai": "mistral",
    "mistral-community": "mistral",
    "microsoft": "microsoft",
    "cohereforai": "cohere",
    "openai": "openai",
    "databricks": "databricks",
}

NOISE_TOKENS = {
    "latest",
    "preview",
    "experimental",
    "customtools",
    "image",
    "gguf",
    "pytorch",
    "keras",
    "tflite",
    "4bit",
    "instruct",
    "instructed",
    "instruction",
    "it",
    "chat",
    "base",
    "reasoning",
    "open",
    "hub",
    "hf",
    "community",
    "forai",
    "001",
    "rc5",
    "rc",
    "litert",
}

PACKAGING_RE = re.compile(
    r"-(?:gguf|pytorch|keras|tflite|4bit|it|instruct|instructed)$",
    re.I,
)
DATE_RE = re.compile(r"(?:^|-)(?:\d{4}-\d{2}-\d{2}|\d{8}|\d{4})(?:-|$)")
YYMM_RE = re.compile(r"(?:^|-)((?:2[0-6])(?:0[1-9]|1[0-2]))(?:-|$)")


def load_wrapped(path: Path) -> list[dict]:
    text = json.loads(path.read_text())
    match = re.search(r"<untrusted-data-[^>]+>\n(\[.*\])\n</untrusted-data-", text, re.S)
    if not match:
        raise SystemExit(f"Impossible de parser {path}")
    return json.loads(match.group(1))


def compact(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def provider_key(value: str | None) -> str:
    raw = (value or "").strip().lower().replace(" ", "")
    alnum = compact(raw)
    return PROVIDER_ALIASES.get(raw) or PROVIDER_ALIASES.get(alnum) or alnum or "inconnu"


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return re.sub(r"-+", "-", slug)


def strip_packaging(name: str) -> str:
    current = name
    for _ in range(4):
        nxt = PACKAGING_RE.sub("", current)
        if nxt == current:
            break
        current = nxt
    return current


def strip_dates(name: str) -> str:
    current = name
    current = re.sub(r"-\d{4}-\d{2}-\d{2}", "", current)
    current = re.sub(r"-\d{8}", "", current)
    current = re.sub(r"-(?:2[0-6](?:0[1-9]|1[0-2]))(?=$|-)", "", current)
    current = re.sub(r"-latest$", "", current, flags=re.I)
    current = re.sub(r"-(?:preview|rc\d+)$", "", current, flags=re.I)
    current = re.sub(r"-0*\d{1,3}$", lambda m: "" if len(m.group(0)) <= 4 else m.group(0), current)
    return current.strip("-")


def core_name(name: str) -> str:
    return slugify(strip_dates(strip_packaging(name)))


def tokens(value: str) -> list[str]:
    parts = [p for p in re.split(r"[^a-z0-9]+", (value or "").lower()) if p]
    return [p for p in parts if p not in NOISE_TOKENS]


def size_tokens(toks: list[str]) -> set[str]:
    sizes = set()
    for tok in toks:
        if re.fullmatch(r"\d+[bm]", tok) or re.fullmatch(r"[ae]\d+b", tok) or re.fullmatch(r"\d+ba\d+b", tok):
            sizes.add(tok)
        if re.fullmatch(r"\d+b-a\d+b", tok):
            sizes.add(tok.replace("-", ""))
    joined = "".join(toks)
    for match in re.finditer(r"(\d+)b(?:a(\d+)b)?", joined):
        sizes.add(f"{match.group(1)}b" + (f"a{match.group(2)}b" if match.group(2) else ""))
    return sizes


def extract_hf(name: str) -> tuple[str | None, str]:
    if "/" not in name:
        return None, name
    org, rest = name.split("/", 1)
    return org, rest


def effective_provider(eco: dict) -> str:
    if eco["provider"] == "huggingface_hub":
        org, _ = extract_hf(eco["name"])
        if org:
            mapped = HF_ORG_TO_PROVIDER.get(org.lower())
            if mapped:
                return mapped
    return provider_key(eco["provider"])


def working_name(eco: dict) -> str:
    if eco["provider"] == "huggingface_hub":
        _, rest = extract_hf(eco["name"])
        return rest
    return eco["name"]


def jaccard(a: list[str], b: list[str]) -> float:
    sa, sb = set(a), set(b)
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def prefer_instruct(name: str) -> int:
    lower = name.lower()
    if "instruct" in lower or lower.endswith(" it") or "-it" in lower:
        return 2
    if "reasoning" in lower:
        return 0
    if "base" in lower:
        return 0
    return 1


def score_candidate(eco: dict, model: dict) -> tuple[int, str]:
    eco_provider = effective_provider(eco)
    model_provider = provider_key(model.get("model_provider"))
    same_provider = eco_provider == model_provider
    eco_work = working_name(eco)
    eco_core = core_name(eco_work)
    model_core = core_name(model["model_name"])
    model_slug = model.get("slug") or slugify(model["model_name"])
    eco_slug = core_name(eco_work)
    eco_compact = compact(eco_work)
    model_compact = compact(model["model_name"])
    eco_toks = tokens(eco_work)
    model_toks = tokens(model["model_name"]) + tokens(model_slug)
    eco_sizes = size_tokens(tokens(eco_work))
    model_sizes = size_tokens(tokens(model["model_name"]) + tokens(model_slug))

    if compact(eco["name"]) == compact(model["model_name"]) and same_provider:
        return 100, "exact_normalise"
    if eco_compact == model_compact and same_provider:
        return 98, "exact_normalise"
    if eco_slug == model_slug or eco_slug == slugify(model["model_name"]):
        return 96, "slug"
    if eco_core and eco_core == model_core and same_provider:
        return 92, "alias_api"
    if eco_core and eco_core == slugify(strip_packaging(model_slug)) and same_provider:
        return 90, "alias_api"
    if same_provider and eco_core and (eco_core == model_slug or model_slug.startswith(eco_core) or eco_core.startswith(model_slug)):
        if eco_sizes and model_sizes and eco_sizes.isdisjoint(model_sizes):
            return 35, "famille_taille_differente"
        return 82, "slug_partiel"
    if same_provider and eco_compact and eco_compact in model_compact:
        if eco_sizes and model_sizes and not eco_sizes.isdisjoint(model_sizes):
            return 80, "nom_contenu"
        if not eco_sizes:
            return 70, "nom_contenu"

    overlap = jaccard(eco_toks, model_toks)
    shared_size = bool(eco_sizes and model_sizes and not eco_sizes.isdisjoint(model_sizes))
    family_hit = bool(set(eco_toks) & set(model_toks) - {"3", "2", "1", "4", "5", "6", "7", "8"})

    if not same_provider:
        if overlap >= 0.7 and shared_size:
            return 60, "huggingface_poids"
        return 0, "aucun"

    if shared_size and overlap >= 0.45:
        return 78, "famille_taille"
    if family_hit and overlap >= 0.35 and not (eco_sizes and model_sizes and eco_sizes.isdisjoint(model_sizes)):
        return 55, "famille"
    if family_hit and eco_sizes and model_sizes and eco_sizes.isdisjoint(model_sizes):
        return 28, "famille_taille_differente"
    if overlap >= 0.5:
        return 50, "chevauchement"
    return 0, "aucun"


def rank_candidates(eco: dict, models: list[dict]) -> list[tuple[int, str, dict]]:
    ranked: list[tuple[int, str, dict]] = []
    for model in models:
        score, method = score_candidate(eco, model)
        if score <= 0:
            continue
        if method != "famille_taille_differente":
            score += prefer_instruct(model["model_name"])
            eco_dates = set(re.findall(r"2[0-6](?:0[1-9]|1[0-2])", working_name(eco)))
            model_dates = set(re.findall(r"2[0-6](?:0[1-9]|1[0-2])", model["model_name"] + (model.get("slug") or "")))
            if eco_dates and eco_dates & model_dates:
                score += 12
            lower = model["model_name"].lower()
            if "eagle" in lower or "nvfp4" in lower:
                score -= 8
            if model.get("slug") in {"ministral-3", "mistral-large-3-675b"}:
                score -= 6
        ranked.append((score, method, model))
    ranked.sort(key=lambda row: (-row[0], row[2]["model_name"]))
    # keep top distinct ids
    seen: set[str] = set()
    unique: list[tuple[int, str, dict]] = []
    for row in ranked:
        model_id = row[2]["id"]
        if model_id in seen:
            continue
        seen.add(model_id)
        unique.append(row)
        if len(unique) >= 6:
            break
    return unique


def confidence_label(score: int, method: str, n_high: int) -> str:
    if method == "famille_taille_differente":
        return "basse"
    if n_high > 1 and score < 90:
        return "moyenne"
    if score >= 82:
        return "haute"
    if score >= 55:
        return "moyenne"
    if score >= 28:
        return "basse"
    return ""


def statut_for(score: int, method: str, n_high: int, linked: bool) -> str:
    if linked:
        return "lie"
    if score <= 0:
        return "orphelin"
    if method == "famille_taille_differente":
        return "famille_a_confirmer"
    if n_high > 1 and score < 92:
        return "plusieurs_candidats"
    if score >= 55:
        return "proposition"
    return "famille_a_confirmer"


def main() -> None:
    eco_rows = load_wrapped(ECO_DUMP)
    maydai_rows = load_wrapped(MAYDAI_DUMP)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    by_provider: dict[str, list[dict]] = defaultdict(list)
    for model in maydai_rows:
        by_provider[provider_key(model.get("model_provider"))].append(model)

    fieldnames = [
        "statut",
        "confiance",
        "a_valider",
        "eco_provider",
        "eco_name",
        "eco_id",
        "maydai_id",
        "maydai_provider",
        "maydai_name",
        "maydai_slug",
        "methode",
        "autres_candidats",
        "action",
        "commentaire",
    ]

    out_rows: list[dict] = []
    for eco in eco_rows:
        linked = bool(eco.get("maydai_model_id"))
        ranked = rank_candidates(eco, maydai_rows)
        high = [row for row in ranked if row[0] >= 70]
        best = ranked[0] if ranked else None
        chosen = None
        method = "aucun"
        score = 0
        if linked:
            chosen = {
                "id": eco["maydai_model_id"],
                "model_provider": eco.get("model_provider"),
                "model_name": eco.get("model_name"),
                "slug": eco.get("slug"),
            }
            method = f"deja_lie_{eco.get('match_method') or 'exact'}"
        elif best and best[1] != "famille_taille_differente":
            score, method, chosen = best
        elif best:
            score, method, _family_only = best

        n_high = len(high)
        statut = statut_for(score if not linked else 100, method, n_high, linked)
        confiance = "haute" if linked else confidence_label(score, method, n_high)
        if linked:
            others = ranked[1:]
        elif method == "famille_taille_differente":
            others = ranked
        else:
            others = ranked[1:]
        other_txt = " || ".join(
            f"{row[2]['model_provider']} / {row[2]['model_name']} [{row[2]['id'][:8]}…] ({row[1]}, {row[0]})"
            for row in others[:4]
        )

        comments: list[str] = []
        if eco["provider"] == "huggingface_hub":
            comments.append("Poids Hugging Face : plusieurs formats (GGUF, PyTorch…) = souvent la même fiche.")
        if method == "alias_api":
            comments.append("Alias API (-latest, date YYMM, -001) d’une fiche déjà nommée autrement.")
        if method == "famille_taille_differente":
            comments.append(
                "Pas d’équivalent de même taille dans MaydAI. autres_candidats = même famille seulement (ex. Gemma 7B vs Gemma 2 9B), à trancher à la main."
            )
        if linked and ranked:
            alt = next((row for row in ranked if row[2]["id"] != eco.get("maydai_model_id")), None)
            if alt and alt[0] >= 80:
                comments.append(f"Autre fiche proche : {alt[2]['model_name']}")
        if statut == "plusieurs_candidats":
            comments.append("Plusieurs fiches MaydAI possibles : choisir celle du produit (souvent Instruct, pas Base).")

        out_rows.append(
            {
                "statut": statut,
                "confiance": confiance,
                "a_valider": "NON" if linked else ("OUI" if statut != "orphelin" else "OUI-orphelin"),
                "eco_provider": eco["provider"],
                "eco_name": eco["name"],
                "eco_id": eco["eco_id"],
                "maydai_id": (chosen or {}).get("id") or "",
                "maydai_provider": (chosen or {}).get("model_provider") or "",
                "maydai_name": (chosen or {}).get("model_name") or "",
                "maydai_slug": (chosen or {}).get("slug") or "",
                "methode": method,
                "autres_candidats": other_txt,
                "action": "" if linked else "",
                "commentaire": " ".join(comments),
            }
        )

    statut_order = {
        "proposition": 0,
        "plusieurs_candidats": 1,
        "famille_a_confirmer": 2,
        "orphelin": 3,
        "lie": 4,
    }
    out_rows.sort(
        key=lambda row: (
            row["eco_provider"],
            statut_order.get(row["statut"], 9),
            row["eco_name"],
        )
    )

    def write_csv(path: Path, rows: list[dict]) -> None:
        with path.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    write_csv(OUT_CSV, out_rows)
    write_csv(
        OUT_MISTRAL,
        [
            row
            for row in out_rows
            if row["eco_provider"] == "mistralai"
            or (
                row["eco_provider"] == "huggingface_hub"
                and row["eco_name"].lower().startswith(("mistralai/", "mistral-community/"))
            )
        ],
    )

    counts = defaultdict(int)
    for row in out_rows:
        counts[row["statut"]] += 1
    mistral = [row for row in out_rows if row["eco_provider"] == "mistralai"]
    mistral_counts = defaultdict(int)
    for row in mistral:
        mistral_counts[row["statut"]] += 1

    print(f"CSV: {OUT_CSV}")
    print(f"Mistral: {OUT_MISTRAL}")
    print("global", dict(counts), "total", len(out_rows))
    print("mistralai", dict(mistral_counts), "total", len(mistral))
    print("propositions haute", sum(1 for r in out_rows if r["confiance"] == "haute" and r["statut"] != "lie"))


if __name__ == "__main__":
    main()
