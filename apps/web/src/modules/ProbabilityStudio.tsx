import { startTransition, useState } from 'react'
import { ModuleHeader, MetricCard, Slider, FormulaCard } from '../components/index.ts'
import {
  formatPct,
  formatCount,
  round2,
  clamp,
  mulberry32,
  safeDivide,
} from '../utils/math.ts'

type LawKey =
  | 'intersection'
  | 'union'
  | 'conditional'
  | 'independence'
  | 'complement'

type ProbabilityScenario = {
  id: string
  title: string
  strapline: string
  eventA: string
  eventB: string
  pA: number
  pB: number
  overlap: number
  focus: LawKey
}

type ProbabilityModel = ReturnType<typeof buildProbabilityModel>

type SamplePoint = {
  id: number
  region: 'overlap' | 'aOnly' | 'bOnly' | 'outside'
}

const probabilityScenarios: ProbabilityScenario[] = [
  {
    id: 'storm-traffic',
    title: 'Weather + Traffic',
    strapline: 'A realistic dependent-events example for union and overlap.',
    eventA: 'It rains before kickoff',
    eventB: 'Traffic is heavy near the stadium',
    pA: 0.35,
    pB: 0.58,
    overlap: 0.27,
    focus: 'union',
  },
  {
    id: 'diagnostic-test',
    title: 'Diagnostic Test',
    strapline: 'The cleanest undergrad example for conditional probability and Bayes logic.',
    eventA: 'A patient has the condition',
    eventB: 'The test is positive',
    pA: 0.01,
    pB: 0.06,
    overlap: 0.009,
    focus: 'conditional',
  },
  {
    id: 'study-pass',
    title: 'Study Habits',
    strapline: 'A strong positive-association example for independence checks.',
    eventA: 'A student attends the review session',
    eventB: 'A student earns at least a B',
    pA: 0.62,
    pB: 0.74,
    overlap: 0.54,
    focus: 'independence',
  },
  {
    id: 'disjoint-events',
    title: 'Disjoint Outcomes',
    strapline: 'A simple mutually exclusive example for complements and partitions.',
    eventA: 'A die roll is even',
    eventB: 'A die roll is odd',
    pA: 0.5,
    pB: 0.5,
    overlap: 0,
    focus: 'intersection',
  },
]

const lawMeta: Record<
  LawKey,
  { title: string; short: string; blurb: string }
> = {
  intersection: {
    title: 'Intersection',
    short: 'A and B',
    blurb: 'The share of outcomes that satisfy both events at once.',
  },
  union: {
    title: 'Union',
    short: 'A or B',
    blurb: 'The probability mass covered by at least one event.',
  },
  conditional: {
    title: 'Conditional',
    short: 'A given B',
    blurb: 'The ratio that appears once B becomes the new denominator.',
  },
  independence: {
    title: 'Independence',
    short: 'A ⟂ B?',
    blurb: 'Whether overlap matches the multiplication benchmark P(A)P(B).',
  },
  complement: {
    title: 'Complement',
    short: 'not A',
    blurb: 'Everything outside an event, often the easiest route to the answer.',
  },
}

function lowerOverlapBound(pA: number, pB: number) {
  return Math.max(0, pA + pB - 1)
}

function upperOverlapBound(pA: number, pB: number) {
  return Math.min(pA, pB)
}

function buildProbabilityModel(
  pA: number,
  pB: number,
  overlap: number,
  eventA: string,
  eventB: string,
) {
  const aOnly = Math.max(0, pA - overlap)
  const bOnly = Math.max(0, pB - overlap)
  const union = Math.min(1, aOnly + bOnly + overlap)
  const outside = Math.max(0, 1 - union)
  const pNotA = 1 - pA
  const pNotB = 1 - pB
  const pAgivenB = safeDivide(overlap, pB)
  const pBgivenA = safeDivide(overlap, pA)
  const pBgivenNotA = safeDivide(bOnly, 1 - pA)
  const expectedIfIndependent = pA * pB
  const independenceGap = overlap - expectedIfIndependent

  return {
    eventA,
    eventB,
    pA,
    pB,
    overlap,
    aOnly,
    bOnly,
    union,
    outside,
    pNotA,
    pNotB,
    pAgivenB,
    pBgivenA,
    pBgivenNotA,
    expectedIfIndependent,
    independenceGap,
  }
}

