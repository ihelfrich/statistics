# Assessment Pipeline

This repo now contains the public frontend and Vercel ingestion code for a pilot psychometric instrumentation workflow.

## Public frontend

GitHub Pages continues to host the Vite app under `/statistics/`.

Set the Pages build env variable:

```bash
VITE_ASSESSMENT_API_BASE_URL=https://your-assessment-api.vercel.app
```

## Vercel ingestion service

Deploy the repo to Vercel as an API project, or expose only the `api/` directory from a dedicated Vercel project.

Required Vercel environment variables:

```bash
ASSESSMENT_SESSION_SECRET=replace-with-long-random-secret
ASSESSMENT_ALLOWED_ORIGINS=https://ihelfrich.github.io
ASSESSMENT_DATA_REPO=owner/private-assessment-data-repo
ASSESSMENT_DATA_BRANCH=main
ASSESSMENT_DATA_GITHUB_TOKEN=github_pat_with_contents_write
ASSESSMENT_TEST_CODES_JSON={"core-spring-pilot":{"assessment_ids":["core-statistics-diagnostic"],"expires_at":"2026-12-31T23:59:59Z"},"ads-spring-pilot":{"assessment_ids":["advertising-analytics-diagnostic"],"expires_at":"2026-12-31T23:59:59Z"}}
```

## Private GitHub data repo

Use the template under `templates/private-assessment-data-repo/` for the repo that stores raw JSONL submissions and materialized CSV exports.

Expected raw storage path:

```text
submissions/date=YYYY-MM-DD/assessment=<assessment_id>.jsonl
```

Expected exports:

- `exports/item_responses.csv`
- `exports/sessions.csv`

## Notes

- Student IDs must be pseudonymous issued IDs only.
- Recorded submissions are only enabled for the two formal diagnostics in `/assess`.
- Module checkpoints in `/practice` score locally and update browser-stored progress only.
- This is a pilot instrumentation pipeline, not a validated or high-stakes secure testing platform.
