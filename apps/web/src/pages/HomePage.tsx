import { Link } from 'react-router-dom'
import { useCourseProgress } from '../utils/progress.ts'
import { moduleOrder, moduleRegistry } from '../utils/types.ts'

const trackMeta: Record<string, { description: string }> = {
  foundations: {
    description:
      'The building blocks. Distributions, probability, expectation, and the relationships between variables.',
  },
  inference: {
    description:
      'From sample to conclusion. The CLT, confidence intervals, and what hypothesis tests actually tell you.',
  },
  modeling: {
    description:
      'Regression, variance decomposition, and inference without strong distributional assumptions.',
  },
  applied: {
    description:
      'Applied measurement for advertising. Diagnostics, lift experiments, and spend-response models with the controls that matter.',
  },
}

const tracks = [
  { category: 'foundations', label: 'Foundations' },
  { category: 'inference', label: 'Inference' },
  { category: 'modeling', label: 'Modeling' },
  { category: 'applied', label: 'Advertising Analytics' },
]

export function HomePage() {
  const progress = useCourseProgress()
  const continue_module = progress.last_module_key ?? moduleOrder[0]
  const visited_count = progress.visited_modules.length

  return (
    <div className="page-stack reveal">
      <section className="content-card home-header">
        <div>
          <span className="panel-label">Statistics Studio</span>
          <h1>Fifteen lessons. Four tracks.</h1>
          <p className="lede">
            Probability and inference through advertising measurement. Built for
            professionals who work with data and need to reason clearly about uncertainty.
          </p>
          {visited_count > 0 && (
            <p className="progress-note">
              {visited_count} of {moduleOrder.length} modules visited
            </p>
          )}
        </div>
        <div className="button-row">
          <Link to={`/learn/${continue_module}`} className="primary-button">
            {progress.last_module_key ? 'Continue' : 'Start here'}
          </Link>
          <Link to="/learn/adDiagnostics" className="secondary-button">
            Advertising Analytics
          </Link>
        </div>
      </section>

      {tracks.map(({ category, label }) => {
        const modules = moduleOrder.filter((key) => moduleRegistry[key].category === category)
        const meta = trackMeta[category]
        return (
          <section
            key={category}
            className={`content-card curriculum-track ${category === 'applied' ? 'track-featured' : ''}`}
          >
            <div className="track-header">
              <span className="panel-label">{label}</span>
              <p>{meta.description}</p>
            </div>
            <div className="track-modules">
              {modules.map((key) => {
                const mod = moduleRegistry[key]
                const visited = progress.visited_modules.includes(key)
                return (
                  <Link
                    key={key}
                    to={`/learn/${key}`}
                    className={`module-entry ${visited ? 'visited' : ''}`}
                  >
                    <span className="module-entry-kicker">{mod.kicker}</span>
                    <strong>{mod.title}</strong>
                    <span className="module-entry-time">{mod.estimatedMinutes} min</span>
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