function buildSample(size: number, model: ProbabilityModel, seed: number) {
  const random = mulberry32(seed)
  const points: SamplePoint[] = []
  const counts = { overlap: 0, aOnly: 0, bOnly: 0, outside: 0 }

  const overlapLimit = model.overlap
  const aOnlyLimit = overlapLimit + model.aOnly
  const bOnlyLimit = aOnlyLimit + model.bOnly

  for (let index = 0; index < size; index += 1) {
    const draw = random()
    let region: SamplePoint['region']
    if (draw < overlapLimit) region = 'overlap'
    else if (draw < aOnlyLimit) region = 'aOnly'
    else if (draw < bOnlyLimit) region = 'bOnly'
    else region = 'outside'
    counts[region] += 1
    points.push({ id: index, region })
  }

  return { points, counts }
}

function getLawSummary(law: LawKey, model: ProbabilityModel) {
  switch (law) {
    case 'intersection':
      return {
        expression: `P(A ∩ B) = ${formatPct(model.overlap)}`,
        emphasis: `${formatPct(model.overlap)} of outcomes satisfy both events at once.`,
        explanation: 'The overlap is the foundation. If you get this region wrong, every downstream probability breaks.',
      }
    case 'union':
      return {
        expression: `P(A ∪ B) = P(A) + P(B) - P(A ∩ B) = ${formatPct(model.union)}`,
        emphasis: `The overlap of ${formatPct(model.overlap)} must be subtracted once to avoid double counting.`,
        explanation: 'Union answers "A or B or both." Students often add P(A) and P(B) and stop one step too early.',
      }
    case 'conditional':
      return {
        expression: `P(A | B) = P(A ∩ B) / P(B) = ${formatPct(model.pAgivenB)}`,
        emphasis: `${model.eventB} becomes the new sample space.`,
        explanation: 'Conditioning changes the denominator. You are not dividing by 1 anymore; you are living inside B.',
      }
    case 'independence':
      return {
        expression: `If independent, P(A ∩ B) = P(A)P(B) = ${formatPct(model.expectedIfIndependent)}`,
        emphasis: `Observed minus expected overlap = ${formatPct(Math.abs(model.independenceGap))}.`,
        explanation:
          model.independenceGap === 0
            ? 'These events are exactly independent in the current setup.'
            : model.independenceGap > 0
              ? 'The events co-occur more often than independence predicts.'
              : 'The events co-occur less often than independence predicts.',
      }
    case 'complement':
      return {
        expression: `P(Aᶜ) = 1 - P(A) = ${formatPct(model.pNotA)}`,
        emphasis: 'Complements are often the shortest path to a correct answer.',
        explanation: 'When a direct calculation is messy, compute the "not" event and subtract from one.',
      }
  }
}

