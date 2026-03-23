import { useMemo, useState } from 'react'
import { ChoiceRow, MetricCard, ModuleHeader } from '../components/index.ts'
import {
  buildPolyline,
  formatNumber,
  formatPct,
  mean,
  median,
  mulberry32,
  normalRandom,
  quantile,
  stdDev,
} from '../utils/math.ts'

type ScenarioKey = 'videoCtr' | 'retargetingRoas' | 'leadCpl'

type Scenario = {
  label: string
  title: string
  description: string
  businessQuestion: string
  metricLabel: string
  unit: 'pct' | 'currency' | 'ratio'
  targetLabel: string
  targetValue: number
  targetDirection: 'higher' | 'lower'
  skills: string[]
  segments: Array<{ label: string; spendShare: number; metric: number; takeaway: string }>
  questions: Array<{ prompt: string; answer: string }>
  generate: (rng: () => number, dayIndex: number) => number
}

const scenarioOrder: ScenarioKey[] = ['videoCtr', 'retargetingRoas', 'leadCpl']

const scenarioOffsets: Record<ScenarioKey, number> = {
  videoCtr: 101,
  retargetingRoas: 211,
  leadCpl: 307,
}

const diagnosticsScenarios: Record<ScenarioKey, Scenario> = {
  videoCtr: {
    label: 'Video CTR',
    title: 'Daily paid social CTR monitoring',
    description:
      'A growth marketer is reviewing 4 weeks of top-of-funnel video ads to decide whether the broad audience is ready for more budget.',
    businessQuestion:
      'Is the campaign consistently beating the CTR benchmark, or is the average being propped up by a few strong days?',
    metricLabel: 'daily CTR',
    unit: 'pct',
    targetLabel: 'benchmark CTR',
    targetValue: 0.012,
    targetDirection: 'higher',
    skills: ['mean vs median', 'distribution shape', 'IQR and outliers', 'target attainment', 'segment reading'],
    segments: [
      { label: 'Broad audience', spendShare: 0.46, metric: 0.0098, takeaway: 'Scale is high, but CTR is dragging the overall average down.' },
      { label: '3% lookalike', spendShare: 0.31, metric: 0.0136, takeaway: 'Best balance of scale and click quality.' },
      { label: 'Site retargeting', spendShare: 0.23, metric: 0.0189, takeaway: 'Very efficient, but too small to carry total volume alone.' },
    ],
    questions: [
      {
        prompt: 'Why should the marketer compare the mean CTR to the median CTR before raising spend?',
        answer:
          'If the mean is materially above the median, a few breakout days may be inflating the average. Budget decisions should reflect the typical day, not just the best day.',
      },
      {
        prompt: 'Suppose only 40% of days beat the benchmark CTR. What does that say about “average performance”?',
        answer:
          'It means the campaign may look healthy on average while still being inconsistent operationally. The benchmark is being missed more often than it is hit, so execution risk remains high.',
      },
      {
        prompt: 'Why is the retargeting segment not an argument to scale the whole campaign blindly?',
        answer:
          'Retargeting usually has stronger intent and smaller reach. Its performance is informative, but it is not representative of how additional spend will perform in broader audiences.',
      },
    ],
    generate: (rng, dayIndex) => {
      const weekly = Math.sin((dayIndex / 7) * Math.PI * 2 + 0.35) * 0.0009
      const trend = dayIndex > 18 ? 0.0004 : 0
      const outlier = dayIndex === 12 ? 0.0022 : dayIndex === 5 ? -0.0012 : 0
      return Math.max(0.0065, 0.0112 + weekly + trend + normalRandom(rng) * 0.00065 + outlier)
    },
  },
  retargetingRoas: {
    label: 'ROAS',
    title: 'Retargeting revenue efficiency review',
    description:
      'An ecommerce advertiser is checking whether retargeting performance is stable enough to justify keeping aggressive bid caps through the next sales period.',
    businessQuestion:
      'Is ROAS truly strong and repeatable, or is the story mostly a few promotional spikes and purchase-heavy days?',
    metricLabel: 'daily ROAS',
    unit: 'ratio',
    targetLabel: 'target ROAS',
    targetValue: 3.5,
    targetDirection: 'higher',
    skills: ['right-skewed distributions', 'means and medians', 'operational volatility', 'audience mix', 'benchmark reading'],
    segments: [
      { label: 'Product viewers', spendShare: 0.41, metric: 3.1, takeaway: 'High scale, but not consistently at target efficiency.' },
      { label: 'Cart abandoners', spendShare: 0.34, metric: 5.2, takeaway: 'Strong balance of intent and recoverable revenue.' },
      { label: 'Past purchasers', spendShare: 0.25, metric: 6.4, takeaway: 'Excellent ROAS, but incremental value should be scrutinized.' },
    ],
    questions: [
      {
        prompt: 'Why is ROAS often right-skewed in real campaign data?',
        answer:
          'A few unusually strong revenue days can be much larger than the typical day, especially around promotions or inventory drops. That stretches the right tail and pulls the mean upward.',
      },
      {
        prompt: 'If the median ROAS is below the mean ROAS, what should the advertiser assume about future daily performance?',
        answer:
          'They should expect most days to land below the average headline number. The mean is still useful, but the median is a better read on a normal operating day.',
      },
      {
        prompt: 'Why does the “past purchasers” audience require caution even when ROAS is highest there?',
        answer:
          'High observed ROAS does not guarantee high incrementality. Some of those buyers may have converted anyway, so the segment can overstate the causal value of the ads.',
      },
    ],
    generate: (rng, dayIndex) => {
      const weekly = Math.sin((dayIndex / 7) * Math.PI * 2 - 0.5) * 0.32
      const baseline = 2.85 + Math.abs(normalRandom(rng)) * 0.62
      const promoSpike = dayIndex === 9 ? 1.45 : 0
      const softDay = dayIndex === 20 ? -0.75 : 0
      return Math.max(1.4, baseline + weekly + promoSpike + softDay)
    },
  },
  leadCpl: {
    label: 'Lead CPL',
    title: 'Cost-per-lead monitoring for B2B acquisition',
    description:
      'A demand generation manager is deciding whether CPL is disciplined enough to keep the current lead target without tightening audience filters.',
    businessQuestion:
      'Is the average CPL acceptable because performance is truly stable, or because low-cost weeks offset a few very expensive auction periods?',
    metricLabel: 'daily CPL',
    unit: 'currency',
    targetLabel: 'target CPL',
    targetValue: 70,
    targetDirection: 'lower',
    skills: ['center and spread', 'interpreting variability', 'proportions below target', 'segment comparison', 'outlier awareness'],
    segments: [
      { label: 'High-intent search', spendShare: 0.37, metric: 58, takeaway: 'Best CPL and strongest signal of qualified demand.' },
      { label: 'Competitor search', spendShare: 0.21, metric: 69, takeaway: 'Near target, but sensitive to bidding pressure.' },
      { label: 'Display retargeting', spendShare: 0.42, metric: 82, takeaway: 'Cheap volume is not the same as cheap qualified volume.' },
    ],
    questions: [
      {
        prompt: 'Why does “average CPL under target” not automatically mean the campaign is safe to scale?',
        answer:
          'Because cost volatility matters. If many days still overshoot target, scaling can amplify the bad days and break efficiency even when the mean looks acceptable.',
      },
      {
        prompt: 'When the distribution has expensive outliers, why should the team look at the IQR and the number of target misses?',
        answer:
          'Those measures describe operational stability better than the mean alone. They show how often the campaign drifts into a cost regime the business cannot sustain.',
      },
      {
        prompt: 'What is the practical interpretation of a low-CPL segment with a small spend share?',
        answer:
          'It is a useful efficiency pocket, but it may not absorb much more budget. The team should separate “efficient” from “scalable.”',
      },
    ],
    generate: (rng, dayIndex) => {
      const weekly = -Math.sin((dayIndex / 7) * Math.PI * 2 + 0.6) * 4.4
      const baseline = 68 + Math.abs(normalRandom(rng)) * 7.8
      const auctionShock = dayIndex === 14 ? 21 : 0
      return Math.max(44, baseline + weekly + auctionShock)
    },
  },
}

