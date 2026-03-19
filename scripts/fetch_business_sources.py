#!/usr/bin/env python3
"""Fetch stable official business-side source documents for the NFL workspace."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
BUSINESS_ROOT = ROOT / "data" / "raw" / "business"
MANIFEST_PATH = ROOT / "data" / "manifests" / "business_sources_manifest.json"

SOURCES = [
    {
        "id": "packers_finance_2025",
        "category": "finance",
        "source_name": "Green Bay Packers official site",
        "url": "https://www.packers.com/news/packers-finances-staying-in-good-shape-2025",
        "filename": "packers_finances_staying_in_good_shape_2025.html",
    }
]


def main() -> int:
    BUSINESS_ROOT.mkdir(parents=True, exist_ok=True)
    manifest = {"created_at": datetime.now(timezone.utc).isoformat(), "downloads": []}

    for source in SOURCES:
        target_dir = BUSINESS_ROOT / source["category"] / source["id"]
        target_dir.mkdir(parents=True, exist_ok=True)
        target_file = target_dir / source["filename"]

        response = requests.get(source["url"], headers={"User-Agent": "codex-business-fetcher"}, timeout=60)
        response.raise_for_status()
        target_file.write_text(response.text, encoding="utf-8")

        manifest["downloads"].append(
            {
                "id": source["id"],
                "category": source["category"],
                "source_name": source["source_name"],
                "url": source["url"],
                "local_path": str(target_file.relative_to(ROOT)),
                "downloaded_at": datetime.now(timezone.utc).isoformat(),
                "status_code": response.status_code,
            }
        )
        print(f"[ok] {source['id']}")

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
