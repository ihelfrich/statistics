import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="page-stack">
      <section className="content-card">
        <div className="module-header">
          <span className="panel-label">Not found</span>
          <h2>This route does not exist.</h2>
          <p>Use the routed course navigation to return to the curriculum, checkpoints, or recorded assessments.</p>
        </div>
        <div className="button-row">
          <Link to="/" className="primary-button">
            Go home
          </Link>
          <Link to="/learn" className="secondary-button">
            Open curriculum
          </Link>
        </div>
      </section>
    </div>
  )
}