function formatMetric(value: number, unit: Scenario['unit'], digits = 2) {
  if (unit === 'pct') {
    return formatPct(value)
  }
  if (unit === 'currency') {
    return `$${value.toFixed(digits)}`
  }
  return `${value.toFixed(digits)}x`
}

function formatBenchmarkHitRate(value: number) {
  return `${(value * 100).toFixed(0)}%`
}

export function AdvertisingDiagnosticsStudio() {
  const [scenario, setScenario] = useState<ScenarioKey>('videoCtr')
  const [seed, setSeed] = useState(18)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)

  const activeScenario = diagnosticsScenarios[scenario]
  const questions = activeScenario.questions
  const activeQuestion = questions[activeQuestionIndex % questions.length]

  const dailyValues = useMemo(() => {
    const rng = mulberry32(seed + scenarioOffsets[scenario])
    return Array.from({ length: 28 }, (_, dayIndex) => activeScenario.generate(rng, dayIndex))
  }, [activeScenario, scenario, seed])

  const sorted = useMemo(() => [...dailyValues].sort((a, b) => a - b), [dailyValues])
  const average = mean(dailyValues)
  const med = median(dailyValues)
  const sd = stdDev(dailyValues)
  const q1 = quantile(dailyValues, 0.25)
  const q3 = quantile(dailyValues, 0.75)
  const iqr = q3 - q1
  const minValue = sorted[0]
  const maxValue = sorted[sorted.length - 1]
  const skewness = useMemo(() => {
    const n = dailyValues.length
    if (n < 3 || sd === 0) return 0
    const centeredCubeSum = dailyValues.reduce((sum, value) => sum + ((value - average) / sd) ** 3, 0)
    return (n / ((n - 1) * (n - 2))) * centeredCubeSum
  }, [average, dailyValues, sd])

  const whiskerLow = q1 - 1.5 * iqr
  const whiskerHigh = q3 + 1.5 * iqr
  const outlierCount = sorted.filter((value) => value < whiskerLow || value > whiskerHigh).length
  const daysMeetingTarget = dailyValues.filter((value) =>
    activeScenario.targetDirection === 'higher'
      ? value >= activeScenario.targetValue
      : value <= activeScenario.targetValue,
  ).length
  const targetHitRate = daysMeetingTarget / dailyValues.length

  const xPad = (maxValue - minValue) * 0.08 || 1
  const histogramLeft = minValue - xPad
  const histogramRight = maxValue + xPad
  const histogramBins = Math.min(8, Math.max(5, Math.ceil(Math.sqrt(dailyValues.length))))
  const binWidth = (histogramRight - histogramLeft) / histogramBins || 1
  const bins = useMemo(() => {
    const list = Array.from({ length: histogramBins }, (_, index) => ({
      low: histogramLeft + index * binWidth,
      high: histogramLeft + (index + 1) * binWidth,
      count: 0,
    }))
    for (const value of sorted) {
      const index = Math.min(Math.floor((value - histogramLeft) / binWidth), histogramBins - 1)
      list[index].count += 1
    }
    return list
  }, [binWidth, histogramBins, histogramLeft, sorted])
  const maxBinCount = Math.max(...bins.map((bin) => bin.count), 1)

  const timeSeriesPad = (maxValue - minValue) * 0.15 || 1
  const timeSeriesLow = Math.max(0, minValue - timeSeriesPad)
  const timeSeriesHigh = maxValue + timeSeriesPad
  const timeSeriesPoints = dailyValues.map((value, index) => ({ x: index + 1, y: value }))

  const timeXScale = (value: number) => 70 + ((value - 1) / 27) * 470
  const timeYScale = (value: number) => 225 - ((value - timeSeriesLow) / (timeSeriesHigh - timeSeriesLow)) * 170
  const histogramXScale = (value: number) => 65 + ((value - histogramLeft) / (histogramRight - histogramLeft)) * 470

  const benchmarkLabel = `${activeScenario.targetLabel}: ${formatMetric(activeScenario.targetValue, activeScenario.unit)}`
  const averageVsMedianText =
    Math.abs(average - med) < sd * 0.12
      ? 'The mean and median are close, so the average is a reasonable summary of a typical day.'
      : average > med
        ? 'The mean sits above the median, which points to a right tail or a few very strong days lifting the average.'
        : 'The mean sits below the median, which signals a left tail or a few unusually weak days dragging performance down.'

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Applied advertising"
          title="Campaign diagnostics for real ad data"
          description="Read campaign performance the way an advertising analyst should: distributions, benchmarks, outliers, audience mix, and technical interpretation before any formal test."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <ChoiceRow
              label="Scenario"
              options={scenarioOrder.map((key) => ({ label: diagnosticsScenarios[key].label, value: key }))}
              value={scenario}
              onChange={setScenario}
            />
            <div className="explanation-panel">
              <span className="panel-label">Business setup</span>
              <p className="strong-text">{activeScenario.title}</p>
              <p>{activeScenario.description}</p>
              <p>{activeScenario.businessQuestion}</p>
              <p>{benchmarkLabel}</p>
            </div>
            <div className="tag-row">
              {activeScenario.skills.map((skill) => (
                <span key={skill} className="tag-pill">
                  {skill}
                </span>
              ))}
            </div>
            <div className="button-stack">
              <button type="button" className="primary-button" onClick={() => setSeed((current) => current + 1)}>
                Refresh 4 weeks of data
              </button>
            </div>
          </aside>

          <div className="module-content">
            <div className="metric-strip wide">
              <MetricCard value={formatMetric(average, activeScenario.unit)} label={`mean ${activeScenario.metricLabel}`} />
              <MetricCard value={formatMetric(med, activeScenario.unit)} label={`median ${activeScenario.metricLabel}`} />
              <MetricCard value={formatMetric(sd, activeScenario.unit)} label="standard deviation" />
              <MetricCard value={formatBenchmarkHitRate(targetHitRate)} label="days hitting target" />
            </div>
            <div className="metric-strip wide">
              <MetricCard value={formatMetric(q1, activeScenario.unit)} label="Q1" />
              <MetricCard value={formatMetric(q3, activeScenario.unit)} label="Q3" />
              <MetricCard value={formatNumber(skewness, 2)} label="skewness" />
              <MetricCard value={String(outlierCount)} label="outlier days flagged" />
            </div>

            <div className="two-up-grid">
              <section className="content-card inset">
                <h3>Daily run chart</h3>
                <p>The line chart shows the operational rhythm of the KPI. The dashed benchmark line separates stable performance from headline averages.</p>
                <svg viewBox="0 0 620 280" className="chart-svg" role="img" aria-label="Daily advertising KPI">
                  <rect x="0" y="0" width="620" height="280" rx="24" className="chart-frame" />
                  <line x1="70" y1="225" x2="540" y2="225" stroke="rgba(19,34,71,0.12)" strokeWidth="1" />
                  <line x1="70" y1={timeYScale(activeScenario.targetValue)} x2="540" y2={timeYScale(activeScenario.targetValue)} className="critical-line" />
                  <polyline points={buildPolyline(timeSeriesPoints, timeXScale, timeYScale)} className="curve-line null" />
                  {timeSeriesPoints.map((point) => (
                    <circle key={point.x} cx={timeXScale(point.x)} cy={timeYScale(point.y)} r="4" fill="rgba(225,86,42,0.86)" />
                  ))}
                  <text x="26" y="28" className="chart-caption">{activeScenario.metricLabel}</text>
                  <text x="385" y={timeYScale(activeScenario.targetValue) - 8} className="axis-label">{benchmarkLabel}</text>
                  <text x="72" y="248" className="axis-label">week 1</text>
                  <text x="242" y="248" className="axis-label">week 2</text>
                  <text x="412" y="248" className="axis-label">week 3</text>
                  <text x="500" y="248" className="axis-label">week 4</text>
                </svg>
              </section>

              <section className="content-card inset">
                <h3>Distribution view</h3>
                <p>The histogram shows whether the KPI is concentrated, skewed, or dominated by a few unusual days. Navy marks the mean; orange marks the median.</p>
                <svg viewBox="0 0 620 280" className="chart-svg" role="img" aria-label="Histogram of advertising KPI">
                  <rect x="0" y="0" width="620" height="280" rx="24" className="chart-frame" />
                  {bins.map((bin, index) => {
                    const height = 158 * (bin.count / maxBinCount)
                    const x = histogramXScale(bin.low)
                    const width = histogramXScale(bin.high) - histogramXScale(bin.low)
                    return (
                      <rect
                        key={index}
                        x={x}
                        y={220 - height}
                        width={Math.max(width - 3, 4)}
                        height={height}
                        className="bar-rect"
                        rx="4"
                      />
                    )
                  })}
                  <line x1={histogramXScale(average)} y1="40" x2={histogramXScale(average)} y2="220" className="reference-line theoretical" />
                  <line x1={histogramXScale(med)} y1="40" x2={histogramXScale(med)} y2="220" className="reference-line empirical" />
                  <text x={histogramXScale(average) + 6} y="34" className="axis-label">mean</text>
                  <text x={histogramXScale(med) + 6} y="50" className="axis-label">median</text>
                  <text x="26" y="28" className="chart-caption">days</text>
                </svg>
              </section>
            </div>

            <section className="content-card inset">
              <h3>Audience mix and segment realism</h3>
              <p>Averages are campaign-level blends. These segment rows show why an ad operator must separate scale from efficiency before making budget calls.</p>
              <div className="segment-stack">
                {activeScenario.segments.map((segment) => (
                  <div key={segment.label} className="segment-row">
                    <div>
                      <strong>{segment.label}</strong>
                      <p>{segment.takeaway}</p>
                    </div>
                    <div className="segment-bar-wrap" aria-hidden="true">
                      <div className="segment-bar-track">
                        <div className="segment-bar-fill" style={{ width: `${segment.spendShare * 100}%` }} />
                      </div>
                      <span>{(segment.spendShare * 100).toFixed(0)}% spend</span>
                    </div>
                    <strong>{formatMetric(segment.metric, activeScenario.unit)}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="content-card inset">
              <h3>Interpretation</h3>
              <div className="explanation-panel">
                <p className="strong-text">
                  {daysMeetingTarget} of {dailyValues.length} days met the operating target.
                </p>
                <p>{averageVsMedianText}</p>
                <p>
                  The middle 50% of days fall between {formatMetric(q1, activeScenario.unit)} and {formatMetric(q3, activeScenario.unit)}.
                  {outlierCount > 0
                    ? ` ${outlierCount} day(s) sit beyond the 1.5×IQR fences, so the team should investigate those dates before trusting a summary average.`
                    : ' No days were flagged as outliers by the 1.5×IQR rule.'}
                </p>
              </div>
            </section>

            <section className="content-card inset">
              <h3>Analyst questions</h3>
              <div className="question-nav">
                {questions.map((question, index) => (
                  <button
                    key={question.prompt}
                    type="button"
                    className={`mini-choice ${activeQuestionIndex === index ? 'active' : ''}`}
                    onClick={() => setActiveQuestionIndex(index)}
                  >
                    Q{index + 1}
                  </button>
                ))}
              </div>
              <div className="qa-card">
                <span className="panel-label">Interview-style prompt</span>
                <p className="strong-text">{activeQuestion.prompt}</p>
                <p>{activeQuestion.answer}</p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
