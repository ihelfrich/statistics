import { useState } from 'react'
import { ModuleHeader, MetricCard, Slider } from '../components/index.ts'
import {
  formatPct,
  formatNumber,
  choose,
  normalPdf,
  normalCdf,
  buildPolyline,
} from '../utils/math.ts'

export function DistributionsStudio() {
  const [binomialN, setBinomialN] = useState(12)
  const [binomialP, setBinomialP] = useState(0.45)
  const [normalMean, setNormalMean] = useState(70)
  const [normalSd, setNormalSd] = useState(10)
  const [normalBand, setNormalBand] = useState(8)

  const binomialBars = Array.from({ length: binomialN + 1 }, (_, k) => ({
    k,
    probability: choose(binomialN, k) * binomialP ** k * (1 - binomialP) ** (binomialN - k),
  }))
  const binomialMean = binomialN * binomialP
  const binomialVariance = binomialN * binomialP * (1 - binomialP)
  const maxBar = Math.max(...binomialBars.map((bar) => bar.probability), 0.01)

  const left = normalMean - 4 * normalSd
  const right = normalMean + 4 * normalSd
  const normalPoints = Array.from({ length: 81 }, (_, index) => {
    const x = left + ((right - left) * index) / 80
    return { x, y: normalPdf(x, normalMean, normalSd) }
  })
  const shadedProbability =
    normalCdf(normalMean + normalBand, normalMean, normalSd) -
    normalCdf(normalMean - normalBand, normalMean, normalSd)
  const maxDensity = Math.max(...normalPoints.map((point) => point.y), 0.001)

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Random variables"
          title="Discrete and continuous distributions"
          description="Move from raw outcomes to structured probability models, expected value, variance, and shaded probability mass."
        />
        <div className="two-up-grid">
          <div className="subpanel">
            <h3>Binomial explorer</h3>
            <p>Count the number of successes in repeated Bernoulli trials.</p>
            <Slider label="Trials n" value={binomialN} min={1} max={20} step={1} display={String(binomialN)} note="Number of independent trials." onChange={(value) => setBinomialN(Math.round(value))} />
            <Slider label="Success probability p" value={binomialP} min={0.05} max={0.95} step={0.01} display={formatPct(binomialP)} note="Probability of success on each trial." onChange={setBinomialP} />
            <div className="metric-strip">
              <MetricCard value={formatNumber(binomialMean)} label="mean np" />
              <MetricCard value={formatNumber(binomialVariance)} label="variance np(1-p)" />
              <MetricCard
                value={formatPct(binomialBars.reduce((best, bar) => (bar.probability > best.probability ? bar : best)).probability)}
                label="highest PMF bar"
              />
            </div>
            <svg viewBox="0 0 520 260" className="chart-svg" role="img" aria-label="Binomial probability bars">
              <rect x="0" y="0" width="520" height="260" rx="24" className="chart-frame" />
              {binomialBars.map((bar, index) => {
                const width = 420 / binomialBars.length
                const barHeight = 150 * (bar.probability / maxBar)
                const x = 56 + index * width
                const y = 204 - barHeight
                return (
                  <g key={bar.k}>
                    <rect x={x} y={y} width={Math.max(width - 6, 6)} height={barHeight} className="bar-rect" />
                    <text x={x + width / 2 - 3} y={224} className="axis-label">{bar.k}</text>
                  </g>
                )
              })}
              <text x="26" y="28" className="chart-caption">P(X = k)</text>
            </svg>
          </div>

          <div className="subpanel">
            <h3>Normal explorer</h3>
            <p>Shift the center and spread, then shade a central band to read probability mass.</p>
            <Slider label="Mean μ" value={normalMean} min={40} max={100} step={1} display={formatNumber(normalMean, 0)} note="Location parameter." onChange={setNormalMean} />
            <Slider label="Standard deviation σ" value={normalSd} min={4} max={20} step={1} display={formatNumber(normalSd, 0)} note="Spread parameter." onChange={setNormalSd} />
            <Slider label="Band width around μ" value={normalBand} min={2} max={24} step={1} display={`±${formatNumber(normalBand, 0)}`} note="Central interval [μ - band, μ + band]." onChange={setNormalBand} />
            <div className="metric-strip">
              <MetricCard value={formatPct(shadedProbability)} label="central probability" />
              <MetricCard value={formatNumber(normalMean - normalBand, 1)} label="lower bound" />
              <MetricCard value={formatNumber(normalMean + normalBand, 1)} label="upper bound" />
            </div>
            <NormalCurve points={normalPoints} mean={normalMean} sd={normalSd} band={normalBand} maxDensity={maxDensity} />
          </div>
        </div>
      </section>
    </div>
  )
}

function NormalCurve({
  points,
  mean,
  sd,
  band,
  maxDensity,
}: {
  points: Array<{ x: number; y: number }>
  mean: number
  sd: number
  band: number
  maxDensity: number
}) {
  const left = mean - 4 * sd
  const right = mean + 4 * sd
  const xScale = (value: number) => 60 + ((value - left) / (right - left)) * 420
  const yScale = (value: number) => 208 - (value / maxDensity) * 148
  const shaded = points.filter((point) => point.x >= mean - band && point.x <= mean + band)

  return (
    <svg viewBox="0 0 520 260" className="chart-svg" role="img" aria-label="Normal curve">
      <rect x="0" y="0" width="520" height="260" rx="24" className="chart-frame" />
      <polygon
        points={`60,208 ${buildPolyline(shaded, xScale, yScale)} ${xScale(mean + band)},208`}
        className="area-fill"
      />
      <polyline points={buildPolyline(points, xScale, yScale)} className="curve-line null" />
      <line x1={xScale(mean)} y1="48" x2={xScale(mean)} y2="208" className="reference-line theoretical" />
      <line x1={xScale(mean - band)} y1="74" x2={xScale(mean - band)} y2="208" className="reference-line empirical" />
      <line x1={xScale(mean + band)} y1="74" x2={xScale(mean + band)} y2="208" className="reference-line empirical" />
      <text x="24" y="28" className="chart-caption">density</text>
    </svg>
  )
}
