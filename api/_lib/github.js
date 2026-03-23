const GITHUB_API = 'https://api.github.com'

function parseRepoTarget() {
  const repo = process.env.ASSESSMENT_DATA_REPO
  const token = process.env.ASSESSMENT_DATA_GITHUB_TOKEN
  const branch = process.env.ASSESSMENT_DATA_BRANCH || 'main'

  if (!repo || !token) {
    throw new Error('Missing assessment data repo configuration.')
  }

  return { repo, token, branch }
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'statistics-assessment-ingest',
  }
}

export async function readRepoFile(path) {
  const { repo, token, branch } = parseRepoTarget()
  const response = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}?ref=${branch}`, {
    headers: githubHeaders(token),
  })

  if (response.status === 404) {
    return { sha: null, content: '' }
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Unable to read GitHub data file: ${errorText}`)
  }

  const payload = await response.json()
  return {
    sha: payload.sha,
    content: Buffer.from(payload.content, 'base64').toString('utf8'),
  }
}

export async function writeRepoFile(path, content, message, sha = undefined) {
  const { repo, token, branch } = parseRepoTarget()
  const response = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      ...githubHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
      sha,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Unable to write GitHub data file: ${errorText}`)
  }

  return response.json()
}
