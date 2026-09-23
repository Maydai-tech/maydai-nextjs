#!/usr/bin/env python3
"""Aligne tmp/ecologits-correspondance.csv sur le plan de réconciliation OpenAI."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = REPO_ROOT / "tmp" / "ecologits-correspondance.csv"

# eco_name -> (slug, maydai_name, maydai_id or None)
OPENAI_PLAN: dict[str, tuple[str, str, str | None]] = {
    "chat-latest": ("chat-latest", "Chat Latest", None),
    "gpt-3.5-turbo": ("gpt-3-5-turbo", "GPT-3.5 Turbo", "e4df3897-deca-4fbb-a19d-7c7e8cbd33c2"),
    "gpt-3.5-turbo-0125": ("gpt-3-5-turbo", "GPT-3.5 Turbo", "e4df3897-deca-4fbb-a19d-7c7e8cbd33c2"),
    "gpt-3.5-turbo-1106": ("gpt-3-5-turbo", "GPT-3.5 Turbo", "e4df3897-deca-4fbb-a19d-7c7e8cbd33c2"),
    "gpt-3.5-turbo-16k": ("gpt-3-5-turbo", "GPT-3.5 Turbo", "e4df3897-deca-4fbb-a19d-7c7e8cbd33c2"),
    "gpt-3.5-turbo-instruct": ("gpt-3-5-turbo-instruct", "GPT-3.5 Turbo Instruct", None),
    "gpt-3.5-turbo-instruct-0914": ("gpt-3-5-turbo-instruct", "GPT-3.5 Turbo Instruct", None),
    "gpt-35-turbo": ("gpt-3-5-turbo", "GPT-3.5 Turbo", "e4df3897-deca-4fbb-a19d-7c7e8cbd33c2"),
    "gpt-35-turbo-0125": ("gpt-3-5-turbo", "GPT-3.5 Turbo", "e4df3897-deca-4fbb-a19d-7c7e8cbd33c2"),
    "gpt-35-turbo-1106": ("gpt-3-5-turbo", "GPT-3.5 Turbo", "e4df3897-deca-4fbb-a19d-7c7e8cbd33c2"),
    "gpt-35-turbo-16k": ("gpt-3-5-turbo", "GPT-3.5 Turbo", "e4df3897-deca-4fbb-a19d-7c7e8cbd33c2"),
    "gpt-35-turbo-instruct": ("gpt-3-5-turbo-instruct", "GPT-3.5 Turbo Instruct", None),
    "gpt-35-turbo-instruct-0914": ("gpt-3-5-turbo-instruct", "GPT-3.5 Turbo Instruct", None),
    "gpt-4": ("gpt-4", "GPT-4", "70614081-558f-4e5b-81ad-9aa0b7790c0b"),
    "gpt-4-0613": ("gpt-4", "GPT-4", "70614081-558f-4e5b-81ad-9aa0b7790c0b"),
    "gpt-4-turbo": ("gpt-4-turbo", "GPT-4 Turbo", "b90de811-9c55-4571-8472-3f58ec36266c"),
    "gpt-4-turbo-2024-04-09": ("gpt-4-turbo", "GPT-4 Turbo", "b90de811-9c55-4571-8472-3f58ec36266c"),
    "gpt-4.1": ("gpt-4-1", "GPT-4.1", "a1922a35-dfab-4aea-ad3a-38b76402b8a5"),
    "gpt-4.1-2025-04-14": ("gpt-4-1", "GPT-4.1", "a1922a35-dfab-4aea-ad3a-38b76402b8a5"),
    "gpt-4.1-mini": ("gpt-4-1-mini", "GPT-4.1 mini", "2f82f5cf-9346-4a99-8e4b-49ba0dafa4d6"),
    "gpt-4.1-mini-2025-04-14": ("gpt-4-1-mini", "GPT-4.1 mini", "2f82f5cf-9346-4a99-8e4b-49ba0dafa4d6"),
    "gpt-4.1-nano": ("gpt-4-1-nano", "GPT-4.1 nano", "a130e4c5-545d-4f33-b292-0da856dcd200"),
    "gpt-4.1-nano-2025-04-14": ("gpt-4-1-nano", "GPT-4.1 nano", "a130e4c5-545d-4f33-b292-0da856dcd200"),
    "gpt-4o": ("gpt-4o", "GPT-4o", "922aa8c2-e18b-4433-8ca3-951d549e23da"),
    "gpt-4o-2024-05-13": ("gpt-4o", "GPT-4o", "922aa8c2-e18b-4433-8ca3-951d549e23da"),
    "gpt-4o-2024-08-06": ("gpt-4o", "GPT-4o", "922aa8c2-e18b-4433-8ca3-951d549e23da"),
    "gpt-4o-2024-11-20": ("gpt-4o", "GPT-4o", "922aa8c2-e18b-4433-8ca3-951d549e23da"),
    "gpt-4o-mini": ("gpt-4o-mini", "GPT-4o mini", "bf0217a4-1b1d-466d-a209-fddda089a37a"),
    "gpt-4o-mini-2024-07-18": ("gpt-4o-mini", "GPT-4o mini", "bf0217a4-1b1d-466d-a209-fddda089a37a"),
    "gpt-5": ("gpt-5", "GPT-5", "b0d3c769-5294-4fd0-be8b-fcb50d4ad9c1"),
    "gpt-5-2025-08-07": ("gpt-5", "GPT-5", "b0d3c769-5294-4fd0-be8b-fcb50d4ad9c1"),
    "gpt-5-chat-latest": ("gpt-5-chat", "GPT-5 Chat", None),
    "gpt-5-codex": ("gpt-5-codex", "GPT-5 Codex", "741cd5d8-ace1-4e91-a4fd-7fff7bbc9e0c"),
    "gpt-5-mini": ("gpt-5-mini", "GPT-5 mini", "09f243c3-b94f-49c2-b65e-662cabb7506e"),
    "gpt-5-mini-2025-08-07": ("gpt-5-mini", "GPT-5 mini", "09f243c3-b94f-49c2-b65e-662cabb7506e"),
    "gpt-5-nano": ("gpt-5-nano", "GPT-5 nano", "161aa9c8-140e-4a9e-8405-148f713921cf"),
    "gpt-5-nano-2025-08-07": ("gpt-5-nano", "GPT-5 nano", "161aa9c8-140e-4a9e-8405-148f713921cf"),
    "gpt-5-pro": ("gpt-5-pro", "GPT-5 Pro", None),
    "gpt-5-pro-2025-10-06": ("gpt-5-pro", "GPT-5 Pro", None),
    "gpt-5-search-api": ("gpt-5-search-api", "GPT-5 Search API", None),
    "gpt-5-search-api-2025-10-14": ("gpt-5-search-api", "GPT-5 Search API", None),
    "gpt-5.1": ("gpt-5-1", "GPT-5.1", "e565fdb0-0ba9-4c5e-bc5e-5805d8c2d5b7"),
    "gpt-5.1-2025-11-13": ("gpt-5-1", "GPT-5.1", "e565fdb0-0ba9-4c5e-bc5e-5805d8c2d5b7"),
    "gpt-5.1-codex": ("gpt-5-1-codex", "GPT-5.1 Codex", "21c22c80-d21f-4eac-b8a3-5b5a0d13119f"),
    "gpt-5.1-codex-mini": ("gpt-5-1-codex-mini", "GPT-5.1 Codex Mini", "3dbb0635-674e-4272-bc1d-843de75552b8"),
    "gpt-5.2": ("gpt-5-2", "GPT-5.2", "6c3a7049-b6c4-436e-b5cf-83ecd7c968c6"),
    "gpt-5.2-2025-12-11": ("gpt-5-2", "GPT-5.2", "6c3a7049-b6c4-436e-b5cf-83ecd7c968c6"),
    "gpt-5.2-codex": ("gpt-5-2-codex", "GPT-5.2 Codex", "a046cb04-7ae2-40dc-ae6d-4fa1ae90662f"),
    "gpt-5.2-pro": ("gpt-5-2-pro", "GPT-5.2 Pro", "6e669235-b2c2-463f-bf1a-3e8997a6f3f6"),
    "gpt-5.2-pro-2025-12-11": ("gpt-5-2-pro", "GPT-5.2 Pro", "6e669235-b2c2-463f-bf1a-3e8997a6f3f6"),
    "gpt-5.3-chat-latest": ("gpt-5-3-chat", "GPT-5.3 Chat", "51033e2f-fe47-474d-bd05-d44fb0ae0d23"),
    "gpt-5.3-codex": ("gpt-5-3-codex", "GPT-5.3 Codex", "1cdf79ea-90a5-46f6-8992-44a9d9b0437b"),
    "gpt-5.4": ("gpt-5-4", "GPT-5.4", "6661e89c-ddbb-4732-ba50-4a5cde63a9e8"),
    "gpt-5.4-2026-03-05": ("gpt-5-4", "GPT-5.4", "6661e89c-ddbb-4732-ba50-4a5cde63a9e8"),
    "gpt-5.4-mini": ("gpt-5-4-mini", "GPT-5.4 mini", "a9d64e88-0032-4f55-b1e5-bffc55634e58"),
    "gpt-5.4-mini-2026-03-17": ("gpt-5-4-mini", "GPT-5.4 mini", "a9d64e88-0032-4f55-b1e5-bffc55634e58"),
    "gpt-5.4-nano": ("gpt-5-4-nano", "GPT-5.4 nano", "3e63a3ee-bf98-473c-a185-148550e4de29"),
    "gpt-5.4-nano-2026-03-17": ("gpt-5-4-nano", "GPT-5.4 nano", "3e63a3ee-bf98-473c-a185-148550e4de29"),
    "gpt-5.5": ("gpt-5-5", "GPT-5.5", "467b73d4-7770-43de-86e1-7b18ff6cf8de"),
    "gpt-5.5-2026-04-23": ("gpt-5-5", "GPT-5.5", "467b73d4-7770-43de-86e1-7b18ff6cf8de"),
    "gpt-5.5-pro": ("gpt-5-5-pro", "GPT-5.5 Pro", "32487b9e-1093-42e9-9e76-94196751b506"),
    "gpt-5.5-pro-2026-04-23": ("gpt-5-5-pro", "GPT-5.5 Pro", "32487b9e-1093-42e9-9e76-94196751b506"),
    "o1": ("o1", "o1", "5d431475-7bb7-4987-914d-7a90f97504ec"),
    "o1-2024-12-17": ("o1", "o1", "5d431475-7bb7-4987-914d-7a90f97504ec"),
    "o3-mini": ("o3-mini", "o3-mini", "7e5435bc-403d-46aa-8be0-159c23c931e8"),
    "o3-mini-2025-01-31": ("o3-mini", "o3-mini", "7e5435bc-403d-46aa-8be0-159c23c931e8"),
    "o4-mini": ("o4-mini", "o4-mini", "296407b8-922e-451b-834a-0a6198a313ec"),
    "o4-mini-2025-04-16": ("o4-mini", "o4-mini", "296407b8-922e-451b-834a-0a6198a313ec"),
    "o4-mini-deep-research": ("o4-mini-deep-research", "o4-mini Deep Research", None),
    "o4-mini-deep-research-2025-06-26": ("o4-mini-deep-research", "o4-mini Deep Research", None),
    "gpt-4o-mini-search-preview": ("gpt-4o-mini-search-preview", "GPT-4o mini Search Preview", None),
    "gpt-4o-mini-search-preview-2025-03-11": ("gpt-4o-mini-search-preview", "GPT-4o mini Search Preview", None),
    "gpt-4o-mini-transcribe": ("gpt-4o-mini-transcribe", "GPT-4o mini Transcribe", None),
    "gpt-4o-mini-transcribe-2025-03-20": ("gpt-4o-mini-transcribe", "GPT-4o mini Transcribe", None),
    "gpt-4o-mini-transcribe-2025-12-15": ("gpt-4o-mini-transcribe", "GPT-4o mini Transcribe", None),
    "gpt-4o-mini-tts": ("gpt-4o-mini-tts", "GPT-4o mini TTS", None),
    "gpt-4o-mini-tts-2025-03-20": ("gpt-4o-mini-tts", "GPT-4o mini TTS", None),
    "gpt-4o-mini-tts-2025-12-15": ("gpt-4o-mini-tts", "GPT-4o mini TTS", None),
    "gpt-4o-search-preview": ("gpt-4o-search-preview", "GPT-4o Search Preview", None),
    "gpt-4o-search-preview-2025-03-11": ("gpt-4o-search-preview", "GPT-4o Search Preview", None),
    "gpt-5.1-chat-latest": ("gpt-5-1-chat", "GPT-5.1 Chat", None),
    "gpt-5.1-codex-max": ("gpt-5-1-codex-max", "GPT-5.1 Codex Max", None),
    "gpt-5.2-chat-latest": ("gpt-5-2-chat", "GPT-5.2 Chat", None),
    "gpt-5.4-pro": ("gpt-5-4-pro", "GPT-5.4 Pro", None),
    "gpt-5.4-pro-2026-03-05": ("gpt-5-4-pro", "GPT-5.4 Pro", None),
}


def apply_plan(slug_ids: dict[str, str] | None = None) -> int:
    ids = slug_ids or {}
    correspondance = pd.read_csv(CSV_PATH, encoding="utf-8-sig")
    changed = 0
    for index, row in correspondance.iterrows():
        if str(row.get("eco_provider") or "").strip().lower() != "openai":
            continue
        eco_name = str(row.get("eco_name") or "").strip()
        target = OPENAI_PLAN.get(eco_name)
        if not target:
            continue
        slug, name, maydai_id = target
        maydai_id = ids.get(slug, maydai_id)
        updates = {
            "maydai_slug": slug,
            "maydai_name": name,
            "maydai_provider": "OpenAI",
            "statut": "lie",
            "a_valider": "NON",
        }
        if maydai_id:
            updates["maydai_id"] = maydai_id
        before = {key: row.get(key) for key in updates}
        for key, value in updates.items():
            correspondance.at[index, key] = value
        after = {key: correspondance.at[index, key] for key in updates}
        if any(str(before[key]) != str(after[key]) for key in updates):
            changed += 1
    correspondance.to_csv(CSV_PATH, index=False)
    return changed


def main() -> None:
    changed = apply_plan()
    print(f"CSV mis à jour : {CSV_PATH} ({changed} lignes OpenAI alignées)")


if __name__ == "__main__":
    main()
