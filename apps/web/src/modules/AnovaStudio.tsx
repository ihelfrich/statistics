import { useState, useMemo } from 'react'
import { ModuleHeader, MetricCard, Slider } from '../components/index.ts'
import {
  formatNumber,
  formatPct,
  mulberry32,
  normalRandom,
  mean,
} from '../utils/math.ts'

const groupColors = [
  'rgba(45,96,176,0.65)',
  'rgba(225,86,42,0.65)',
  'rgba(123,54,140,0.65)',
  'rgba(34,139,34,0.6)',
]

const groupStrokes = [
  'rgba(45,96,176,0.9)',
  'rgba(225,86,42,0.9)',
  'rgba(123,54,140,0.9)',
  'rgba(34,139,34,0.85)',
]

export function AnovaStudio() {
  const [numGroups, setNumGroups] = useState(3)
  const [nPerGroup, setNPerGroup] = useState(20)
  const [groupSpread, setGroupSpread] = useState(12)
  const [withinSD, setWithinSD] = useState(8)
  const [seed, setSeed] = useState(42)

  const groupMeans = useMemo(() => {
    const base = 50
    return Array.from({ length: numGroups }, (_, i) => base + (i - (numGroups - 1) / 2) * groupSpread)
  }, [numGroups, groupSpread])

  const groups = useMemo(() => {
    const rng = mulberry32(seed)
    return groupMeans.map((gm, gi) => ({
      label: `Group ${gi + 1}`,
      mean: gm,
      values: Array.from({ length: nPerGroup }, () => gm + normalRandom(rng) * withinSD),
    }))
  }, [groupMeans, nPerGroup, withinSD, seed])

  const allValues = groups.flatMap((g) => g.values)
  const grandMean = mean(allValues)
  const N = allValues.length
  const k = numGroups

  const ssBetween = groups.reduce((s, g) => s + g.values.length * (mean(g.values) - grandMean) ** 2, 0)
  const ssWithin = groups.reduce((s, g) => {
    const gm = mean(g.values)
    return s + g.values.reduce((ss, v) => ss + (v - gm) ** 2, 0)
  }, 0)
  const ssTotal = ssBetween + ssWithin
  const dfBetween = k - 1
  const dfWithin = N - k
  const msBetween = dfBetween > 0 ? ssBetween / dfBetween : 0
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0
  const fStat = msWithin > 0 ? msBetween / msWithin : 0
  const etaSquared = ssTotal > 0 ? ssBetween / ssTotal : 0

  const allMin = Math.min(...allValues)
  const allMax = Math.max(...allValues)
  const pad = (allMax - allMin) * 0.1 || 5
  const domainL = allMin - pad
  const domainR = allMax + pad
  const toSvgY = (v: number) => 230 - ((v - domainL) / (domainR - domainL)) * 190

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="ANOVA"
          title="Comparing group means"
          description="One-way ANOVA partitions total variation into between-group and within-group components. A large F ratio means group differences dominate noise."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <Slider label="Number of groups" value={numGroups} min={2} max={4} step={1} display={String(numGroups)} note="How many populations to compare." onChange={(v) => setNumGroups(Math.round(v))} />
            <Slider label="Observations per group" value={nPerGroup} min={5} max={50} step={5} display={String(nPerGroup)} note="Balanced design." onChange={(v) => setNPerGroup(Math.round(v))} />
            <Slider label="Group mean spread" value={groupSpread} min={0} max={30} step={1} display={String(groupSpread)} note="Distance between adjacent group means." onChange={(v) => setGroupSpread(Math.round(v))} />
            <Slider label="Within-group SD" value={withinSD} min={2} max={20} step={1} display={String(withinSD)} note="Noise within each group." onChange={(v) => setWithinSD(Math.round(v))} />
            <div className="button-stack">
              <button type="button" className="primary-button" onClick={() => setSeed((c) => c + 1)}>Generate new data</button>
            </div>
          </aside>

          <div className="module-content">
            <div className="metric-strip wide">
              <MetricCard value={formatNumber(fStat, 2)} label="F statistic" />
              <MetricCard value={formatNumber(etaSquared, 3)} label="η² (effect size)" />
              <MetricCard value={formatNumber(grandMean, 2)} label="grand mean" />
              <MetricCard value={`${dfBetween}, ${dfWithin}`} label="df (between, within)" />
            </div>

            <section className="content-card inset">
              <h3>Strip chart</h3>
              <p>Each column is a group. Points are individual observations. Horizontal bars mark group means; the dashed line is the grand mean.</p>
              <svg viewBox="0 0 600 280" className="chart-svg" role="img" aria-label="ANOVA strip chart">
                <rect x="0" y="0" width="600" height="280" rx="24" className="chart-frame" />
                <line x1="70" y1={toSvgY(grandMean)} x2="550" y2={toSvgY(grandMean)} className="reference-line theoretical" />
                {groups.map((g, gi) => {
                  const cx = 120 + gi * (400 / numGroups) + 200 / numGroups
                  const gm = mean(g.values)
                  return (
                    <g key={gi}>
                      {g.values.map((v, vi) => (
                        <circle key={vi} cx={cx + (mulberry32(vi * 31 + gi)() - 0.5) * 30} cy={toSvgY(v)} r="3.5" fill={groupColors[gi]} stroke={groupStrokes[gi]} strokeWidth="1" />
                      ))}
                      <line x1={cx - 20} y1={toSvgY(gm)} x2={cx + 20} y2={toSvgY(gm)} stroke={groupStrokes[gi]} strokeWidth="3" strokeLinecap="round" />
                      <text x={cx} y="254" textAnchor="middle" className="axis-label">{g.label}</text>
                    </g>
                  )
                })}
                <text x="26" y="28" className="chart-caption">value</text>
              </svg>
            </section>

            <section className="content-card inset">
              <h3>ANOVA table</h3>
              <div className="table-wrap">
                <table className="probability-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>SS</th>
                      <th>df</th>
                      <th>MS</th>
                      <th>F</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th>Between</th>
                      <td>{formatNumber(ssBetween, 1)}</td>
                      <td>{dfBetween}</td>
                      <td>{formatNumber(msBetween, 2)}</td>
                      <td>{formatNumber(fStat, 2)}</td>
                    </tr>
                    <tr>
                      <th>Within</th>
                      <td>{formatNumber(ssWithin, 1)}</td>
                      <td>{dfWithin}</td>
                      <td>{formatNumber(msWithin, 2)}</td>
                      <td />
                    </tr>
                    <tr>
                      <th>Total</th>
                      <td>{formatNumber(ssTotal, 1)}</td>
                      <td>{N - 1}</td>
                      <td />
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="content-card inset">
              <h3>Interpretation</h3>
              <div className="explanation-panel">
                <p className="strong-text">
                  {fStat > 4
                    ? `F = ${formatNumber(fStat, 2)} is large — the between-group variation dominates the within-group noise.`
                    : fStat > 1.5
                      ? `F = ${formatNumber(fStat, 2)} — moderate evidence of group differences.`
                      : `F = ${formatNumber(fStat, 2)} is small — group means are not clearly distinguishable from within-group noise.`}
                </p>
                <p>
                  η² = {formatPct(etaSquared)} of total variation is explained by group membership.
                  Try increasing the group spread or decreasing the within-group SD to see F grow.
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
