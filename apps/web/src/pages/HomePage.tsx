import { Link } from 'react-router-dom'
import { MetricCard } from '../components/MetricCard.tsx'
import { formal_assessment_catalog } from '../data/assessmentData.ts'
import { useCourseProgress } from '../utils/progress.ts'
import { categoryLabels, moduleOrder, moduleRegistry } from '../utils/types.ts'

export function HomePage() {
  const progress = useCourseProgress()
  const continue_module = progress.last_module_key ?? moduleOrder[0]
  const completed_checkpoints = Object.keys(progress.checkpoint_results).length
  const completed_formals = Object.keys(progress.formal_results).length
  const visited_ratio = `${progress.visited_modules.length} / ${moduleOrder.length}`

  const pathways = Object.entries(categoryLabels).map(([category, label]) => ({
    label,
    description: moduleOrder.filter((key) => moduleRegistry[key].category === category).length,
    href: '/learn',
  }))

  return (
    <div className="page-stack">
      <section className="hero-band reveal">
        <div className="hero-copy">
          <span className="eyebrow">Statistics that holds up in real decisions</span>
          <h1>Build judgment in probability, inference, and advertising analytics.</h1>
          <p className="lede">
            Move from descriptive statistics and probability into confidence intervals,
            hypothesis tests, regression, and realistic campaign analysis. Each lesson has a
            companion checkpoint, and timed diagnostics are available for broader review.
          </p>
          <div className="hero-stats">
            <MetricCard value={visited_ratio} label="lessons opened" />
            <MetricCard value={String(completed_checkpoints)} label="checkpoints completed" />
            <MetricCard value={String(completed_formals)} label="diagnostics finished" />
          </div>
          <div className="button-row">
            <Link to={`/learn/${continue_module}`} className="primary-button">
              Continue learning
            </Link>
            <Link to="/assess" className="secondary-button">
              View diagnostics
            </Link>
          </div>
        </div>
        <div className="hero-syllabus reveal-delay-1">
          <div className="panel-label">Continue here</div>
          <h3>{moduleRegistry[continue_module].title}</h3>
          <p>{moduleRegistry[continue_module].description}</p>
          <div className="tag-row">
            {moduleRegistry[continue_module].learningObjectives.map((objective) => (
              <span key={objective} className="tag-pill">
                {objective}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="two-up-grid">
        <section className="content-card">
          <div className="module-header">
            <span className="panel-label">Study structure</span>
            <h2>Course pathways</h2>
            <p>Start with the fundamentals, then move into inference, modeling, and applied analytics.</p>
          </div>
          <div className="route-card-grid">
            {pathways.map((pathway) => (
              <Link key={pathway.label} to={pathway.href} className="route-card">
                <strong>{pathway.label}</strong>
                <span>{pathway.description} modules</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="content-card">
          <div className="module-header">
            <span className="panel-label">Timed diagnostics</span>
            <h2>Assessment hub</h2>
            <p>Use these longer forms for a broader check of overall readiness in statistics or advertising analytics.</p>
          </div>
          <div className="route-card-grid">
            {formal_assessment_catalog.map((entry) => (
              <Link key={entry.assessment_id} to={entry.route_path} className="route-card">
                <strong>{entry.title}</strong>
                <span>{entry.duration_minutes} minutes</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
