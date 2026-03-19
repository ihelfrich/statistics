import { useState } from 'react'
import { ModuleHeader, MetricCard, Slider } from '../components/index.ts'
import {
  formatPct,
  formatNumber,
  formatSigned,
  formatCount,
  round3,
  mulberry32,
  safeDivide,
} from '../utils/math.ts'

export function SamplingStudio() {
  const [populationP, setPopulationP] = useState(0.3)
  const [sampleSize, setSampleSize] = useState(4)
  const [repetitions, setRepetitions] = useState(240)
  const [seed, setSeed] = useState(14)

  const random = mulberry32(seed)
  const means: number[] = []
  for (let rep = 0; rep < repetitions; rep += 1) {
    let successes = 0
    for (let draw = 0; draw < sampleSize; draw += 1) {
      if (random() < populationP) successes += 1
    }
    means.push(successes / sampleSize)
  }

  const buckets = new Map<number, number>()
  means.forEach((value) => {
    const rounded = round3(value)
    buckets.set(rounded, (buckets.get(rounded) ?? 0) + 1)
  })
  const histogram = Array.from(buckets.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value - b.value)

  const empiricalMean = safeDivide(means.reduce((sum, v) => sum + v, 0), means.length)
  const empiricalVariance = safeDivide(
    means.reduce((sum, v) => sum + (v - empiricalMean) ** 2, 0),
    Math.max(means.length - 1, 1),
  )
  const theoreticalMean = populationP
  const theoreticalSd = Math.sqrt((populationP * (1 - populationP)) / sampleSize)
  const maxCount = Math.max(...histogram.map((bar) => bar.count), 1)

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Sampling distribution"
          title="Central Limit Theorem lab"
          description="Repeated samples from the same population create a distribution of sample means. As n increases, that distribution tightens and becomes more bell-shaped."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <Slider label="Population success probability" value={populationP} min={0.05} max={0.95} step={0.01} display={formatPct(populationP)} note="The Bernoulli population mean." onChange={setPopulationP} />
            <Slider label="Sample size n" value={sampleSize} min={1} max={50} step={1} display={String(sampleSize)} note="More observations shrink the sampling spread." onChange={(v) => setSampleSize(Math.round(v))} />
            <Slider label="Repetitions" value={repetitions} min={80} max={500} step={20} display={formatCount(repetitions)} note="How many repeated samples generate the histogram." onChange={(v) => setRepetitions(Math.round(v))} />
            <div className="button-stack">
              <button type="button" className="primary-button" onClick={() => setSeed((c) => c + 1)}>Draw a new batch</button>
            </div>
          </aside>

          <div className="module-content">
            <div className="metric-strip wide">
              <MetricCard value={formatNumber(theoreticalMean, 3)} label="theoretical mean" />
              <MetricCard value={formatNumber(Math.sqrt(empiricalVariance), 3)} label="empirical SD" />
              <MetricCard value={formatNumber(theoreticalSd, 3)} label="theoretical SD" />
              <MetricCard value={formatSigned(empiricalMean - theoreticalMean)} label="mean error" />
            </div>
            <section className="content-card inset">
              <h3>Sampling distribution of x&#772;</h3>
              <p>This histogram shows repeated sample means from a Bernoulli population. The center stays near p, while the spread scales like &radic;(p(1-p)/n).</p>
              <svg viewBox="0 0 620 300" className="chart-svg" role="img" aria-label="Sampling distribution histogram">
                <rect x="0" y="0" width="620" height="300" rx="24" className="chart-frame" />
                {histogram.map((bar, index) => {
                  const width = 480 / Math.max(histogram.length, 1)
                  const height = 180 * (bar.count / maxCount)
                  const x = 70 + index * width
                  const y = 236 - height
                  return (
                    <g key={bar.value}>
                      <rect x={x} y={y} width={Math.max(width - 6, 6)} height={height} className="hist-bar" />
                      <text x={x + width / 2 - 3} y={260} className="axis-label">{bar.value.toFixed(2)}</text>
                    </g>
                  )
                })}
                <line x1={70 + 480 * empiricalMean} y1={42} x2={70 + 480 * empiricalMean} y2={236} className="reference-line empirical" />
                <line x1={70 + 480 * theoreticalMean} y1={42} x2={70 + 480 * theoreticalMean} y2={236} className="reference-line theoretical" />
                <text x="26" y="30" className="chart-caption">frequency</text>
              </svg>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
