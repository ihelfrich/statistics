import { useState, useMemo } from 'react'
import { ModuleHeader, MetricCard, Slider } from '../components/index.ts'
import {
  formatNumber,
  formatPct,
  mulberry32,
  normalRandom,
  mean,
  median,
  quantile,
} from '../utils/math.ts'

type StatKey = 'mean' | 'median' | 'trimmed-mean'

const statFns: Record<StatKey, { label: string; compute: (data: number[]) => number }> = {
  mean: { label: 'Mean', compute: mean },
  median: { label: 'Median', compute: median },
  'trimmed-mean': {
    label: '10% trimmed mean',
    compute: (data) => {
      const sorted = [...data].sort((a, b) => a - b)
      const trim = Math.floor(sorted.length * 0.1)
      return mean(sorted.slice(trim, sorted.length - trim))
    },
  },
}

export function BootstrapStudio() {
  const [sampleSize, setSampleSize] = useState(30)
  const [bootReps, setBootReps] = useState(500)
  const [confLevel, setConfLevel] = useState(0.95)
  const [stat, setStat] = useState<StatKey>('mean')
  const [seed, setSeed] = useState(88)

  const originalData = useMemo(() => {
    const rng = mulberry32(seed)
    return Array.from({ length: sampleSize }, () => {
      const z = Math.abs(normalRandom(rng))
      return 20 + z * 15
    })
  }, [sampleSize, seed])

  const originalStat = statFns[stat].compute(originalData)

  const bootDist = useMemo(() => {
    const rng = mulberry32(seed + 1000)
    const stats: number[] = []
    for (let b = 0; b < bootReps; b++) {
      const resample = Array.from({ length: sampleSize }, () =>
        originalData[Math.floor(rng() * sampleSize)]
      )
      stats.push(statFns[stat].compute(resample))
    }
    return stats.sort((a, b) => a - b)
  }, [originalData, bootReps, sampleSize, stat, seed])

  const bootMean = mean(bootDist)
  const bootSE = Math.sqrt(bootDist.reduce((s, v) => s + (v - bootMean) ** 2, 0) / (bootDist.length - 1))
  const alpha = 1 - confLevel
  const ciLo = quantile(bootDist, alpha / 2)
  const ciHi = quantile(bootDist, 1 - alpha / 2)
  const bias = bootMean - originalStat

  const binCount = Math.min(Math.ceil(Math.sqrt(bootReps)), 30)
  const bMin = bootDist[0]
  const bMax = bootDist[bootDist.length - 1]
  const binWidth = (bMax - bMin) / binCount || 1
  const bins = useMemo(() => {
    const b = Array.from({ length: binCount }, (_, i) => ({
      lo: bMin + i * binWidth,
      hi: bMin + (i + 1) * binWidth,
      count: 0,
      inCI: false,
    }))
    for (const v of bootDist) {
      const idx = Math.min(Math.floor((v - bMin) / binWidth), binCount - 1)
      b[idx].count++
    }
    b.forEach((bin) => {
      const mid = (bin.lo + bin.hi) / 2
      bin.inCI = mid >= ciLo && mid <= ciHi
    })
    return b
  }, [bootDist, binCount, bMin, binWidth, ciLo, ciHi])
  const maxBin = Math.max(...bins.map((b) => b.count), 1)

  const pad = (bMax - bMin) * 0.1 || 2
  const domainL = bMin - pad
  const domainR = bMax + pad
  const toSvgX = (v: number) => 70 + ((v - domainL) / (domainR - domainL)) * 480

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Bootstrap"
          title="Resampling-based inference"
          description="The bootstrap builds a sampling distribution by resampling your data with replacement — no assumptions about the population shape needed."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <Slider label="Original sample size" value={sampleSize} min={10} max={100} step={5} display={String(sampleSize)} note="Size of the dataset." onChange={(v) => setSampleSize(Math.round(v))} />
            <Slider label="Bootstrap replications" value={bootReps} min={100} max={2000} step={100} display={String(bootReps)} note="More reps give a smoother distribution." onChange={(v) => setBootReps(Math.round(v))} />
            <div className="choice-row">
              <span>Statistic</span>
              <div className="choice-buttons">
                {(Object.keys(statFns) as StatKey[]).map((key) => (
                  <button key={key} type="button" className={`mini-choice ${stat === key ? 'active' : ''}`} onClick={() => setStat(key)}>
                    {statFns[key].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="choice-row">
              <span>Confidence level</span>
              <div className="choice-buttons">
                {[0.9, 0.95, 0.99].map((v) => (
                  <button key={v} type="button" className={`mini-choice ${confLevel === v ? 'active' : ''}`} onClick={() => setConfLevel(v)}>
                    {Math.round(v * 100)}%
                  </button>
                ))}
              </div>
            </div>
            <div className="button-stack">
              <button type="button" className="primary-button" onClick={() => setSeed((c) => c + 1)}>New sample + bootstrap</button>
            </div>
          </aside>

          <div className="module-content">
            <div className="metric-strip wide">
              <MetricCard value={formatNumber(originalStat, 3)} label={`observed ${statFns[stat].label.toLowerCase()}`} />
              <MetricCard value={formatNumber(bootSE, 3)} label="bootstrap SE" />
              <MetricCard value={`[${formatNumber(ciLo, 2)}, ${formatNumber(ciHi, 2)}]`} label={`${formatPct(confLevel)} CI`} />
              <MetricCard value={formatNumber(bias, 4)} label="bias" />
            </div>

            <section className="content-card inset">
              <h3>Bootstrap distribution of the {statFns[stat].label.toLowerCase()}</h3>
              <p>Each bar is a bin of bootstrap replicates. Shaded bins fall inside the {formatPct(confLevel)} percentile interval. The dashed line is the observed statistic from the original sample.</p>
              <svg viewBox="0 0 600 280" className="chart-svg" role="img" aria-label="Bootstrap distribution">
                <rect x="0" y="0" width="600" height="280" rx="24" className="chart-frame" />
                {bins.map((bin, i) => {
                  const bw = 480 / bins.length
                  const h = 180 * (bin.count / maxBin)
                  const x = 60 + i * bw
                  return (
                    <rect
                      key={i}
                      x={x}
                      y={230 - h}
                      width={Math.max(bw - 2, 2)}
                      height={h}
                      fill={bin.inCI ? 'rgba(45,96,176,0.7)' : 'rgba(45,96,176,0.2)'}
                      stroke={bin.inCI ? 'rgba(45,96,176,0.9)' : 'rgba(45,96,176,0.4)'}
                      strokeWidth="1"
                      rx="3"
                    />
                  )
                })}
                <line x1={toSvgX(originalStat)} y1="32" x2={toSvgX(originalStat)} y2="230" className="reference-line theoretical" />
                <line x1={toSvgX(ciLo)} y1="240" x2={toSvgX(ciHi)} y2="240" stroke="rgba(225,86,42,0.8)" strokeWidth="3" strokeLinecap="round" />
                <circle cx={toSvgX(ciLo)} cy="240" r="4" fill="rgba(225,86,42,0.9)" />
                <circle cx={toSvgX(ciHi)} cy="240" r="4" fill="rgba(225,86,42,0.9)" />
                <text x="26" y="28" className="chart-caption">frequency</text>
              </svg>
            </section>

            <section className="content-card inset">
              <h3>How the bootstrap works</h3>
              <div className="explanation-panel">
                <p className="strong-text">Resample n observations with replacement from your data → compute the statistic → repeat B times → use the resulting distribution for inference.</p>
                <p>
                  The percentile method takes the α/2 and 1-α/2 quantiles of the bootstrap distribution as CI bounds.
                  Bias = {formatNumber(bias, 4)} measures how much the bootstrap center differs from the observed statistic.
                  The bootstrap is especially useful for statistics where the sampling distribution is hard to derive analytically.
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
