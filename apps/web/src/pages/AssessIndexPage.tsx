import { Link } from 'react-router-dom'
import { formal_assessment_catalog } from '../data/assessmentData.ts'

export function AssessIndexPage() {
  return (
    <div className="page-stack">
      <section className="content-card">
        <div className="module-header">
          <span className="panel-label">Assess</span>
          <h2>Recorded pilot forms</h2>
          <p>These diagnostics use issued student IDs and test codes so the site can capture item-level evidence without pretending this is already a validated, high-stakes instrument.</p>
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
