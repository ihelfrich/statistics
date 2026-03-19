#!/usr/bin/env python3
"""Normalize the initial NFL raw layer into analysis-ready tables."""

from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW_NFL = ROOT / "data" / "raw" / "nflverse"
RAW_BUSINESS = ROOT / "data" / "raw" / "business"
SILVER = ROOT / "data" / "silver" / "nfl"
GOLD = ROOT / "data" / "gold" / "nfl"
MANIFEST_PATH = ROOT / "data" / "manifests" / "normalized_tables_manifest.json"
DB_PATH = ROOT / "storage" / "nfl_analytics.sqlite"


def ensure_dirs() -> None:
    for path in [SILVER, GOLD, DB_PATH.parent, MANIFEST_PATH.parent]:
        path.mkdir(parents=True, exist_ok=True)


def read_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, compression="gzip", low_memory=False)


def clean_text(value: object) -> Optional[str]:
    if pd.isna(value):
        return None
    text = str(value).strip()
    return text or None


def clean_id(value: object) -> Optional[str]:
    if pd.isna(value):
        return None
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    text = str(value).strip()
    return text or None


def coalesce_id(row: pd.Series, columns: Iterable[str], prefix: str) -> str:
    for column in columns:
        if column in row.index:
            value = clean_id(row[column])
            if value:
                return f"{prefix}:{value}"
    label_bits = [
        clean_text(row.get("display_name")),
        clean_text(row.get("full_name")),
        clean_text(row.get("player_display_name")),
        clean_text(row.get("player_name")),
        clean_text(row.get("birth_date")),
    ]
    fallback = "|".join(bit for bit in label_bits if bit) or "unknown"
    return f"{prefix}:fallback:{fallback}"


def add_player_key(df: pd.DataFrame, columns: Iterable[str]) -> pd.DataFrame:
    result = df.copy()
    result["player_key"] = result.apply(lambda row: coalesce_id(row, columns, "player"), axis=1)
    return result


def add_team_key(df: pd.DataFrame, column: str = "team") -> pd.DataFrame:
    result = df.copy()
    result[column] = result[column].astype(str).str.upper()
    result["team_key"] = "team:" + result[column]
    return result


def parse_article_body(html_text: str) -> str:
    match = re.search(r'"articleBody":"((?:\\.|[^"])*)"', html_text)
    if not match:
        return ""
    return json.loads(f"\"{match.group(1)}\"")


def extract_money(pattern: str, text: str) -> Optional[float]:
    match = re.search(pattern, text, flags=re.IGNORECASE)
    if not match:
        return None
    return float(match.group(1))


def extract_pct(pattern: str, text: str) -> Optional[float]:
    match = re.search(pattern, text, flags=re.IGNORECASE)
    if not match:
        return None
    return float(match.group(1))


