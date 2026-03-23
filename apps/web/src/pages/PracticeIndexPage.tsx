import { Link } from 'react-router-dom'
import { useCourseProgress } from '../utils/progress.ts'
import { moduleOrder, moduleRegistry } from '../utils/types.ts'

export function PracticeIndexPage() {
  const progress = useCourseProgress()

  return (
    <div className="page-stack">
      <section className="content-card">
        <div className="module-header">
          <span className="panel-label">Practice</span>
          <h2>Checkpoint hub</h2>
          <p>Each lesson includes a short objective checkpoint for quick scoring and targeted skill diagnosis.</p>
        </div>
      </section>

      <section className="content-card">
        <div className="route-card-grid">
          {moduleOrder.map((module_key) => {
            const result = progress.checkpoint_results[module_key]
            return (
              <Link key={module_key} to={`/practice/${module_key}`} className="route-card module-card">
                <strong>{moduleRegistry[module_key].title}</strong>
                <span>{moduleRegistry[module_key].pathway}</span>
                <small>
                  {result
                    ? `Last score: ${Math.round(result.pct_correct * 100)}% • ${result.mastery_band}`
                    : 'No checkpoint score yet'}
                </small>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
