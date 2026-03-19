# Statistics Workspace

Initial NFL data gathering starts here.

## Current Scope

- Stable public NFL data from `nflverse-data`
- Official business-side source captures
- Manifests describing what was downloaded and when

## Commands

```bash
python3 scripts/fetch_nflverse.py
python3 scripts/fetch_business_sources.py
python3 scripts/normalize_nfl_data.py
```

The default NFL fetch pulls a broad initial bundle for the 2024 and 2025 seasons plus non-seasonal reference datasets. Use `python3 scripts/fetch_nflverse.py --help` for options.

Normalization writes:

- silver CSV tables under `data/silver/nfl/`
- gold CSV tables under `data/gold/nfl/`
- a local SQLite database at `storage/nfl_analytics.sqlite`
