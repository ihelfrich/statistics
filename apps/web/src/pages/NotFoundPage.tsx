import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="page-stack">
      <section className="content-card">
        <div className="module-header">
          <span className="panel-label">Not found</span>
          <h2>That page is not available.</h2>
          <p>Use the navigation to return to the lessons, checkpoints, or timed diagnostics.</p>
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
