import { useState } from 'react'
import { ModuleHeader, MetricCard, Slider, ChoiceRow } from '../components/index.ts'
import { formatPct, formatNumber, mulberry32, normalRandom } from '../utils/math.ts'

const confidenceLookup: Record<number, number> = {
  0.9: 1.645,
  0.95: 1.96,
  0.99: 2.576,
}

const confidenceOptions = [0.9, 0.95, 0.99]

export function ConfidenceIntervalStudio() {
  const [trueMean, setTrueMean] = useState(72)
  const [sigma, setSigma] = useState(12)
  const [sampleSize, setSampleSize] = useState(25)
  const [confidence, setConfidence] = useState(0.95)
  const [intervalCount, setIntervalCount] = useState(28)
  const [seed, setSeed] = useState(22)

  const z = confidenceLookup[confidence]
  const standardError = sigma / Math.sqrt(sampleSize)
  const random = mulberry32(seed)

  const intervals = Array.from({ length: intervalCount }, (_, index) => {
    const sampleMean = trueMean + normalRandom(random) * standardError
    const lower = sampleMean - z * standardError
    const upper = sampleMean + z * standardError
    return { id: index, sampleMean, lower, upper, captures: lower <= trueMean && trueMean <= upper }
  })

  const captured = intervals.filter((i) => i.captures).length
  const coverageRate = captured / intervalCount
  const left = Math.min(...intervals.map((i) => i.lower), trueMean - 3 * standardError)
  const right = Math.max(...intervals.map((i) => i.upper), trueMean + 3 * standardError)
  const xScale = (value: number) => 80 + ((value - left) / (right - left || 1)) * 480

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Estimation"
          title="Confidence interval coverage"
          description="A confidence level is about the long-run behavior of the procedure, not the probability that one fixed interval contains the parameter."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <Slider label="True mean μ" value={trueMean} min={40} max={100} step={1} display={formatNumber(trueMean, 0)} note="The population parameter you are trying to estimate." onChange={setTrueMean} />
            <Slider label="Known σ" value={sigma} min={4} max={24} step={1} display={formatNumber(sigma, 0)} note="Population spread." onChange={setSigma} />
            <Slider label="Sample size n" value={sampleSize} min={5} max={120} step={1} display={formatNumber(sampleSize, 0)} note="Larger n shrinks the interval width." onChange={setSampleSize} />
            <ChoiceRow
              label="Confidence level"
              options={confidenceOptions.map((v) => ({ label: `${Math.round(v * 100)}%`, value: v }))}
              value={confidence}
              onChange={setConfidence}
            />
            <Slider label="Number of intervals" value={intervalCount} min={12} max={50} step={1} display={formatNumber(intervalCount, 0)} note="Repeated samples from the same population." onChange={setIntervalCount} />
            <div className="button-stack">
              <button type="button" className="primary-button" onClick={() => setSeed((c) => c + 1)}>Draw new intervals</button>
            </div>
          </aside>

          <div className="module-content">
            <div className="metric-strip wide">
              <MetricCard value={formatNumber(standardError, 3)} label="standard error" />
              <MetricCard value={formatPct(coverageRate)} label="empirical coverage" />
              <MetricCard value={`${captured}/${intervalCount}`} label="captured μ" />
              <MetricCard value={`±${formatNumber(z * standardError, 2)}`} label="margin of error" />
            </div>
            <section className="content-card inset">
              <h3>Repeated confidence intervals</h3>
              <p>The vertical line marks the true mean. Blue intervals capture it; warm intervals miss it.</p>
              <svg viewBox="0 0 620 520" className="chart-svg" role="img" aria-label="Confidence interval coverage plot">
                <rect x="0" y="0" width="620" height="520" rx="24" className="chart-frame" />
                <line x1={xScale(trueMean)} y1="40" x2={xScale(trueMean)} y2="480" className="reference-line theoretical" />
                {intervals.map((interval, index) => {
                  const y = 52 + index * 15
                  return (
                    <g key={interval.id}>
                      <line x1={xScale(interval.lower)} y1={y} x2={xScale(interval.upper)} y2={y} className={interval.captures ? 'interval-line good' : 'interval-line miss'} />
                      <circle cx={xScale(interval.sampleMean)} cy={y} r="3.8" className={interval.captures ? 'interval-point good' : 'interval-point miss'} />
                    </g>
                  )
                })}
                <text x="26" y="30" className="chart-caption">μ</text>
              </svg>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
