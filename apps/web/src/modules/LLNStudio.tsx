import { useState, useMemo } from 'react'
import { ModuleHeader, MetricCard, Slider } from '../components/index.ts'
import { formatNumber, mulberry32, buildPolyline } from '../utils/math.ts'

type PopulationKey = 'bernoulli' | 'uniform' | 'exponential'

const populations: Record<PopulationKey, { label: string; trueMean: number; draw: (rng: () => number) => number }> = {
  bernoulli: {
    label: 'Bernoulli (p=0.6)',
    trueMean: 0.6,
    draw: (rng) => (rng() < 0.6 ? 1 : 0),
  },
  uniform: {
    label: 'Uniform [0,1]',
    trueMean: 0.5,
    draw: (rng) => rng(),
  },
  exponential: {
    label: 'Exponential (λ=1)',
    trueMean: 1,
    draw: (rng) => -Math.log(Math.max(rng(), 1e-12)),
  },
}

export function LLNStudio() {
  const [population, setPopulation] = useState<PopulationKey>('bernoulli')
  const [maxN, setMaxN] = useState(500)
  const [seed, setSeed] = useState(99)
  const [numPaths, setNumPaths] = useState(1)

  const pop = populations[population]

  const paths = useMemo(() => {
    const result: Array<{ x: number; y: number }[]> = []
    for (let p = 0; p < numPaths; p++) {
      const rng = mulberry32(seed + p * 137)
      let sum = 0
      const points: { x: number; y: number }[] = []
      const step = Math.max(1, Math.floor(maxN / 400))
      for (let i = 1; i <= maxN; i++) {
        sum += pop.draw(rng)
        if (i % step === 0 || i === maxN || i <= 10) {
          points.push({ x: i, y: sum / i })
        }
      }
      result.push(points)
    }
    return result
  }, [maxN, seed, numPaths, pop])

  const lastMeans = paths.map((p) => p[p.length - 1].y)
  const finalMean = lastMeans.reduce((s, v) => s + v, 0) / lastMeans.length
  const maxDeviation = Math.max(...lastMeans.map((m) => Math.abs(m - pop.trueMean)))

  const allY = paths.flatMap((p) => p.map((pt) => pt.y))
  const yMin = Math.min(...allY, pop.trueMean - 0.3)
  const yMax = Math.max(...allY, pop.trueMean + 0.3)
  const padY = (yMax - yMin) * 0.1
  const domainYL = yMin - padY
  const domainYR = yMax + padY

  const xScale = (v: number) => 70 + (v / maxN) * 480
  const yScale = (v: number) => 230 - ((v - domainYL) / (domainYR - domainYL)) * 190

  const pathColors = [
    'rgba(45,96,176,0.85)',
    'rgba(225,86,42,0.75)',
    'rgba(123,54,140,0.75)',
    'rgba(34,139,34,0.7)',
    'rgba(180,63,23,0.7)',
  ]

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Law of large numbers"
          title="Convergence of the sample mean"
          description="The weak law says the sample mean converges in probability to the population mean. Watch it happen — the running average stabilizes as n grows."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <div className="choice-row">
              <span>Population</span>
              <div className="choice-buttons">
                {(Object.keys(populations) as PopulationKey[]).map((key) => (
                  <button key={key} type="button" className={`mini-choice ${population === key ? 'active' : ''}`} onClick={() => setPopulation(key)}>
                    {populations[key].label}
                  </button>
                ))}
              </div>
            </div>
            <Slider label="Max sample size" value={maxN} min={50} max={2000} step={50} display={String(maxN)} note="How many observations to draw." onChange={(v) => setMaxN(Math.round(v))} />
            <Slider label="Number of paths" value={numPaths} min={1} max={5} step={1} display={String(numPaths)} note="Overlay independent realizations." onChange={(v) => setNumPaths(Math.round(v))} />
            <div className="button-stack">
              <button type="button" className="primary-button" onClick={() => setSeed((c) => c + 1)}>New realization</button>
            </div>
          </aside>

          <div className="module-content">
            <div className="metric-strip wide">
              <MetricCard value={formatNumber(pop.trueMean, 4)} label="true mean μ" />
              <MetricCard value={formatNumber(finalMean, 4)} label={`x̄ at n=${maxN}`} />
              <MetricCard value={formatNumber(maxDeviation, 4)} label="max |x̄ - μ|" />
              <MetricCard value={String(maxN)} label="observations" />
            </div>

            <section className="content-card inset">
              <h3>Running average vs. n</h3>
              <p>The dashed line is the true population mean μ = {formatNumber(pop.trueMean, 4)}. Each path is an independent sequence of draws. Early volatility settles as n increases.</p>
              <svg viewBox="0 0 600 280" className="chart-svg" role="img" aria-label="LLN convergence">
                <rect x="0" y="0" width="600" height="280" rx="24" className="chart-frame" />
                <line x1="70" y1={yScale(pop.trueMean)} x2="550" y2={yScale(pop.trueMean)} className="reference-line theoretical" />
                {paths.map((points, i) => (
                  <polyline
                    key={i}
                    points={buildPolyline(points, xScale, yScale)}
                    fill="none"
                    stroke={pathColors[i % pathColors.length]}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                <text x="26" y="28" className="chart-caption">x&#772;</text>
                <text x="530" y="250" className="axis-label">n</text>
              </svg>
            </section>

            <section className="content-card inset">
              <h3>Why convergence happens</h3>
              <div className="explanation-panel">
                <p className="strong-text">As n grows, the variance of x&#772; shrinks like σ²/n — making large deviations from μ increasingly unlikely.</p>
                <p>The LLN does not say individual observations become less variable. It says the average of many observations stabilizes. This is the theoretical foundation for sampling-based inference.</p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
