import { Link } from 'react-router-dom'

export function GuidePage() {
  return (
    <div className="page-stack">
      <section className="content-card">
        <div className="module-header">
          <span className="panel-label">Guide</span>
          <h2>How to use the course</h2>
          <p>
            Move through the site in a simple rhythm: learn the idea, check it quickly,
            then use a longer diagnostic when you want a broader read on readiness.
          </p>
        </div>
      </section>

      <div className="two-up-grid">
        <section className="content-card inset">
          <h3>Recommended flow</h3>
          <p>
            Start with the lesson, use the checkpoint right away, and save the timed
            diagnostics for larger blocks of review.
          </p>
        </section>
        <section className="content-card inset">
          <h3>What scores mean</h3>
          <p>
            Checkpoints are narrow self-checks. Diagnostics pull together multiple topics
            and give a broader picture of current command.
          </p>
        </section>
      </div>

      <div className="two-up-grid">
        <section className="content-card inset">
          <h3>Instructor-run assessments</h3>
          <p>
            If your instructor asks you to take a timed diagnostic, enter the learner ID
            and assessment code you were given, then work straight through the form.
          </p>
        </section>
        <section className="content-card inset">
          <h3>Privacy</h3>
          <p>
            Use only the learner ID assigned for the assessment. Avoid entering personal
            information unless your instructor explicitly asks for it.
          </p>
        </section>
      </div>

      <section className="content-card inset">
        <div className="button-row">
          <Link to="/learn" className="primary-button">
            Open lessons
          </Link>
          <Link to="/assess" className="secondary-button">
            View diagnostics
          </Link>
        </div>
      </section>
    </div>
  )
}
