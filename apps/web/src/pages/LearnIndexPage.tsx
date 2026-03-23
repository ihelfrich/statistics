import { Link } from 'react-router-dom'
import { categoryLabels, moduleOrder, moduleRegistry } from '../utils/types.ts'

export function LearnIndexPage() {
  return (
    <div className="page-stack">
      <section className="content-card">
        <div className="module-header">
          <span className="panel-label">Learn</span>
          <h2>Curriculum map</h2>
          <p>Start with fundamentals, then move through inference, modeling, and applied analytics.</p>
        </div>
      </section>

      {Object.entries(categoryLabels).map(([category, label]) => {
        const modules = moduleOrder.filter((key) => moduleRegistry[key].category === category)
        return (
          <section key={category} className="content-card">
            <div className="module-header">
              <span className="panel-label">{label}</span>
              <h2>{label} Lessons</h2>
              <p>{modules.length} lessons in this sequence.</p>
            </div>
            <div className="route-card-grid">
              {modules.map((module_key) => (
                <Link key={module_key} to={`/learn/${module_key}`} className="route-card module-card">
                  <strong>{moduleRegistry[module_key].title}</strong>
                  <span>{moduleRegistry[module_key].description}</span>
                  <small>{moduleRegistry[module_key].estimatedMinutes} minutes</small>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
