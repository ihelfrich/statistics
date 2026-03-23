# Private Assessment Data Repo Template

Use this template in a **private GitHub repo** that receives raw JSONL submissions from the Vercel ingestion layer.

## Expected structure

- `submissions/`: raw append-only JSONL files partitioned by date and assessment
- `exports/`: materialized CSV files for downstream psychometric analysis
- `.github/workflows/export-assessment-data.yml`: rebuilds CSV exports on each push
- `scripts/export-assessment-data.mjs`: converts JSONL to `item_responses.csv` and `sessions.csv`

## Required behavior

- Keep student records pseudonymous.
- Do not store names or emails.
- Do not change item IDs or form versions for already-used forms.