def load_dims() -> Dict[str, pd.DataFrame]:
    teams = read_csv(RAW_NFL / "teams" / "teams_colors_logos.csv.gz").rename(columns={"team_abbr": "team"})
    teams["team"] = teams["team"].str.upper()
    teams["team_key"] = "team:" + teams["team"]
    teams["sport"] = "football"
    teams["league"] = "NFL"
    dim_teams = teams[
        [
            "team_key",
            "team",
            "team_name",
            "team_id",
            "team_nick",
            "team_conf",
            "team_division",
            "team_color",
            "team_color2",
            "team_color3",
            "team_color4",
            "team_logo_wikipedia",
            "team_logo_espn",
            "team_wordmark",
            "team_conference_logo",
            "team_league_logo",
            "team_logo_squared",
            "sport",
            "league",
        ]
    ].drop_duplicates()

    players = read_csv(RAW_NFL / "players" / "players.csv.gz")
    players = add_player_key(
        players,
        ["gsis_id", "esb_id", "pfr_id", "otc_id", "espn_id", "smart_id"],
    )
    players["latest_team"] = players["latest_team"].astype(str).str.upper()
    players["latest_team_key"] = players["latest_team"].where(players["latest_team"] != "NAN")
    players["latest_team_key"] = players["latest_team_key"].apply(
        lambda value: f"team:{value}" if isinstance(value, str) else None
    )
    dim_players = players[
        [
            "player_key",
            "gsis_id",
            "esb_id",
            "pfr_id",
            "pff_id",
            "otc_id",
            "espn_id",
            "smart_id",
            "display_name",
            "common_first_name",
            "first_name",
            "last_name",
            "short_name",
            "football_name",
            "birth_date",
            "position_group",
            "position",
            "height",
            "weight",
            "college_name",
            "college_conference",
            "rookie_season",
            "last_season",
            "latest_team",
            "latest_team_key",
            "status",
            "years_of_experience",
            "draft_year",
            "draft_round",
            "draft_pick",
            "draft_team",
            "headshot",
        ]
    ].drop_duplicates(subset=["player_key"])

    games = read_csv(RAW_NFL / "schedules" / "games.csv.gz")
    games["game_date"] = pd.to_datetime(games["gameday"], errors="coerce")
    games["season_phase"] = games["game_type"].where(games["game_type"] == "REG", "POST")
    games["home_team"] = games["home_team"].str.upper()
    games["away_team"] = games["away_team"].str.upper()
    games["home_team_key"] = "team:" + games["home_team"]
    games["away_team_key"] = "team:" + games["away_team"]
    dim_games = games[
        [
            "game_id",
            "season",
            "game_type",
            "season_phase",
            "week",
            "game_date",
            "weekday",
            "gametime",
            "home_team",
            "home_team_key",
            "away_team",
            "away_team_key",
            "home_score",
            "away_score",
            "location",
            "result",
            "total",
            "overtime",
            "roof",
            "surface",
            "temp",
            "wind",
            "home_moneyline",
            "away_moneyline",
            "spread_line",
            "total_line",
            "div_game",
            "home_rest",
            "away_rest",
            "home_qb_id",
            "home_qb_name",
            "away_qb_id",
            "away_qb_name",
        ]
    ].drop_duplicates(subset=["game_id"])

    return {
        "dim_teams": dim_teams,
        "dim_players": dim_players,
        "dim_games": dim_games,
    }


def normalize_rosters() -> Dict[str, pd.DataFrame]:
    annual_frames = []
    for path in sorted((RAW_NFL / "rosters").glob("roster_*.csv.gz")):
        df = read_csv(path)
        annual_frames.append(df)
    rosters = pd.concat(annual_frames, ignore_index=True)
    rosters = add_player_key(rosters, ["gsis_id", "esb_id", "pfr_id", "espn_id", "smart_id"])
    rosters = add_team_key(rosters)
    rosters["roster_scope"] = "season"

    weekly_frames = []
    for path in sorted((RAW_NFL / "weekly_rosters").glob("roster_weekly_*.csv.gz")):
        df = read_csv(path)
        weekly_frames.append(df)
    weekly = pd.concat(weekly_frames, ignore_index=True)
    weekly = add_player_key(weekly, ["gsis_id", "esb_id", "pfr_id", "espn_id", "smart_id"])
    weekly = add_team_key(weekly)
    weekly["roster_scope"] = "weekly"

    keep_columns = [
        "player_key",
        "team_key",
        "season",
        "week",
        "game_type",
        "team",
        "position",
        "depth_chart_position",
        "jersey_number",
        "status",
        "status_description_abbr",
        "full_name",
        "first_name",
        "last_name",
        "birth_date",
        "height",
        "weight",
        "college",
        "gsis_id",
        "espn_id",
        "sportradar_id",
        "pff_id",
        "pfr_id",
        "years_exp",
        "headshot_url",
        "ngs_position",
        "football_name",
        "esb_id",
        "smart_id",
        "entry_year",
        "rookie_year",
        "draft_club",
        "draft_number",
        "roster_scope",
    ]
    return {
        "fact_rosters": rosters[keep_columns].drop_duplicates(),
        "fact_rosters_weekly": weekly[keep_columns].drop_duplicates(),
    }


