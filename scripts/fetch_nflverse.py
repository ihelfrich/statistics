#!/usr/bin/env python3
"""Fetch a broad initial NFL data bundle from nflverse-data releases."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

import requests

API_RELEASES = "https://api.github.com/repos/nflverse/nflverse-data/releases"
ROOT = Path(__file__).resolve().parents[1]
RAW_ROOT = ROOT / "data" / "raw" / "nflverse"
MANIFEST_PATH = ROOT / "data" / "manifests" / "nflverse_download_manifest.json"


FIXED_ASSETS = {
    "teams": ["teams_colors_logos.csv.gz", "timestamp.json"],
    "schedules": ["games.csv.gz", "timestamp.json"],
    "players": ["players.csv.gz", "timestamp.json"],
    "officials": ["officials.csv.gz", "timestamp.json"],
    "trades": ["trades.csv.gz", "timestamp.json"],
    "draft_picks": ["draft_picks.csv.gz", "timestamp.json"],
    "contracts": ["historical_contracts.csv.gz", "timestamp.json"],
}

SEASONAL_ASSET_TEMPLATES = {
    "pbp": ["play_by_play_{year}.csv.gz"],
    "rosters": ["roster_{year}.csv.gz"],
    "weekly_rosters": ["roster_weekly_{year}.csv.gz"],
    "stats_player": ["stats_player_week_{year}.csv.gz", "stats_player_regpost_{year}.csv.gz"],
    "stats_team": ["stats_team_week_{year}.csv.gz", "stats_team_regpost_{year}.csv.gz"],
    "snap_counts": ["snap_counts_{year}.csv.gz"],
}


@dataclass
class DownloadRecord:
    tag: str
    asset_name: str
    local_path: str
    source_url: str
    size_bytes: int
    updated_at: str
    downloaded_at: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--seasons",
        nargs="+",
        type=int,
        default=[2024, 2025],
        help="Seasons to fetch for year-partitioned releases.",
    )
    parser.add_argument(
        "--skip-pbp",
        action="store_true",
        help="Skip play-by-play downloads if you want a lighter initial pull.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Re-download files even if they already exist.",
    )
    return parser.parse_args()


def get_release_index() -> Dict[str, dict]:
    response = requests.get(API_RELEASES, headers={"User-Agent": "codex-nfl-fetcher"}, timeout=60)
    response.raise_for_status()
    releases = response.json()
    return {release["tag_name"]: release for release in releases}


def planned_assets(seasons: List[int], skip_pbp: bool) -> Dict[str, List[str]]:
    plan = {tag: list(names) for tag, names in FIXED_ASSETS.items()}
    for tag, templates in SEASONAL_ASSET_TEMPLATES.items():
        if tag == "pbp" and skip_pbp:
            continue
        names = [template.format(year=year) for year in seasons for template in templates]
        names.append("timestamp.json")
        plan[tag] = names
    return plan


def asset_lookup(release: dict) -> Dict[str, dict]:
    return {asset["name"]: asset for asset in release.get("assets", [])}


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def download_asset(asset: dict, destination: Path, overwrite: bool) -> DownloadRecord:
    ensure_parent(destination)
    if destination.exists() and not overwrite:
        return DownloadRecord(
            tag="",
            asset_name=asset["name"],
            local_path=str(destination.relative_to(ROOT)),
            source_url=asset["browser_download_url"],
            size_bytes=destination.stat().st_size,
            updated_at=asset.get("updated_at", ""),
            downloaded_at=datetime.now(timezone.utc).isoformat(),
        )

    with requests.get(
        asset["browser_download_url"],
        headers={"User-Agent": "codex-nfl-fetcher"},
        stream=True,
        timeout=120,
    ) as response:
        response.raise_for_status()
        with destination.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    handle.write(chunk)

    return DownloadRecord(
        tag="",
        asset_name=asset["name"],
        local_path=str(destination.relative_to(ROOT)),
        source_url=asset["browser_download_url"],
        size_bytes=destination.stat().st_size,
        updated_at=asset.get("updated_at", ""),
        downloaded_at=datetime.now(timezone.utc).isoformat(),
    )


def main() -> int:
    args = parse_args()
    releases = get_release_index()
    plan = planned_assets(args.seasons, args.skip_pbp)
    manifest: List[dict] = []
    failures: List[str] = []

    for tag, wanted_names in plan.items():
        release = releases.get(tag)
        if not release:
            failures.append(f"Missing release tag: {tag}")
            continue

        assets = asset_lookup(release)
        for name in wanted_names:
            asset = assets.get(name)
            if not asset:
                failures.append(f"Missing asset for {tag}: {name}")
                continue

            destination = RAW_ROOT / tag / name
            record = download_asset(asset, destination, overwrite=args.overwrite)
            record.tag = tag
            manifest.append(record.__dict__)
            print(f"[ok] {tag}/{name}")

    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(
        json.dumps(
            {
                "created_at": datetime.now(timezone.utc).isoformat(),
                "seasons": args.seasons,
                "skip_pbp": args.skip_pbp,
                "downloads": manifest,
                "failures": failures,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    if failures:
        print("\nMissing assets detected:", file=sys.stderr)
        for item in failures:
            print(f"- {item}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
