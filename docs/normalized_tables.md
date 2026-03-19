# Normalized NFL Tables

## Silver Layer

- `dim_teams`: team metadata and branding
- `dim_players`: canonical player identities and core attributes
- `dim_games`: game metadata, betting context, venue/weather context
- `fact_rosters`: season-level roster snapshots
- `fact_rosters_weekly`: week-level roster snapshots
- `fact_player_weekly_stats`: player-by-game performance
- `fact_player_season_stats`: player-by-season aggregate performance
- `fact_team_weekly_stats`: team-by-game performance
- `fact_team_season_stats`: team-by-season aggregate performance
- `fact_snap_counts`: player snap participation
- `fact_draft_picks`: draft history and career summary fields
- `fact_contracts`: historical contract records
- `fact_trades`: trade log
- `fact_team_financials`: structured finance metrics from official public sources

## Gold Layer

- `team_game_results`: one row per team per game with scores, opponent, margin, and win/loss/tie flags
- `team_season_summary`: team season stats joined to aggregated game outcomes
- `player_season_summary`: player season stats joined to player dimension metadata

## Local Database

- SQLite database: `storage/nfl_analytics.sqlite`
- CSV exports: `data/silver/nfl/` and `data/gold/nfl/`

## Refresh

```bash
python3 scripts/normalize_nfl_data.py
```
