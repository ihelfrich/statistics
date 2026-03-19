import { useState, useMemo } from 'react'
import { ModuleHeader, MetricCard, Slider } from '../components/index.ts'
import {
  formatNumber,
  mulberry32,
  normalRandom,
  mean,
  stdDev,
  covariance,
  correlation,
  linearRegression,
} from '../utils/math.ts'

type PresetKey = 'positive' | 'negative' | 'none' | 'nonlinear'

function generateData(rng: () => number, n: number, targetR: number) {
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < n; i++) {
    const x = normalRandom(rng) * 10 + 50
    const noise = normalRandom(rng) * 10
    const y = targetR * (x - 50) + Math.sqrt(1 - targetR * targetR) * noise + 50
    xs.push(x)
    ys.push(y)
  }
  return { xs, ys }
}

function generateNonlinear(rng: () => number, n: number) {
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < n; i++) {
    const x = rng() * 20 - 10
    const y = x * x + normalRandom(rng) * 8
    xs.push(x)
    ys.push(y)
  }
  return { xs, ys }
}

const presetConfigs: Record<PresetKey, { label: string; targetR: number | null }> = {
  positive: { label: 'Strong positive', targetR: 0.85 },
  negative: { label: 'Strong negative', targetR: -0.8 },
  none: { label: 'No correlation', targetR: 0 },
  nonlinear: { label: 'Nonlinear', targetR: null },
}

export function CovarianceStudio() {
  const [preset, setPreset] = useState<PresetKey>('positive')
  const [sampleSize, setSampleSize] = useState(60)
  const [seed, setSeed] = useState(77)

  const { xs, ys } = useMemo(() => {
    const rng = mulberry32(seed)
    const cfg = presetConfigs[preset]
    if (cfg.targetR !== null) return generateData(rng, sampleSize, cfg.targetR)
    return generateNonlinear(rng, sampleSize)
  }, [preset, sampleSize, seed])

  const mx = mean(xs)
  const my = mean(ys)
  const sx = stdDev(xs)
  const sy = stdDev(ys)
  const cov = covariance(xs, ys)
  const r = correlation(xs, ys)
  const reg = linearRegression(xs, ys)

  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = Math.min(...ys)
  const yMax = Math.max(...ys)
  const padX = (xMax - xMin) * 0.1 || 5
  const padY = (yMax - yMin) * 0.1 || 5
  const domainXL = xMin - padX
  const domainXR = xMax + padX
  const domainYL = yMin - padY
  const domainYR = yMax + padY
  const toSvgX = (v: number) => 70 + ((v - domainXL) / (domainXR - domainXL)) * 480
  const toSvgY = (v: number) => 230 - ((v - domainYL) / (domainYR - domainYL)) * 190

  const regLineX1 = domainXL
  const regLineX2 = domainXR
  const regLineY1 = reg.intercept + reg.slope * regLineX1
  const regLineY2 = reg.intercept + reg.slope * regLineX2

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Covariance & correlation"
          title="How two variables move together"
          description="Covariance captures the direction of linear association. Correlation standardizes it to [-1, 1]. But beware: correlation ≠ causation, and it misses nonlinear patterns."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <div className="choice-row">
              <span>Pattern</span>
              <div className="choice-buttons">
                {(Object.keys(presetConfigs) as PresetKey[]).map((key) => (
                  <button key={key} type="button" className={`mini-choice ${preset === key ? 'active' : ''}`} onClick={() => setPreset(key)}>
                    {presetConfigs[key].label}
                  </button>
                ))}
              </div>
            </div>
            <Slider label="Sample size" value={sampleSize} min={20} max={200} step={10} display={String(sampleSize)} note="Number of (x, y) pairs." onChange={(v) => setSampleSize(Math.round(v))} />
            <div className="button-stack">
              <button type="button" className="primary-button" onClick={() => setSeed((c) => c + 1)}>Generate new data</button>
            </div>
          </aside>

          <div className="module-content">
            <div className="metric-strip wide">
              <MetricCard value={formatNumber(cov, 3)} label="Cov(X,Y)" />
              <MetricCard value={formatNumber(r, 3)} label="r (correlation)" />
              <MetricCard value={formatNumber(r * r, 3)} label="R²" />
              <MetricCard value={formatNumber(reg.slope, 3)} label="slope β̂₁" />
            </div>

            <section className="content-card inset">
              <h3>Scatter plot</h3>
              <p>Each point is one (x, y) observation. The regression line minimizes the sum of squared vertical distances.</p>
              <svg viewBox="0 0 600 280" className="chart-svg" role="img" aria-label="Scatter plot">
                <rect x="0" y="0" width="600" height="280" rx="24" className="chart-frame" />
                <line x1="70" y1="230" x2="550" y2="230" stroke="rgba(19,34,71,0.1)" strokeWidth="1" />
                <line x1="70" y1="40" x2="70" y2="230" stroke="rgba(19,34,71,0.1)" strokeWidth="1" />
                <line
                  x1={toSvgX(regLineX1)}
                  y1={toSvgY(regLineY1)}
                  x2={toSvgX(regLineX2)}
                  y2={toSvgY(regLineY2)}
                  stroke="rgba(225,86,42,0.7)"
                  strokeWidth="2.5"
                  strokeDasharray="8 6"
                />
                {xs.map((x, i) => (
                  <circle
                    key={i}
                    cx={toSvgX(x)}
                    cy={toSvgY(ys[i])}
                    r="4"
                    fill="rgba(45,96,176,0.6)"
                    stroke="rgba(45,96,176,0.9)"
                    strokeWidth="1.5"
                  />
                ))}
                <circle cx={toSvgX(mx)} cy={toSvgY(my)} r="6" fill="rgba(225,86,42,0.9)" stroke="white" strokeWidth="2" />
                <text x="26" y="28" className="chart-caption">Y</text>
                <text x="530" y="250" className="axis-label">X</text>
              </svg>
            </section>

            <section className="content-card inset">
              <h3>Key relationships</h3>
              <div className="explanation-panel">
                <code>r = Cov(X,Y) / (S_X · S_Y) = {formatNumber(cov, 3)} / ({formatNumber(sx, 3)} · {formatNumber(sy, 3)}) = {formatNumber(r, 3)}</code>
                <code>β̂₁ = r · (S_Y / S_X) = {formatNumber(r, 3)} · ({formatNumber(sy, 3)} / {formatNumber(sx, 3)}) = {formatNumber(reg.slope, 3)}</code>
                <p className="strong-text">
                  {preset === 'nonlinear'
                    ? 'The correlation is near zero despite an obvious pattern. Correlation only measures linear association.'
                    : Math.abs(r) > 0.7
                      ? `A strong linear relationship (r = ${formatNumber(r, 3)}) — the points cluster tightly around the regression line.`
                      : `A weak linear relationship (r = ${formatNumber(r, 3)}) — the points are widely scattered around the regression line.`}
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
