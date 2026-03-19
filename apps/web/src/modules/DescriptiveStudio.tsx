import { useState, useMemo } from 'react'
import { ModuleHeader, MetricCard, Slider } from '../components/index.ts'
import {
  formatNumber,
  mulberry32,
  normalRandom,
  mean,
  median,
  stdDev,
  quantile,
  buildPolyline,
} from '../utils/math.ts'

type ShapeKey = 'symmetric' | 'right-skew' | 'left-skew' | 'bimodal' | 'uniform'

const shapePresets: Record<ShapeKey, { label: string; generate: (rng: () => number, n: number) => number[] }> = {
  symmetric: {
    label: 'Symmetric',
    generate: (rng, n) => Array.from({ length: n }, () => 50 + normalRandom(rng) * 12),
  },
  'right-skew': {
    label: 'Right-skewed',
    generate: (rng, n) => Array.from({ length: n }, () => {
      const z = Math.abs(normalRandom(rng))
      return 30 + z * 15
    }),
  },
  'left-skew': {
    label: 'Left-skewed',
    generate: (rng, n) => Array.from({ length: n }, () => {
      const z = Math.abs(normalRandom(rng))
      return 80 - z * 15
    }),
  },
  bimodal: {
    label: 'Bimodal',
    generate: (rng, n) => Array.from({ length: n }, () => {
      const cluster = rng() < 0.5 ? 35 : 65
      return cluster + normalRandom(rng) * 6
    }),
  },
  uniform: {
    label: 'Uniform',
    generate: (rng, n) => Array.from({ length: n }, () => 20 + rng() * 60),
  },
}

