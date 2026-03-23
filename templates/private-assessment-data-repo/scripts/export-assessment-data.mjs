import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const submissionsDir = path.join(rootDir, 'submissions')
const exportsDir = path.join(rootDir, 'exports')

function csvEscape(value) {
  const text = String(value ?? '')
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

async function walk(dir) {
  let results = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const nextPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results = results.concat(await walk(nextPath))
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      results.push(nextPath)
    }
  }
  return results
}

async function loadRecords() {
  try {
    const files = await walk(submissionsDir)
    const records = []
    for (const file of files) {
      const content = await readFile(file, 'utf8')
      for (const line of content.split('\n').filter(Boolean)) {
        records.push(JSON.parse(line))
      }
    }
    return records
  } catch {
    return []
  }
}

async function main() {
  const records = await loadRecords()
  await mkdir(exportsDir, { recursive: true })

  const sessionHeaders = [
    'session_id',
    'student_id',
    'assessment_id',
    'form_version',
    'test_code',
    'raw_score',
    'pct_correct',
    'mastery_band',
    'started_at',
    'submitted_at',
    'duration_ms',
    'completion_status',
  ]

  const itemHeaders = [
    'session_id',
    'student_id',
    'assessment_id',
    'form_version',
    'module_key',
    'item_id',
    'item_type',
    'skill_tag',
    'position',
    'response_value',
    'is_correct',
    'score',
    'latency_ms',
    'changed_answer_count',
    'started_at',
    'submitted_at',
  ]

  const sessionRows = [sessionHeaders.join(',')]
  const itemRows = [itemHeaders.join(',')]

  for (const record of records) {
    sessionRows.push(
      sessionHeaders.map((header) => csvEscape(record[header])).join(','),
    )

    for (const response of record.responses ?? []) {
      itemRows.push(
        itemHeaders
          .map((header) => {
            if (header in response) {
              return csvEscape(response[header])
            }
            return csvEscape(record[header])
          })
          .join(','),
      )
    }
  }

  await writeFile(path.join(exportsDir, 'sessions.csv'), `${sessionRows.join('\n')}\n`)
  await writeFile(path.join(exportsDir, 'item_responses.csv'), `${itemRows.join('\n')}\n`)
}

await main()
