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
          <span className="eyebrow">Navigate the course as a real learning app</span>
          <h1>Learn, practice, assess, and measure from one routed statistics workspace.</h1>
          <p className="lede">
            The site now uses durable routes, checkpoint practice, recorded pilot diagnostics,
            and a measurement page that explains exactly what gets stored and what this
            instrument does not claim.
          </p>
          <div className="hero-stats">
            <MetricCard value={visited_ratio} label="modules visited" />
            <MetricCard value={String(completed_checkpoints)} label="checkpoints completed" />
            <MetricCard value={String(completed_formals)} label="recorded forms submitted" />
          </div>
          <div className="button-row">
            <Link to={`/learn/${continue_module}`} className="primary-button">
              Continue learning
            </Link>
            <Link to="/assess" className="secondary-button">
              Open assessments
            </Link>
          </div>
        </div>
        <div className="hero-syllabus reveal-delay-1">
          <div className="panel-label">Current focus</div>
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
            <span className="panel-label">Workflow navigation</span>
            <h2>Course pathways</h2>
            <p>Explore by concept family, then drop into a checkpoint or diagnostic without losing your place.</p>
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
            <span className="panel-label">Recorded pilot forms</span>
            <h2>Assessment hub</h2>
            <p>Use pseudonymous IDs and test codes for forms that feed the GitHub-backed pilot measurement pipeline.</p>
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