def normalize_stats() -> Dict[str, pd.DataFrame]:
    player_weekly = pd.concat(
        [read_csv(path) for path in sorted((RAW_NFL / "stats_player").glob("stats_player_week_*.csv.gz"))],
        ignore_index=True,
    )
    player_weekly = add_player_key(player_weekly, ["player_id"])
    player_weekly = add_team_key(player_weekly)
    player_weekly["opponent_team"] = player_weekly["opponent_team"].str.upper()
    player_weekly["opponent_team_key"] = "team:" + player_weekly["opponent_team"]
    player_weekly["total_tds"] = player_weekly[
        ["passing_tds", "rushing_tds", "receiving_tds", "special_teams_tds", "def_tds", "fumble_recovery_tds"]
    ].fillna(0).sum(axis=1)

    player_season = pd.concat(
        [read_csv(path) for path in sorted((RAW_NFL / "stats_player").glob("stats_player_regpost_*.csv.gz"))],
        ignore_index=True,
    )
    player_season = add_player_key(player_season, ["player_id"])
    player_season["recent_team"] = player_season["recent_team"].str.upper()
    player_season["team_key"] = "team:" + player_season["recent_team"]
    player_season["total_tds"] = player_season[
        ["passing_tds", "rushing_tds", "receiving_tds", "special_teams_tds", "def_tds", "fumble_recovery_tds"]
    ].fillna(0).sum(axis=1)

    team_weekly = pd.concat(
        [read_csv(path) for path in sorted((RAW_NFL / "stats_team").glob("stats_team_week_*.csv.gz"))],
        ignore_index=True,
    )
    team_weekly = add_team_key(team_weekly)
    team_weekly["opponent_team"] = team_weekly["opponent_team"].str.upper()
    team_weekly["opponent_team_key"] = "team:" + team_weekly["opponent_team"]
    team_weekly["total_tds"] = team_weekly[
        ["passing_tds", "rushing_tds", "receiving_tds", "special_teams_tds", "def_tds", "fumble_recovery_tds"]
    ].fillna(0).sum(axis=1)

    team_season = pd.concat(
        [read_csv(path) for path in sorted((RAW_NFL / "stats_team").glob("stats_team_regpost_*.csv.gz"))],
        ignore_index=True,
    )
    team_season = add_team_key(team_season)
    team_season["total_tds"] = team_season[
        ["passing_tds", "rushing_tds", "receiving_tds", "special_teams_tds", "def_tds", "fumble_recovery_tds"]
    ].fillna(0).sum(axis=1)

    return {
        "fact_player_weekly_stats": player_weekly,
        "fact_player_season_stats": player_season,
        "fact_team_weekly_stats": team_weekly,
        "fact_team_season_stats": team_season,
    }


def normalize_supporting_tables() -> Dict[str, pd.DataFrame]:
    snap_counts = pd.concat(
        [read_csv(path) for path in sorted((RAW_NFL / "snap_counts").glob("snap_counts_*.csv.gz"))],
        ignore_index=True,
    )
    snap_counts = add_team_key(snap_counts)
    snap_counts["opponent_team"] = snap_counts["opponent"].str.upper()
    snap_counts["opponent_team_key"] = "team:" + snap_counts["opponent_team"]
    snap_counts = add_player_key(snap_counts, ["pfr_player_id", "player"])

    draft_picks = read_csv(RAW_NFL / "draft_picks" / "draft_picks.csv.gz")
    draft_picks = add_team_key(draft_picks)
    draft_picks = add_player_key(draft_picks, ["gsis_id", "pfr_player_id", "pfr_player_name"])

    contracts = read_csv(RAW_NFL / "contracts" / "historical_contracts.csv.gz")
    contracts = add_team_key(contracts)
    contracts = add_player_key(contracts, ["otc_id", "player", "date_of_birth"])

    trades = read_csv(RAW_NFL / "trades" / "trades.csv.gz")
    if "team" in trades.columns:
        trades = add_team_key(trades)
    else:
        trades["team_key"] = None

    return {
        "fact_snap_counts": snap_counts,
        "fact_draft_picks": draft_picks,
        "fact_contracts": contracts,
        "fact_trades": trades,
    }