function SetDiagram({ model, law }: { model: ProbabilityModel; law: LawKey }) {
  const union = Math.max(model.union, 0.001)
  const jaccard = model.overlap / union
  const leftRadius = 86 + model.pA * 26
  const rightRadius = 86 + model.pB * 26
  const distance = 190 - jaccard * 90

  return (
    <svg viewBox="0 0 520 320" className="chart-svg" role="img" aria-label="Probability set diagram">
      <defs>
        <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="18" y="18" width="484" height="284" rx="24" className={`space-frame ${law === 'complement' ? 'active' : ''}`} />
      <circle
        cx={200}
        cy={164}
        r={leftRadius}
        className={`set-circle set-a ${law !== 'complement' ? 'active' : ''}`}
        filter={law === 'intersection' || law === 'conditional' ? 'url(#softGlow)' : undefined}
      />
      <circle
        cx={200 + distance}
        cy={164}
        r={rightRadius}
        className={`set-circle set-b ${law !== 'complement' ? 'active' : ''}`}
        filter={law === 'union' ? 'url(#softGlow)' : undefined}
      />
      <text x={130} y={78} className="set-label">A</text>
      <text x={200 + distance + 46} y={78} className="set-label">B</text>
      <g className={`callout ${law === 'intersection' ? 'accent' : ''}`}>
        <rect x={186} y={220} width="144" height="42" rx="16" />
        <text x={258} y={246}>A ∩ B = {formatPct(model.overlap)}</text>
      </g>
      <g className={law === 'union' ? 'callout accent' : 'callout'}>
        <rect x={44} y={248} width="136" height="36" rx="16" />
        <text x={112} y={271}>A only {formatPct(model.aOnly)}</text>
      </g>
      <g className={law === 'union' ? 'callout accent' : 'callout'}>
        <rect x={340} y={248} width="136" height="36" rx="16" />
        <text x={408} y={271}>B only {formatPct(model.bOnly)}</text>
      </g>
    </svg>
  )
}

function ProbabilityTree({ model }: { model: ProbabilityModel }) {
  return (
    <svg viewBox="0 0 540 280" className="chart-svg" role="img" aria-label="Probability tree">
      <line x1="74" y1="140" x2="220" y2="84" className="tree-branch" />
      <line x1="74" y1="140" x2="220" y2="196" className="tree-branch faint" />
      <line x1="220" y1="84" x2="404" y2="44" className="tree-branch" />
      <line x1="220" y1="84" x2="404" y2="124" className="tree-branch faint" />
      <line x1="220" y1="196" x2="404" y2="164" className="tree-branch" />
      <line x1="220" y1="196" x2="404" y2="236" className="tree-branch faint" />
      <circle cx="74" cy="140" r="16" className="tree-node root" />
      <circle cx="220" cy="84" r="16" className="tree-node primary" />
      <circle cx="220" cy="196" r="16" className="tree-node muted" />
      <circle cx="404" cy="44" r="14" className="tree-node overlap" />
      <circle cx="404" cy="124" r="14" className="tree-node primary" />
      <circle cx="404" cy="164" r="14" className="tree-node secondary" />
      <circle cx="404" cy="236" r="14" className="tree-node muted" />
      <text x="52" y="110" className="tree-title">Start</text>
      <text x="214" y="58" className="tree-title">A</text>
      <text x="198" y="224" className="tree-title">Aᶜ</text>
      <text x="282" y="58" className="tree-label">B | A = {formatPct(model.pBgivenA)}</text>
      <text x="278" y="140" className="tree-label">Bᶜ | A = {formatPct(1 - model.pBgivenA)}</text>
      <text x="266" y="178" className="tree-label">B | Aᶜ = {formatPct(model.pBgivenNotA)}</text>
      <text x="246" y="252" className="tree-label">Bᶜ | Aᶜ = {formatPct(1 - model.pBgivenNotA)}</text>
      <text x="420" y="48" className="tree-outcome">{formatPct(model.overlap)}</text>
      <text x="420" y="128" className="tree-outcome">{formatPct(model.aOnly)}</text>
      <text x="420" y="168" className="tree-outcome">{formatPct(model.bOnly)}</text>
      <text x="420" y="240" className="tree-outcome">{formatPct(model.outside)}</text>
    </svg>
  )
}

