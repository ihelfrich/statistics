import { Navigate, useParams } from 'react-router-dom'
import { AssessmentWorkspace } from '../components/AssessmentWorkspace.tsx'
import { Breadcrumbs } from '../components/Breadcrumbs.tsx'
import { assessment_items, formal_assessment_forms } from '../data/assessmentData.ts'

export function AssessmentPage() {
  const { assessmentId } = useParams()
  if (!assessmentId || !(assessmentId in formal_assessment_forms)) {
    return <Navigate to="/assess" replace />
  }

  const form = formal_assessment_forms[assessmentId as keyof typeof formal_assessment_forms]
  const items = form.item_ids.map((item_id) => assessment_items[item_id]).filter(Boolean)

  return (
    <div className="page-stack">
      <section className="content-card">
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Assess', to: '/assess' },
            { label: form.title },
          ]}
        />
        <div className="module-header">
          <span className="panel-label">Recorded diagnostic</span>
          <h2>{form.title}</h2>
          <p>{form.subtitle}</p>
        </div>
      </section>

      <AssessmentWorkspace form={form} items={items} mode="recorded" />
    </div>
  )
}