def build_team_game_results(dim_games: pd.DataFrame) -> pd.DataFrame:
    home = dim_games.copy()
    home["team"] = home["home_team"]
    home["team_key"] = home["home_team_key"]
    home["opponent_team"] = home["away_team"]
    home["opponent_team_key"] = home["away_team_key"]
    home["is_home"] = 1
    home["team_score"] = home["home_score"]
    home["opponent_score"] = home["away_score"]
    home["rest_days"] = home["home_rest"]

    away = dim_games.copy()
    away["team"] = away["away_team"]
    away["team_key"] = away["away_team_key"]
    away["opponent_team"] = away["home_team"]
    away["opponent_team_key"] = away["home_team_key"]
    away["is_home"] = 0
    away["team_score"] = away["away_score"]
    away["opponent_score"] = away["home_score"]
    away["rest_days"] = away["away_rest"]

    long_games = pd.concat([home, away], ignore_index=True)
    long_games["point_margin"] = long_games["team_score"] - long_games["opponent_score"]
    long_games["win"] = (long_games["point_margin"] > 0).astype(int)
    long_games["loss"] = (long_games["point_margin"] < 0).astype(int)
    long_games["tie"] = (long_games["point_margin"] == 0).astype(int)

    keep = [
        "game_id",
        "season",
        "game_type",
        "season_phase",
        "week",
        "game_date",
        "team",
        "team_key",
        "opponent_team",
        "opponent_team_key",
        "is_home",
        "team_score",
        "opponent_score",
        "point_margin",
        "win",
        "loss",
        "tie",
        "overtime",
        "location",
        "roof",
        "surface",
        "temp",
        "wind",
        "rest_days",
    ]
    return long_games[keep].sort_values(["season", "week", "game_id", "team"])


def build_team_season_summary(team_season: pd.DataFrame, team_game_results: pd.DataFrame) -> pd.DataFrame:
    split_summary = (
        team_game_results.groupby(["season", "team", "team_key", "season_phase"], as_index=False)
        .agg(
            games_played=("game_id", "count"),
            wins=("win", "sum"),
            losses=("loss", "sum"),
            ties=("tie", "sum"),
            points_for=("team_score", "sum"),
            points_against=("opponent_score", "sum"),
            avg_margin=("point_margin", "mean"),
        )
        .rename(columns={"season_phase": "season_type"})
    )
    combined_summary = (
        team_game_results.groupby(["season", "team", "team_key"], as_index=False)
        .agg(
            games_played=("game_id", "count"),
            wins=("win", "sum"),
            losses=("loss", "sum"),
            ties=("tie", "sum"),
            points_for=("team_score", "sum"),
            points_against=("opponent_score", "sum"),
            avg_margin=("point_margin", "mean"),
        )
        .assign(season_type="REG+POST")
    )
    schedule_summary = pd.concat([split_summary, combined_summary], ignore_index=True)
    summary = team_season.merge(schedule_summary, how="left", on=["season", "team", "team_key", "season_type"])
    return summary.sort_values(["season", "team", "season_type"])


def build_player_season_summary(player_season: pd.DataFrame, dim_players: pd.DataFrame) -> pd.DataFrame:
    summary = player_season.merge(
        dim_players[["player_key", "display_name", "first_name", "last_name", "position_group", "position"]],
        how="left",
        on="player_key",
        suffixes=("", "_dim"),
    )
    return summary.sort_values(["season", "season_type", "recent_team", "player_display_name"])


