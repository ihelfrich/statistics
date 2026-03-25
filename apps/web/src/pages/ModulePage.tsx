import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs.tsx'
import {
  AdvertisingDiagnosticsStudio,
  AdvertisingExperimentsStudio,
  AdvertisingRegressionStudio,
  AnovaStudio,
  BootstrapStudio,
  ConfidenceIntervalStudio,
  CovarianceStudio,
  DescriptiveStudio,
  DistributionsStudio,
  ExpectationStudio,
  HypothesisTestingStudio,
  LLNStudio,
  ProbabilityStudio,
  RegressionStudio,
  SamplingStudio,
} from '../modules/index.ts'
import { markVisitedModule } from '../utils/progress.ts'
import { isModuleKey, moduleOrder, moduleRegistry, type ModuleKey } from '../utils/types.ts'

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
  adDiagnostics: AdvertisingDiagnosticsStudio,
  adExperiments: AdvertisingExperimentsStudio,
  adRegression: AdvertisingRegressionStudio,
}

export function ModulePage() {
  const { moduleKey: routeModuleKey } = useParams()
  const moduleKey = routeModuleKey && isModuleKey(routeModuleKey) ? routeModuleKey : null

  useEffect(() => {
    if (moduleKey) {
      markVisitedModule(moduleKey)
    }
  }, [moduleKey])

  if (!moduleKey) {
    return <Navigate to="/learn" replace />
  }

  const meta = moduleRegistry[moduleKey]
  const Studio = studioMap[moduleKey]
  const index = moduleOrder.indexOf(moduleKey)
  const previous = index > 0 ? moduleOrder[index - 1] : null
  const next = index < moduleOrder.length - 1 ? moduleOrder[index + 1] : null

  return (
    <div className="page-stack">
      <section className="content-card">
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Learn', to: '/learn' },
            { label: meta.title },
          ]}
        />
        <div className="module-header">
          <span className="panel-label">{meta.pathway}</span>
          <h2>{meta.title}</h2>
          <p>{meta.description}</p>
        </div>
        <div className="button-row">
          <Link to={`/practice/${moduleKey}`} className="primary-button">
            Checkpoint
          </Link>
          {next ? (
            <Link to={`/learn/${next}`} className="secondary-button">
              Next: {moduleRegistry[next].title}
            </Link>
          ) : null}
        </div>
        <div className="module-route-footer">
          {previous ? (
            <Link to={`/learn/${previous}`}>← {moduleRegistry[previous].title}</Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/learn/${next}`}>{moduleRegistry[next].title} →</Link>
          ) : null}
        </div>
      </section>

      <Studio />
    </div>
  )
}
