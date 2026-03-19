import { useState, useMemo } from 'react'
import { ModuleHeader, MetricCard, Slider } from '../components/index.ts'
import { formatNumber } from '../utils/math.ts'

type DistKey = 'custom' | 'fair-die' | 'weighted-coin' | 'lottery'

const presets: Record<DistKey, { label: string; values: number[]; probs: number[] }> = {
  'fair-die': {
    label: 'Fair die',
    values: [1, 2, 3, 4, 5, 6],
    probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  },
  'weighted-coin': {
    label: 'Weighted coin',
    values: [0, 1],
    probs: [0.35, 0.65],
  },
  lottery: {
    label: 'Lottery ticket',
    values: [-2, 0, 5, 100],
    probs: [0.5, 0.35, 0.14, 0.01],
  },
  custom: {
    label: 'Custom (3 outcomes)',
    values: [0, 5, 10],
    probs: [0.3, 0.4, 0.3],
  },
}

export function ExpectationStudio() {
  const [preset, setPreset] = useState<DistKey>('fair-die')
  const [customP1, setCustomP1] = useState(0.3)
  const [customP2, setCustomP2] = useState(0.4)
  const [customV1, setCustomV1] = useState(0)
  const [customV2, setCustomV2] = useState(5)
  const [customV3, setCustomV3] = useState(10)
  const [scaleA, setScaleA] = useState(2)
  const [shiftB, setShiftB] = useState(3)

  const dist = useMemo(() => {
    if (preset === 'custom') {
      const p3 = Math.max(0, 1 - customP1 - customP2)
      return { values: [customV1, customV2, customV3], probs: [customP1, customP2, p3] }
    }
    return presets[preset]
  }, [preset, customP1, customP2, customV1, customV2, customV3])

  const ex = dist.values.reduce((s, v, i) => s + v * dist.probs[i], 0)
  const ex2 = dist.values.reduce((s, v, i) => s + v * v * dist.probs[i], 0)
  const varX = ex2 - ex * ex
  const sdX = Math.sqrt(Math.max(varX, 0))

  const transformedEx = scaleA * ex + shiftB
  const transformedVar = scaleA * scaleA * varX

  const maxProb = Math.max(...dist.probs, 0.01)

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Expectation & variance"
          title="The algebra of random variables"
          description="E[X] tells you where outcomes land on average. Var(X) tells you how spread out they are. Both follow clean linear rules."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <div className="choice-row">
              <span>Distribution</span>
              <div className="choice-buttons">
                {(Object.keys(presets) as DistKey[]).map((key) => (
                  <button key={key} type="button" className={`mini-choice ${preset === key ? 'active' : ''}`} onClick={() => setPreset(key)}>
                    {presets[key].label}
                  </button>
                ))}
              </div>
            </div>
            {preset === 'custom' && (
              <>
                <Slider label="Value 1" value={customV1} min={-10} max={20} step={1} display={String(customV1)} note="First outcome." onChange={(v) => setCustomV1(Math.round(v))} />
                <Slider label="Value 2" value={customV2} min={-10} max={20} step={1} display={String(customV2)} note="Second outcome." onChange={(v) => setCustomV2(Math.round(v))} />
                <Slider label="Value 3" value={customV3} min={-10} max={50} step={1} display={String(customV3)} note="Third outcome." onChange={(v) => setCustomV3(Math.round(v))} />
                <Slider label="P(x₁)" value={customP1} min={0.01} max={0.98} step={0.01} display={customP1.toFixed(2)} note="Probability of first outcome." onChange={setCustomP1} />
                <Slider label="P(x₂)" value={customP2} min={0.01} max={Math.max(0.01, 0.99 - customP1)} step={0.01} display={customP2.toFixed(2)} note="Probability of second outcome." onChange={setCustomP2} />
              </>
            )}
            <Slider label="Scale a" value={scaleA} min={-3} max={5} step={0.5} display={String(scaleA)} note="Multiply X by a constant." onChange={setScaleA} />
            <Slider label="Shift b" value={shiftB} min={-10} max={10} step={1} display={String(shiftB)} note="Add a constant to X." onChange={(v) => setShiftB(Math.round(v))} />
          </aside>

          <div className="module-content">
            <div className="metric-strip wide">
              <MetricCard value={formatNumber(ex, 3)} label="E[X]" />
              <MetricCard value={formatNumber(varX, 3)} label="Var(X)" />
              <MetricCard value={formatNumber(sdX, 3)} label="SD(X)" />
              <MetricCard value={formatNumber(ex2, 3)} label="E[X²]" />
            </div>

            <section className="content-card inset">
              <h3>PMF of X</h3>
              <p>Each bar shows the probability of one outcome. The dashed line marks E[X].</p>
              <svg viewBox="0 0 600 260" className="chart-svg" role="img" aria-label="PMF bars">
                <rect x="0" y="0" width="600" height="260" rx="24" className="chart-frame" />
                {dist.values.map((v, i) => {
                  const n = dist.values.length
                  const w = Math.min(420 / n, 60)
                  const gap = (480 - n * w) / (n + 1)
                  const x = 60 + gap + i * (w + gap)
                  const h = 160 * (dist.probs[i] / maxProb)
                  return (
                    <g key={i}>
                      <rect x={x} y={200 - h} width={w} height={h} className="bar-rect" rx="6" />
                      <text x={x + w / 2} y={220} textAnchor="middle" className="axis-label">{v}</text>
                      <text x={x + w / 2} y={195 - h} textAnchor="middle" className="axis-label">{dist.probs[i].toFixed(3)}</text>
                    </g>
                  )
                })}
                {(() => {
                  const n = dist.values.length
                  const minV = Math.min(...dist.values)
                  const maxV = Math.max(...dist.values)
                  const range = maxV - minV || 1
                  const exX = 60 + ((ex - minV) / range) * 480 * (n > 1 ? 1 : 0) + (n <= 1 ? 240 : 0)
                  return <line x1={exX} y1="32" x2={exX} y2="200" className="reference-line theoretical" />
                })()}
                <text x="26" y="28" className="chart-caption">P(X = x)</text>
              </svg>
            </section>

            <section className="content-card inset">
              <h3>Linearity of expectation</h3>
              <div className="explanation-panel">
                <code>E[aX + b] = a·E[X] + b = {scaleA}·{formatNumber(ex, 3)} + {shiftB} = {formatNumber(transformedEx, 3)}</code>
                <code>Var(aX + b) = a²·Var(X) = {scaleA}²·{formatNumber(varX, 3)} = {formatNumber(transformedVar, 3)}</code>
                <p className="strong-text">Scaling by a stretches the variance by a². Shifting by b only moves the center — it never changes spread.</p>
                <p>This is the most useful algebraic fact about random variables. It explains why standard scores (z-scores) always have mean 0 and variance 1.</p>
              </div>
            </section>

            <section className="content-card inset">
              <h3>Variance decomposition</h3>
              <div className="explanation-panel">
                <code>Var(X) = E[X²] - (E[X])² = {formatNumber(ex2, 3)} - ({formatNumber(ex, 3)})² = {formatNumber(varX, 3)}</code>
                <p>This shortcut formula is computationally convenient and shows that variance measures how much E[X²] exceeds the square of E[X].</p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
