export function MeasurementPage() {
  return (
    <div className="page-stack">
      <section className="content-card">
        <div className="module-header">
          <span className="panel-label">Measurement</span>
          <h2>Pilot psychometric instrumentation</h2>
          <p>This site now explains its measurement posture directly: it records analyzable item-level data, but it does not claim that the assessment is already validated.</p>
        </div>
      </section>

      <div className="two-up-grid">
        <section className="content-card inset">
          <h3>What gets captured</h3>
          <p>Pseudonymous student ID, assessment and form version, item IDs, responses, correctness, raw score, response timing, answer-change counts, and session timestamps.</p>
        </section>
        <section className="content-card inset">
          <h3>What does not happen</h3>
          <p>No names or emails are stored in GitHub data files. The system is not positioned as a proctored or high-stakes testing platform.</p>
        </section>
      </div>

      <section className="content-card inset">
        <h3>Storage model</h3>
        <p>Recorded forms submit to a Vercel ingestion layer, which writes raw JSONL records to a private GitHub repo and materializes CSV exports for later item analysis and calibration work.</p>
      </section>
    </div>
  )
}
