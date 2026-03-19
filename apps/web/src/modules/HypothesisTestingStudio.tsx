import { useState } from 'react'
import { ModuleHeader, MetricCard, Slider, ChoiceRow } from '../components/index.ts'
import {
  formatPct,
  formatNumber,
  mulberry32,
  normalRandom,
  normalPdf,
  normalCdf,
  buildPolyline,
} from '../utils/math.ts'

const confidenceLookup: Record<number, number> = {
  0.9: 1.645,
  0.95: 1.96,
  0.99: 2.576,
}

const alphaOptions = [0.1, 0.05, 0.01]

export function HypothesisTestingStudio() {
  const [mu0, setMu0] = useState(50)
  const [trueMean, setTrueMean] = useState(54)
  const [sigma, setSigma] = useState(10)
  const [sampleSize, setSampleSize] = useState(36)
  const [alpha, setAlpha] = useState(0.05)
  const [seed, setSeed] = useState(31)

  const standardError = sigma / Math.sqrt(sampleSize)
  const random = mulberry32(seed)
  const sampleMean = mu0 + (trueMean - mu0) + normalRandom(random) * standardError
  const zScore = (sampleMean - mu0) / standardError
  const pValue = 2 * (1 - normalCdf(Math.abs(zScore)))
  const reject = pValue < alpha
  const zCritical = confidenceLookup[1 - alpha]
  const effect = (trueMean - mu0) / standardError
  const power = (1 - normalCdf(zCritical - effect)) + normalCdf(-zCritical - effect)

  const domainLeft = -4
  const domainRight = 4
  const pointsNull = Array.from({ length: 121 }, (_, index) => {
    const x = domainLeft + ((domainRight - domainLeft) * index) / 120
    return { x, y: normalPdf(x) }
  })
  const pointsAlt = Array.from({ length: 121 }, (_, index) => {
    const x = domainLeft + ((domainRight - domainLeft) * index) / 120
    return { x, y: normalPdf(x, effect, 1) }
  })
  const maxDensity = Math.max(...pointsNull.map((p) => p.y), ...pointsAlt.map((p) => p.y), 0.01)
  const xScale = (value: number) => 70 + ((value - domainLeft) / (domainRight - domainLeft)) * 500
  const yScale = (value: number) => 236 - (value / maxDensity) * 170

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Hypothesis testing"
          title="Null distribution, evidence, and power"
          description="A test is a rule for deciding whether the observed statistic is too extreme under the null. The p-value measures extremeness; power measures sensitivity under the alternative."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <Slider label="Null mean μ₀" value={mu0} min={30} max={70} step={1} display={formatNumber(mu0, 0)} note="The benchmark value under H₀." onChange={setMu0} />
            <Slider label="True mean μ" value={trueMean} min={30} max={70} step={1} display={formatNumber(trueMean, 0)} note="The data-generating value under the alternative." onChange={setTrueMean} />
            <Slider label="Known σ" value={sigma} min={4} max={20} step={1} display={formatNumber(sigma, 0)} note="Population standard deviation." onChange={setSigma} />
            <Slider label="Sample size n" value={sampleSize} min={4} max={120} step={1} display={formatNumber(sampleSize, 0)} note="More data increases power." onChange={setSampleSize} />
            <ChoiceRow
              label="Significance level α"
              options={alphaOptions.map((v) => ({ label: String(v), value: v }))}
              value={alpha}
              onChange={setAlpha}
            />
            <div className="button-stack">
              <button type="button" className="primary-button" onClick={() => setSeed((c) => c + 1)}>Draw new sample</button>
            </div>
          </aside>

          <div className="module-content">
            <div className="metric-strip wide">
              <MetricCard value={formatNumber(zScore, 3)} label="observed z" />
              <MetricCard value={formatNumber(pValue, 4)} label="two-sided p-value" />
              <MetricCard value={reject ? 'Reject H₀' : 'Fail to reject H₀'} label="decision" />
              <MetricCard value={formatPct(power)} label="approx. power" />
            </div>
            <section className="content-card inset">
              <h3>Null and alternative in z-space</h3>
              <p>Navy is the null distribution. Orange is the alternative shifted by the effect size. Dashed lines mark critical values, and the solid marker shows the observed z-statistic.</p>
              <svg viewBox="0 0 640 300" className="chart-svg" role="img" aria-label="Hypothesis test distributions">
                <rect x="0" y="0" width="640" height="300" rx="24" className="chart-frame" />
                <polyline points={buildPolyline(pointsNull, xScale, yScale)} className="curve-line null" />
                <polyline points={buildPolyline(pointsAlt, xScale, yScale)} className="curve-line alt" />
                <line x1={xScale(-zCritical)} y1="42" x2={xScale(-zCritical)} y2="236" className="critical-line" />
                <line x1={xScale(zCritical)} y1="42" x2={xScale(zCritical)} y2="236" className="critical-line" />
                <line x1={xScale(zScore)} y1="60" x2={xScale(zScore)} y2="236" className="observed-line" />
                <text x="40" y="30" className="chart-caption">density</text>
                <text x={xScale(zScore) + 8} y="54" className="axis-label">z = {zScore.toFixed(2)}</text>
              </svg>
            </section>
            <section className="content-card inset">
              <h3>Interpretation</h3>
              <div className="explanation-panel">
                <code>H₀: μ = {formatNumber(mu0, 0)} vs. H₁: μ ≠ {formatNumber(mu0, 0)}</code>
                <p className="strong-text">Observed sample mean = {formatNumber(sampleMean, 2)}, so the test statistic is {formatNumber(zScore, 3)}.</p>
                <p>With α = {alpha}, the critical cutoff is ±{formatNumber(zCritical, 3)}. The observed p-value is {formatNumber(pValue, 4)}, so the decision is <strong>{reject ? 'reject the null' : 'fail to reject the null'}</strong>.</p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
