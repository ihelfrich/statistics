import { Link } from 'react-router-dom'
import { formal_assessment_catalog } from '../data/assessmentData.ts'

export function AssessIndexPage() {
  return (
    <div className="page-stack">
      <section className="content-card">
        <div className="module-header">
          <span className="panel-label">Assess</span>
          <h2>Timed diagnostics</h2>
          <p>Use these longer forms for broad review across the course or for applied advertising analytics.</p>
        </div>
      </section>

      <section className="content-card">
        <div className="route-card-grid">
          {formal_assessment_catalog.map((entry) => (
            <Link key={entry.assessment_id} to={entry.route_path} className="route-card">
              <strong>{entry.title}</strong>
              <span>{entry.description}</span>
              <small>{entry.duration_minutes} minutes • {entry.audience}</small>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
