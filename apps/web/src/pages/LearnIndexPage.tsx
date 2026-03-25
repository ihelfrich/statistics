import { Link } from 'react-router-dom'
import { useCourseProgress } from '../utils/progress.ts'
import { categoryLabels, moduleOrder, moduleRegistry } from '../utils/types.ts'

export function LearnIndexPage() {
  const progress = useCourseProgress()

  return (
    <div className="page-stack">
      {Object.entries(categoryLabels).map(([category, label]) => {
        const modules = moduleOrder.filter((key) => moduleRegistry[key].category === category)
        return (
          <section key={category} className="content-card">
            <div className="module-header">
              <span className="panel-label">{label}</span>
            </div>
            <div className="route-card-grid">
              {modules.map((module_key) => {
                const visited = progress.visited_modules.includes(module_key)
                return (
                  <Link
                    key={module_key}
                    to={`/learn/${module_key}`}
                    className="route-card module-card"
                  >
                    <strong>{moduleRegistry[module_key].title}</strong>
                    <span>{moduleRegistry[module_key].description}</span>
                    <small>
                      {moduleRegistry[module_key].estimatedMinutes} min
                      {visited ? ' · visited' : ''}
                    </small>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
