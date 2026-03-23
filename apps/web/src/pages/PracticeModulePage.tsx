import { Navigate, useParams } from 'react-router-dom'
import { AssessmentWorkspace } from '../components/AssessmentWorkspace.tsx'
import { Breadcrumbs } from '../components/Breadcrumbs.tsx'
import { assessment_items, getCheckpointForm } from '../data/assessmentData.ts'
import { isModuleKey, moduleRegistry, type ModuleKey } from '../utils/types.ts'

const practiceBriefs: Partial<
  Record<
    ModuleKey,
    {
      title: string
      description: string
      scenarioThemes: string[]
      analystMoves: string[]
    }
  >
> = {
  adDiagnostics: {
    title: 'Advertising diagnostics brief',
    description:
      'These items mirror the descriptive work that sits upstream of major media decisions: overlap checks, new-to-brand mix reads, fatigue tails, and matched-market readiness.',
    scenarioThemes: [
      'Cross-channel unique reach and duplication',
      'Retail media mix and weighted new-to-brand rates',
      'Frequency-tail weakness and fatigue risk',
      'Matched-geo baseline stability before launch',
    ],
    analystMoves: [
      'Compute the descriptive statistic first, then decide what it does and does not justify.',
      'Treat volatility and outliers as operational signals, not annoying exceptions.',
      'Avoid turning descriptive diagnostics into causal claims.',
    ],
  },
  adExperiments: {
    title: 'Advertising experiments brief',
    description:
      'These items are built around the way strong ad-science teams read lift studies, brand surveys, and geo tests before recommending rollout or restraint.',
    scenarioThemes: [
      'User-level conversion lift and absolute lift readouts',
      'Brand lift survey interpretation',
      'Confidence intervals and p-values in campaign decisions',
      'Geo lift estimation and test sizing',
    ],
    analystMoves: [
      'Frame binary outcomes as proportions and state lift in percentage points.',
      'Use p-values and intervals as evidence summaries, not certainty machines.',
      'Keep business magnitude separate from statistical significance.',
    ],
  },
  adRegression: {
    title: 'Advertising modeling brief',
    description:
      'These items focus on the modeling judgments that matter in spend-response work: controls, coefficient interpretation, residual diagnosis, and extrapolation risk.',
    scenarioThemes: [
      'Naive versus adjusted spend-response models',
      'Branded demand and promotion confounding',
      'Residual curvature and diminishing returns',
      'Forecast risk outside the observed spend range',
    ],
    analystMoves: [
      'Interpret coefficients conditionally and stay skeptical about causal language.',
      'Use diagnostics to challenge the model form rather than defend it.',
      'Do not treat high fit or clean forecasts as proof of incrementality.',
    ],
  },
}

function formatSkillTag(skill_tag: string) {
  return skill_tag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function PracticeModulePage() {
  const { moduleKey } = useParams()
  if (!moduleKey || !isModuleKey(moduleKey)) {
    return <Navigate to="/practice" replace />
  }

  const meta = moduleRegistry[moduleKey]
  const form = getCheckpointForm(moduleKey)
  const items = form.item_ids.map((item_id) => assessment_items[item_id]).filter(Boolean)
  const brief = practiceBriefs[moduleKey]
  const skillTags = Array.from(new Set(items.map((item) => formatSkillTag(item.skill_tag))))
  const scenarioThemes = brief?.scenarioThemes ?? meta.learningObjectives
  const analystMoves =
    brief?.analystMoves ?? [
      'Answer from first principles before checking the rationale.',
      'Use the score to locate the exact skill that still needs work.',
      'Return to the lesson if you cannot explain why the best answer wins.',
    ]

  return (
    <div className="page-stack">
      <section className="content-card">
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Practice', to: '/practice' },
            { label: meta.title },
          ]}
        />
        <div className="module-header">
          <span className="panel-label">Module checkpoint</span>
          <h2>{meta.title}</h2>
          <p>
            {brief?.description ??
              "Short objective practice aligned to this lesson's core skills and interpretations."}
          </p>
        </div>

        <div className="tag-row">
          {skillTags.map((skill) => (
            <span key={skill} className="tag-pill">
              {skill}
            </span>
          ))}
        </div>
      </section>

      <section className="two-up-grid">
        <div className="content-card inset practice-brief-card">
          <h3>{brief?.title ?? 'What this checkpoint covers'}</h3>
          <ul className="practice-brief-list">
            {scenarioThemes.map((theme) => (
              <li key={theme}>{theme}</li>
            ))}
          </ul>
        </div>
        <div className="content-card inset practice-brief-card">
          <h3>How strong answers read</h3>
          <ul className="practice-brief-list">
            {analystMoves.map((move) => (
              <li key={move}>{move}</li>
            ))}
          </ul>
        </div>
      </section>

      <AssessmentWorkspace form={form} items={items} mode="practice" />
    </div>
  )
}