function ContingencyTable({
  model,
  law,
  sample,
}: {
  model: ProbabilityModel
  law: LawKey
  sample: ReturnType<typeof buildSample>
}) {
  const highlightClass = {
    intersection: 'highlight-intersection',
    union: 'highlight-union',
    conditional: 'highlight-conditional',
    independence: 'highlight-independence',
    complement: 'highlight-complement',
  }[law]

  return (
    <div className="table-wrap">
      <table className={`probability-table ${highlightClass}`}>
        <thead>
          <tr>
            <th />
            <th>B</th>
            <th>Bᶜ</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>A</th>
            <td className="cell-overlap">
              {formatPct(model.overlap)}
              <span>{sample.counts.overlap}</span>
            </td>
            <td className="cell-a-only">
              {formatPct(model.aOnly)}
              <span>{sample.counts.aOnly}</span>
            </td>
            <td>{formatPct(model.pA)}</td>
          </tr>
          <tr>
            <th>Aᶜ</th>
            <td className="cell-b-only">
              {formatPct(model.bOnly)}
              <span>{sample.counts.bOnly}</span>
            </td>
            <td className="cell-outside">
              {formatPct(model.outside)}
              <span>{sample.counts.outside}</span>
            </td>
            <td>{formatPct(model.pNotA)}</td>
          </tr>
          <tr>
            <th>Total</th>
            <td>{formatPct(model.pB)}</td>
            <td>{formatPct(model.pNotB)}</td>
            <td>100.0%</td>
          </tr>
        </tbody>
      </table>
      <p className="note-text">Each cell shows theoretical probability on top and simulated count underneath.</p>
    </div>
  )
}

function SimulationPanel({
  sample,
  columns,
}: {
  sample: ReturnType<typeof buildSample>
  columns: number
}) {
  return (
    <div className="simulation-wrap">
      <div className="metric-strip">
        <MetricCard value={String(sample.counts.overlap)} label="both" />
        <MetricCard value={String(sample.counts.aOnly)} label="A only" />
        <MetricCard value={String(sample.counts.bOnly)} label="B only" />
        <MetricCard value={String(sample.counts.outside)} label="outside" />
      </div>
      <div className="sample-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {sample.points.map((point) => (
          <span key={point.id} className={`sample-dot ${point.region}`} />
        ))}
      </div>
    </div>
  )
}

function LegendChip({ tone, label }: { tone: 'a' | 'b' | 'overlap' | 'outside'; label: string }) {
  return <span className={`legend-chip ${tone}`}>{label}</span>
}

