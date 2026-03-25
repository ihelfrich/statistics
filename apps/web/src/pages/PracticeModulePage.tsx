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
      'These items mirror the descriptive work that decides whether later media stories are even credible: overlap checks, acquisition mix, fatigue tails, and geo-test readiness.',
    scenarioThemes: [
      'Cross-channel unique reach and duplication',
      'Retail media mix and weighted new-to-brand rates',
      'Frequency-tail weakness and fatigue risk',
      'Matched-geo baseline stability before launch',
    ],
    analystMoves: [
      'Compute the diagnostic first, then decide whether the operating story is actually stable enough to trust.',
      'Treat volatility, outliers, and tail weakness as operational signals, not annoying exceptions.',
      'Avoid turning a descriptive screen into a causal claim or a premature green light.',
    ],
  },
  adExperiments: {
    title: 'Advertising experiments brief',
    description:
      'These items are built around the way strong ad-science teams write experiment readouts: economic hurdles, downside cases, causal credibility, and restraint when the memo is not ready.',
    scenarioThemes: [
      'Lead-gen holdouts with CAC and payback thresholds',
      'Brand lift surveys and the limits of what they prove',
      'Geo tests with counterfactual and matched-market discipline',
      'High-variance value experiments where the lower bound matters',
    ],
    analystMoves: [
      'Write the absolute lift first, then ask whether it clears the commercial hurdle.',
      'Use p-values and intervals as evidence summaries, not certainty machines or finance memos.',
      'Keep causal evidence, business magnitude, and validity threats separate in the recommendation.',
    ],
  },
  adRegression: {
    title: 'Advertising modeling brief',
    description:
      'These items focus on the modeling judgments that matter in spend-response work: controls, coefficient interpretation, residual diagnosis, extrapolation risk, and the line between planning and causality.',
    scenarioThemes: [
      'Naive versus adjusted spend-response models',
      'Branded demand and promotion confounding',
      'Residual curvature and diminishing returns',
      'Forecast risk outside the observed spend range',
    ],
    analystMoves: [
      'Interpret coefficients conditionally and keep the controls explicit in the story.',
      'Use diagnostics to challenge the model form rather than defend it.',
      'Do not treat fit, forecasts, or a cleaned-up coefficient as proof of incrementality.',
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