export function DescriptiveStudio() {
  const [shape, setShape] = useState<ShapeKey>('symmetric')
  const [sampleSize, setSampleSize] = useState(80)
  const [seed, setSeed] = useState(42)
  const [showBoxplot, setShowBoxplot] = useState(true)

  const data = useMemo(() => {
    const rng = mulberry32(seed)
    return shapePresets[shape].generate(rng, sampleSize)
  }, [shape, sampleSize, seed])

  const sorted = useMemo(() => [...data].sort((a, b) => a - b), [data])
  const m = mean(data)
  const med = median(data)
  const sd = stdDev(data)
  const q1 = quantile(data, 0.25)
  const q3 = quantile(data, 0.75)
  const iqr = q3 - q1
  const minVal = sorted[0]
  const maxVal = sorted[sorted.length - 1]
  const skewness = useMemo(() => {
    const n = data.length
    if (n < 3 || sd === 0) return 0
    const s3 = data.reduce((s, v) => s + ((v - m) / sd) ** 3, 0)
    return (n / ((n - 1) * (n - 2))) * s3
  }, [data, m, sd])

  const binCount = Math.min(Math.ceil(Math.sqrt(sampleSize)), 20)
  const binWidth = (maxVal - minVal) / binCount || 1
  const bins = useMemo(() => {
    const b = Array.from({ length: binCount }, (_, i) => ({
      lo: minVal + i * binWidth,
      hi: minVal + (i + 1) * binWidth,
      count: 0,
    }))
    for (const v of sorted) {
      const idx = Math.min(Math.floor((v - minVal) / binWidth), binCount - 1)
      b[idx].count++
    }
    return b
  }, [sorted, binCount, binWidth, minVal])
  const maxBin = Math.max(...bins.map((b) => b.count), 1)

  const whiskerLo = Math.max(minVal, q1 - 1.5 * iqr)
  const whiskerHi = Math.min(maxVal, q3 + 1.5 * iqr)
  const outliers = sorted.filter((v) => v < whiskerLo || v > whiskerHi)

  const pad = (maxVal - minVal) * 0.08 || 5
  const domainL = minVal - pad
  const domainR = maxVal + pad
  const xScale = (v: number) => 60 + ((v - domainL) / (domainR - domainL)) * 480

  const cdfPoints = sorted.map((v, i) => ({ x: v, y: (i + 1) / sorted.length }))

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Descriptive statistics"
          title="Summarize before you infer"
          description="Every analysis starts here. Understand the center, spread, and shape of your data before fitting models or running tests."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <div className="choice-row">
              <span>Distribution shape</span>
              <div className="choice-buttons">
                {(Object.keys(shapePresets) as ShapeKey[]).map((key) => (
                  <button key={key} type="button" className={`mini-choice ${shape === key ? 'active' : ''}`} onClick={() => setShape(key)}>
                    {shapePresets[key].label}
                  </button>
                ))}
              </div>
            </div>
            <Slider label="Sample size" value={sampleSize} min={20} max={300} step={10} display={String(sampleSize)} note="Number of observations." onChange={(v) => setSampleSize(Math.round(v))} />
            <div className="choice-row">
              <span>Overlay</span>
              <div className="choice-buttons">
                <button type="button" className={`mini-choice ${showBoxplot ? 'active' : ''}`} onClick={() => setShowBoxplot(true)}>Box plot</button>
                <button type="button" className={`mini-choice ${!showBoxplot ? 'active' : ''}`} onClick={() => setShowBoxplot(false)}>Dot strip</button>
              </div>
            </div>
            <div className="button-stack">
              <button type="button" className="primary-button" onClick={() => setSeed((c) => c + 1)}>Generate new sample</button>
            </div>
          </aside>

          <div className="module-content">
            <div className="metric-strip wide">
              <MetricCard value={formatNumber(m)} label="mean" />
              <MetricCard value={formatNumber(med)} label="median" />
              <MetricCard value={formatNumber(sd)} label="std dev" />
              <MetricCard value={formatNumber(skewness)} label="skewness" />
            </div>
            <div className="metric-strip wide">
              <MetricCard value={formatNumber(q1)} label="Q1 (25th)" />
              <MetricCard value={formatNumber(q3)} label="Q3 (75th)" />
              <MetricCard value={formatNumber(iqr)} label="IQR" />
              <MetricCard value={formatNumber(maxVal - minVal)} label="range" />
            </div>

            <section className="content-card inset">
              <h3>Histogram</h3>
              <p>The height of each bar shows how many observations fall in that bin. The dashed line marks the mean; the solid line marks the median.</p>
              <svg viewBox="0 0 600 300" className="chart-svg" role="img" aria-label="Histogram">
                <rect x="0" y="0" width="600" height="300" rx="24" className="chart-frame" />
                {bins.map((bin, i) => {
                  const h = 180 * (bin.count / maxBin)
                  const bx = xScale(bin.lo)
                  const bw = xScale(bin.hi) - xScale(bin.lo)
                  return (
                    <g key={i}>
                      <rect x={bx} y={230 - h} width={Math.max(bw - 2, 2)} height={h} className="bar-rect" rx="4" />
                    </g>
                  )
                })}
                <line x1={xScale(m)} y1="32" x2={xScale(m)} y2="230" className="reference-line theoretical" />
                <line x1={xScale(med)} y1="32" x2={xScale(med)} y2="230" className="reference-line empirical" />
                <text x={xScale(m) + 6} y="28" className="axis-label">mean</text>
                <text x={xScale(med) + 6} y="44" className="axis-label">median</text>
                {showBoxplot ? (
                  <g>
                    <line x1={xScale(whiskerLo)} y1="258" x2={xScale(q1)} y2="258" stroke="var(--ink)" strokeWidth="2" />
                    <line x1={xScale(q3)} y1="258" x2={xScale(whiskerHi)} y2="258" stroke="var(--ink)" strokeWidth="2" />
                    <rect x={xScale(q1)} y="248" width={xScale(q3) - xScale(q1)} height="20" rx="6" fill="rgba(45,96,176,0.18)" stroke="rgba(45,96,176,0.6)" strokeWidth="2" />
                    <line x1={xScale(med)} y1="248" x2={xScale(med)} y2="268" stroke="rgba(225,86,42,0.9)" strokeWidth="2.5" />
                    {outliers.map((v, i) => (
                      <circle key={i} cx={xScale(v)} cy="258" r="3" fill="rgba(225,86,42,0.8)" />
                    ))}
                  </g>
                ) : (
                  <g>
                    {sorted.map((v, i) => (
                      <circle key={i} cx={xScale(v)} cy={256 + (i % 3) * 5} r="2.5" fill="rgba(45,96,176,0.5)" />
                    ))}
                  </g>
                )}
                <text x="26" y="28" className="chart-caption">count</text>
              </svg>
            </section>

            <section className="content-card inset">
              <h3>Empirical CDF</h3>
              <p>The cumulative distribution function shows the proportion of data at or below each value. A steep section means many values cluster there.</p>
              <svg viewBox="0 0 600 280" className="chart-svg" role="img" aria-label="CDF">
                <rect x="0" y="0" width="600" height="280" rx="24" className="chart-frame" />
                <polyline
                  points={buildPolyline(cdfPoints, xScale, (v) => 230 - v * 180)}
                  className="curve-line null"
                  strokeWidth="3"
                />
                <line x1="60" y1="230" x2="540" y2="230" stroke="rgba(19,34,71,0.12)" strokeWidth="1" />
                <line x1="60" y1="50" x2="540" y2="50" stroke="rgba(19,34,71,0.08)" strokeWidth="1" strokeDasharray="6 4" />
                <text x="42" y="54" className="axis-label">1.0</text>
                <text x="42" y="234" className="axis-label">0.0</text>
                <text x="26" y="28" className="chart-caption">F(x)</text>
              </svg>
            </section>

            <section className="content-card inset">
              <h3>Why this matters</h3>
              <div className="explanation-panel">
                <p className="strong-text">
                  {Math.abs(skewness) < 0.3
                    ? 'This distribution is approximately symmetric — the mean and median are close.'
                    : skewness > 0
                      ? 'This distribution is right-skewed — the mean is pulled above the median by the right tail.'
                      : 'This distribution is left-skewed — the mean is pulled below the median by the left tail.'}
                </p>
                <p>
                  The five-number summary (min, Q1, median, Q3, max) gives a shape-robust snapshot.
                  The standard deviation captures average distance from the mean but is sensitive to outliers —
                  {outliers.length > 0 ? ` and there are ${outliers.length} outlier(s) beyond the 1.5×IQR fences.` : ' no outliers are flagged here.'}
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