def normalize_finance() -> pd.DataFrame:
    html_path = RAW_BUSINESS / "finance" / "packers_finance_2025" / "packers_finances_staying_in_good_shape_2025.html"
    html_text = html_path.read_text(encoding="utf-8")
    body = parse_article_body(html_text)

    record = {
        "team": "GB",
        "team_key": "team:GB",
        "source_name": "Green Bay Packers official site",
        "source_url": "https://www.packers.com/news/packers-finances-staying-in-good-shape-2025",
        "fiscal_year_end": "2025-03-31",
        "report_date": "2025-07-23",
        "operating_profit_musd": extract_money(r"\$([0-9.]+) million operating profit", body),
        "prior_operating_profit_musd": extract_money(r"previous year's \$([0-9.]+) million operating profit", body),
        "local_revenue_delta_musd": extract_money(r"\$([0-9.]+) million increase \([0-9.]+%\) in local revenue", body),
        "local_revenue_delta_pct": extract_pct(r"\$[0-9.]+ million increase \(([0-9.]+)%\) in local revenue", body),
        "national_revenue_delta_musd": extract_money(r"National revenue also rose \$([0-9.]+) million", body),
        "national_revenue_delta_pct": extract_pct(r"National revenue also rose \$[0-9.]+ million \(([0-9.]+)%\)", body),
        "total_revenue_delta_musd": extract_money(r"total revenue increase of \$([0-9.]+) million", body),
        "total_revenue_delta_pct": extract_pct(r"total revenue increase of \$[0-9.]+ million \(([0-9.]+)%\)", body),
        "expenses_delta_musd": extract_money(r"\$([0-9.]+) million increase \([0-9.]+%\) in expenses", body),
        "expenses_delta_pct": extract_pct(r"\$[0-9.]+ million increase \(([0-9.]+)%\) in expenses", body),
        "source_file": str(html_path.relative_to(ROOT)),
        "notes": "Parsed from official Packers annual finance article text.",
    }
    return pd.DataFrame([record])


def write_table(df: pd.DataFrame, path: Path, conn: sqlite3.Connection, table_name: str, manifest: List[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False, compression="gzip")
    df.to_sql(table_name, conn, if_exists="replace", index=False)
    manifest.append(
        {
            "table": table_name,
            "path": str(path.relative_to(ROOT)),
            "rows": int(df.shape[0]),
            "columns": int(df.shape[1]),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    print(f"[ok] {table_name}: {df.shape[0]} rows")


def main() -> int:
    ensure_dirs()
    conn = sqlite3.connect(DB_PATH)
    manifest: List[dict] = []

    dims = load_dims()
    roster_tables = normalize_rosters()
    stat_tables = normalize_stats()
    supporting = normalize_supporting_tables()
    finance = normalize_finance()

    team_game_results = build_team_game_results(dims["dim_games"])
    team_season_summary = build_team_season_summary(stat_tables["fact_team_season_stats"], team_game_results)
    player_season_summary = build_player_season_summary(stat_tables["fact_player_season_stats"], dims["dim_players"])

    silver_tables = {}
    silver_tables.update(dims)
    silver_tables.update(roster_tables)
    silver_tables.update(stat_tables)
    silver_tables.update(supporting)
    silver_tables["fact_team_financials"] = finance

    gold_tables = {
        "team_game_results": team_game_results,
        "team_season_summary": team_season_summary,
        "player_season_summary": player_season_summary,
    }

    for name, df in silver_tables.items():
        write_table(df, SILVER / f"{name}.csv.gz", conn, name, manifest)

    for name, df in gold_tables.items():
        write_table(df, GOLD / f"{name}.csv.gz", conn, name, manifest)

    MANIFEST_PATH.write_text(
        json.dumps(
            {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "sqlite_path": str(DB_PATH.relative_to(ROOT)),
                "tables": manifest,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