export function ProbabilityStudio() {
  const defaultScenario = probabilityScenarios[0]
  const [eventA, setEventA] = useState(defaultScenario.eventA)
  const [eventB, setEventB] = useState(defaultScenario.eventB)
  const [pA, setPA] = useState(defaultScenario.pA)
  const [pB, setPB] = useState(defaultScenario.pB)
  const [overlap, setOverlap] = useState(defaultScenario.overlap)
  const [law, setLaw] = useState<LawKey>(defaultScenario.focus)
  const [sampleSize, setSampleSize] = useState(240)
  const [seed, setSeed] = useState(7)

  const minOverlap = lowerOverlapBound(pA, pB)
  const maxOverlap = upperOverlapBound(pA, pB)
  const effectiveOverlap = round2(clamp(overlap, minOverlap, maxOverlap))
  const model = buildProbabilityModel(pA, pB, effectiveOverlap, eventA, eventB)
  const sample = buildSample(sampleSize, model, seed)
  const summary = getLawSummary(law, model)

  function applyScenario(scenario: ProbabilityScenario) {
    startTransition(() => {
      setEventA(scenario.eventA)
      setEventB(scenario.eventB)
      setPA(scenario.pA)
      setPB(scenario.pB)
      setOverlap(scenario.overlap)
      setLaw(scenario.focus)
      setSeed((current) => current + 1)
    })
  }

  return (
    <div className="module-grid">
      <aside className="control-card">
        <ModuleHeader
          kicker="Probability laws"
          title="Build the event geometry"
          description="Adjust the events and watch every representation update together."
        />
        <label className="text-control">
          <span>Event A</span>
          <input value={eventA} onChange={(event) => setEventA(event.target.value)} />
        </label>
        <label className="text-control">
          <span>Event B</span>
          <input value={eventB} onChange={(event) => setEventB(event.target.value)} />
        </label>
        <Slider label="P(A)" value={pA} min={0} max={1} step={0.01} display={formatPct(pA)} note="Probability mass assigned to A." onChange={setPA} />
        <Slider label="P(B)" value={pB} min={0} max={1} step={0.01} display={formatPct(pB)} note="Probability mass assigned to B." onChange={setPB} />
        <Slider label="P(A ∩ B)" value={effectiveOverlap} min={minOverlap} max={maxOverlap} step={0.01} display={formatPct(effectiveOverlap)} note={`Feasible overlap runs from ${formatPct(minOverlap)} to ${formatPct(maxOverlap)}.`} onChange={setOverlap} />
        <Slider label="Simulation size" value={sampleSize} min={120} max={420} step={20} display={formatCount(sampleSize)} note="Natural-frequency dots for the empirical view." onChange={(value) => setSampleSize(Math.round(value))} />
        <div className="button-stack">
          <button type="button" className="primary-button" onClick={() => setSeed((current) => current + 1)}>Re-simulate sample</button>
          <button type="button" className="secondary-button" onClick={() => applyScenario(defaultScenario)}>Reset baseline</button>
        </div>
      </aside>

      <div className="module-content">
        <section className="content-card">
          <ModuleHeader kicker="Scenario presets" title={lawMeta[law].title} description={lawMeta[law].blurb} />
          <div className="chip-grid">
            {probabilityScenarios.map((scenario) => (
              <button key={scenario.id} type="button" className="chip-card" onClick={() => applyScenario(scenario)}>
                <strong>{scenario.title}</strong>
                <span>{scenario.strapline}</span>
              </button>
            ))}
          </div>
          <div className="law-grid">
            {(Object.keys(lawMeta) as LawKey[]).map((key) => (
              <button key={key} type="button" className={`law-button ${law === key ? 'active' : ''}`} onClick={() => setLaw(key)}>
                <strong>{lawMeta[key].title}</strong>
                <span>{lawMeta[key].short}</span>
              </button>
            ))}
          </div>
          <div className="explanation-panel">
            <code>{summary.expression}</code>
            <p className="strong-text">{summary.emphasis}</p>
            <p>{summary.explanation}</p>
          </div>
          <div className="formula-grid">
            <FormulaCard title="Intersection" expression={`P(A ∩ B) = ${formatPct(model.overlap)}`} />
            <FormulaCard title="Union" expression={`P(A ∪ B) = ${formatPct(model.union)}`} />
            <FormulaCard title="Conditional" expression={`P(A | B) = ${formatPct(model.pAgivenB)}`} />
            <FormulaCard title="Independence benchmark" expression={`P(A)P(B) = ${formatPct(model.expectedIfIndependent)}`} />
          </div>
        </section>

        <div className="split-grid">
          <section className="content-card">
            <ModuleHeader kicker="Set view" title="Area and overlap" description="The geometry view gives the fastest intuition for union, overlap, and complement." />
            <SetDiagram model={model} law={law} />
            <div className="legend-row">
              <LegendChip tone="a" label={`A only ${formatPct(model.aOnly)}`} />
              <LegendChip tone="overlap" label={`A ∩ B ${formatPct(model.overlap)}`} />
              <LegendChip tone="b" label={`B only ${formatPct(model.bOnly)}`} />
              <LegendChip tone="outside" label={`outside ${formatPct(model.outside)}`} />
            </div>
          </section>
          <section className="content-card">
            <ModuleHeader kicker="Sequential view" title="Probability tree" description="The tree makes conditioning explicit by changing the denominator branch by branch." />
            <ProbabilityTree model={model} />
          </section>
          <section className="content-card">
            <ModuleHeader kicker="Table view" title="Contingency table" description="The algebra becomes clean when you see the joint cells and margins together." />
            <ContingencyTable model={model} law={law} sample={sample} />
          </section>
          <section className="content-card">
            <ModuleHeader kicker="Empirical view" title="Natural frequencies" description="This is the bridge from symbolic probability to actual observed proportions." />
            <SimulationPanel sample={sample} columns={sampleSize >= 320 ? 20 : 16} />
          </section>
        </div>
      </div>
    </div>
  )
}
