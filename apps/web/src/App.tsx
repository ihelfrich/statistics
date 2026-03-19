import { startTransition, useState } from 'react'
import './App.css'
import type { ModuleKey } from './utils/types.ts'
import { moduleRegistry, moduleOrder, categoryLabels } from './utils/types.ts'
import { MetricCard } from './components/index.ts'
import {
  DescriptiveStudio,
  ProbabilityStudio,
  ExpectationStudio,
  DistributionsStudio,
  CovarianceStudio,
  SamplingStudio,
  LLNStudio,
  ConfidenceIntervalStudio,
  HypothesisTestingStudio,
  RegressionStudio,
  AnovaStudio,
  BootstrapStudio,
} from './modules/index.ts'

const studioMap: Record<ModuleKey, () => React.JSX.Element> = {
  descriptive: DescriptiveStudio,
  probability: ProbabilityStudio,
  expectation: ExpectationStudio,
  distributions: DistributionsStudio,
  covariance: CovarianceStudio,
  sampling: SamplingStudio,
  lln: LLNStudio,
  confidence: ConfidenceIntervalStudio,
  testing: HypothesisTestingStudio,
  regression: RegressionStudio,
  anova: AnovaStudio,
  bootstrap: BootstrapStudio,
}

const syllabus = [
  'Descriptive statistics and data visualization',
  'Probability laws and event algebra',
  'Expectation, variance, and linearity rules',
  'Discrete and continuous distributions',
  'Covariance, correlation, and association',
  'Sampling distributions and the CLT',
  'Law of large numbers and convergence',
  'Confidence intervals and coverage',
  'Hypothesis tests, p-values, and power',
  'Linear regression and diagnostics',
  'ANOVA and group comparisons',
  'Bootstrap and resampling methods',
]

const categories = ['foundations', 'inference', 'modeling'] as const

function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('descriptive')

  const ActiveStudio = studioMap[activeModule]

  return (
    <div className="app-shell">
      <section className="hero-band reveal">
        <div className="hero-copy">
          <span className="eyebrow">Undergraduate probability & statistics</span>
          <h1>An interactive studio for learning statistics — not a static textbook.</h1>
          <p className="lede">
            Twelve interactive modules covering the full undergraduate sequence:
            from descriptive summaries through probability, inference, regression,
            ANOVA, and modern resampling methods.
          </p>
          <div className="hero-stats">
            <MetricCard value="12" label="interactive modules" />
            <MetricCard value="3" label="course sections" />
            <MetricCard value="100%" label="browser-based" />
          </div>
        </div>
        <div className="hero-syllabus reveal-delay-1">
          <div className="panel-label">Full curriculum</div>
          <ul className="syllabus-list">
            {syllabus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <nav className="module-nav reveal-delay-1">
        {categories.map((cat) => {
          const modulesInCat = moduleOrder.filter((k) => moduleRegistry[k].category === cat)
          return (
            <div key={cat} className="nav-category">
              <span className="nav-category-label">{categoryLabels[cat]}</span>
              <div className="nav-category-tabs">
                {modulesInCat.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`module-tab ${activeModule === key ? 'active' : ''}`}
                    onClick={() => startTransition(() => setActiveModule(key))}
                  >
                    <span className="module-kicker">{moduleRegistry[key].kicker}</span>
                    <strong>{moduleRegistry[key].title}</strong>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      <section className="module-stage reveal-delay-2">
        <ActiveStudio />
      </section>

      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Ian Helfrich. All rights reserved.</p>
        <p className="footer-license">
          This material is provided for individual personal educational use only.
          No part of this application — including code, visualizations, text, data, or design — may be
          copied, reproduced, distributed, modified, reverse-engineered, or used for any commercial
          or derivative purpose without prior written permission from the author.
        </p>
      </footer>
    </div>
  )
}

export default App
