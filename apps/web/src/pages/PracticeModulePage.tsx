import { Navigate, useParams } from 'react-router-dom'
import { AssessmentWorkspace } from '../components/AssessmentWorkspace.tsx'
import { Breadcrumbs } from '../components/Breadcrumbs.tsx'
import { assessment_items, getCheckpointForm } from '../data/assessmentData.ts'
import { isModuleKey, moduleRegistry } from '../utils/types.ts'

export function PracticeModulePage() {
  const { moduleKey } = useParams()
  if (!moduleKey || !isModuleKey(moduleKey)) {
    return <Navigate to="/practice" replace />
  }

  const form = getCheckpointForm(moduleKey)
  const items = form.item_ids.map((item_id) => assessment_items[item_id]).filter(Boolean)

  return (
    <div className="page-stack">
      <section className="content-card">
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Practice', to: '/practice' },
            { label: moduleRegistry[moduleKey].title },
          ]}
        />
        <div className="module-header">
          <span className="panel-label">Module checkpoint</span>
          <h2>{moduleRegistry[moduleKey].title}</h2>
          <p>Short objective practice tied directly to the routed module page and its core learning objectives.</p>
        </div>
      </section>

      <AssessmentWorkspace form={form} items={items} mode="practice" />
    </div>
  )
}
