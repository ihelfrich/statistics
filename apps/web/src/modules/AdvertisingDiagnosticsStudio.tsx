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

type ScenarioKey = 'reachEfficiency' | 'newToBrand' | 'creativeFatigue' | 'geoReadiness'

type Scenario = {
  label: string
  title: string
  description: string
  businessQuestion: string
  decisionMoment: string
  executiveQuestion: string
  metricLabel: string
  targetLabel: string
  targetValue: number
  targetDirection: 'higher' | 'lower'
  unit: 'pct' | 'currency' | 'ratio'
  shareLabel: string
  skills: string[]
  deliverables: string[]
  guardrails: string[]
  readoutChecklist: string[]
  segments: Array<{ label: string; share: number; metric: number; takeaway: string }>
  questions: Array<{ prompt: string; answer: string }>
  generate: (rng: () => number, index: number) => number
}

const scenarioOrder: ScenarioKey[] = [
  'reachEfficiency',
  'newToBrand',
  'creativeFatigue',
  'geoReadiness',
]

const scenarioOffsets: Record<ScenarioKey, number> = {
  reachEfficiency: 141,
  newToBrand: 209,
  creativeFatigue: 317,
  geoReadiness: 431,
}

const diagnosticsScenarios: Record<ScenarioKey, Scenario> = {
  reachEfficiency: {
    label: 'Incremental Reach',
    title: 'Cross-channel incremental reach efficiency review',
    description:
      'A brand team is blending YouTube, CTV, and paid social video, then checking whether the added spend is still buying new households instead of repeated exposures to the same people.',
    businessQuestion:
      'Is cost per incremental household still disciplined, or is duplication across channels making the blended delivery story look better than the true reach expansion?',
    decisionMoment: 'The planning team needs to decide whether the next budget layer should chase more reach or pause because duplication is already degrading efficiency.',
    executiveQuestion: 'Are we still buying net-new households efficiently, or are we paying for repeated exposure and calling it reach growth?',
    metricLabel: 'weekly cost / incremental household',
    targetLabel: 'planning cap',
    targetValue: 18,
    targetDirection: 'lower',
    unit: 'currency',
    shareLabel: 'impression share',
    skills: ['weighted averages', 'distribution shape', 'duplication risk', 'median vs mean', 'operational stability'],
    deliverables: [
      'Quantify whether added budget is still expanding unique reach.',
      'Separate efficient reach channels from channels that mostly add frequency.',
      'Flag weeks where duplication or auction pressure broke the planning assumptions.',
    ],
    guardrails: [
      'Do not let a blended reach headline hide an expensive duplication tail.',
      'Use median and outlier weeks to judge normal operating conditions, not only the best week.',
      'Call out channels that are adding frequency instead of true reach extension.',
    ],
    readoutChecklist: [
      'State the planning cap before the team sees the average.',
      'Show whether the account hit the guardrail consistently or only in a few weeks.',
      'Separate net-new reach evidence from click and completion storytelling.',
    ],
    segments: [
      { label: 'YouTube in-stream', share: 0.39, metric: 14.8, takeaway: 'Best cost for extending unique household reach at scale.' },
      { label: 'CTV prospecting', share: 0.34, metric: 18.9, takeaway: 'Useful reach extension, but efficiency softens after the first waves.' },
      { label: 'Paid social video', share: 0.27, metric: 24.6, takeaway: 'Delivers frequency and clicks, but weaker incremental reach economics.' },
    ],
    questions: [
      {
        prompt: 'Why is blended CPM not enough for this project?',
        answer:
          'Because the decision is about net-new households reached, not raw impressions. A cheap CPM can still be poor if the campaign is mostly buying repeated exposures to people already reached elsewhere.',
      },
      {
        prompt: 'Why should the analyst compare mean and median cost per incremental household?',
        answer:
          'A few very efficient weeks can pull the mean down and make the flight look healthier than a typical week. The median gives a more honest read on normal operating conditions.',
      },
      {
        prompt: 'What does it mean if a channel has solid video completion metrics but weak incremental reach efficiency?',
        answer:
          'It may still be valuable for persuasion or frequency, but it is not the right evidence for a “we are expanding reach efficiently” claim. The objective and the metric have to match.',
      },
    ],
    generate: (rng, index) => {
      const seasonal = Math.sin((index / 12) * Math.PI * 2 + 0.35) * 1.2
      const drift = index > 7 ? 1.15 : 0
      const shock = index === 8 ? 3.2 : index === 2 ? -1.6 : 0
      return Math.max(11.5, 16.4 + seasonal + drift + normalRandom(rng) * 0.9 + shock)
    },
  },
  newToBrand: {
    label: 'New-To-Brand',
    title: 'Retail media new-to-brand acquisition mix',
    description:
      'A retail media team is using Amazon-style new-to-brand reporting to judge whether budget is finding genuinely new buyers or just harvesting existing demand from lower-funnel audiences.',
    businessQuestion:
      'Is the account still prospecting effectively, or is blended performance being held up by retargeting and branded demand that lowers new-to-brand share?',
    decisionMoment: 'The retail media lead wants to know whether the next quarter should keep leaning into acquisition or admit that the account is drifting toward harvest.',
    executiveQuestion: 'Is the blend still acquiring new buyers at the intended rate, or is spend quietly sliding into lower-funnel capture?',
    metricLabel: 'weekly new-to-brand order share',
    targetLabel: 'acquisition target',
    targetValue: 0.55,
    targetDirection: 'higher',
    unit: 'pct',
    shareLabel: 'spend share',
    skills: ['proportions', 'weighted blends', 'segment decomposition', 'mix shifts', 'operational reporting'],
    deliverables: [
      'Track whether full-funnel spend is actually acquiring new buyers.',
      'Separate prospecting-heavy inventory from lower-funnel harvest tactics.',
      'Explain how a mix shift can change blended performance even when each tactic is stable.',
    ],
    guardrails: [
      'Report the weighted blend and the segment mix together.',
      'Do not let retargeting efficiency stand in for acquisition quality.',
      'Watch for mix drift late in the quarter when branded demand starts carrying the account.',
    ],
    readoutChecklist: [
      'Lead with blended new-to-brand share against the acquisition target.',
      'Show which tactics are holding up the blended result and which are dragging it down.',
      'Call mix shift separately from tactic deterioration.',
    ],
    segments: [
      { label: 'DSP video prospecting', share: 0.28, metric: 0.72, takeaway: 'Highest new-to-brand rate and strongest evidence of upper-funnel acquisition.' },
      { label: 'Sponsored Brands', share: 0.37, metric: 0.59, takeaway: 'Healthy mid-funnel acquisition, but sensitive to branded query mix.' },
      { label: 'Remarketing / branded search', share: 0.35, metric: 0.31, takeaway: 'Strong conversion support, but it drags the blended acquisition story downward.' },
    ],
    questions: [
      {
        prompt: 'Why can blended new-to-brand share fall even when no single tactic got worse?',
        answer:
          'Because the mix can shift toward lower new-to-brand tactics. The blended rate is a weighted average, so allocation changes matter even when each tactic is individually stable.',
      },
      {
        prompt: 'Why is a high-ROAS retargeting line not enough to claim strong acquisition performance?',
        answer:
          'Because the project is about new customer acquisition, not just efficient conversion capture. Retargeting can look strong while contributing relatively little to genuinely new demand.',
      },
      {
        prompt: 'What is the statistical advantage of reporting both segment shares and segment rates together?',
        answer:
          'It reveals the blend mechanics. Segment rates alone miss scale, and spend shares alone miss quality. Together they explain the account-level proportion correctly.',
      },
    ],
    generate: (rng, index) => {
      const cycle = Math.sin((index / 12) * Math.PI * 2 - 0.45) * 0.035
      const mixShift = index > 8 ? -0.04 : 0
      const promoLift = index === 3 ? 0.05 : 0
      return Math.max(0.34, Math.min(0.8, 0.58 + cycle + mixShift + normalRandom(rng) * 0.018 + promoLift))
    },
  },
  creativeFatigue: {
    label: 'Creative Fatigue',
    title: 'Frequency-driven creative fatigue monitoring',
    description:
      'A performance creative team is reviewing whether rising frequency is eroding hook rate and click-through performance before a major budget expansion.',
    businessQuestion:
      'Is the creative still holding attention across the week, or is the average being flattered by low-frequency impressions while heavy-frequency buckets decay?',
    decisionMoment: 'The creative and buying teams need to know whether to rotate assets before the next spend increase pushes more delivery into fatigued audiences.',
    executiveQuestion: 'Is the asset still healthy enough to scale, or is the fatigue already visible in the frequency tail?',
    metricLabel: 'daily hook rate',
    targetLabel: 'minimum hook-rate guardrail',
    targetValue: 0.29,
    targetDirection: 'higher',
    unit: 'pct',
    shareLabel: 'impression share',
    skills: ['distributions', 'frequency buckets', 'benchmark hit rate', 'outlier diagnosis', 'segment realism'],
    deliverables: [
      'Detect whether fatigue is emerging before it shows up as obvious CPA damage.',
      'Read performance by frequency bucket rather than only on blended averages.',
      'Decide when creative rotation is a statistical necessity instead of a stylistic preference.',
    ],
    guardrails: [
      'Do not let low-frequency strength hide the decay in the heavy-frequency tail.',
      'Treat repeated sub-guardrail days as an operational warning, not a creative preference debate.',
      'Segment the distribution before approving more spend into fatigued inventory.',
    ],
    readoutChecklist: [
      'State whether the weekly cadence is clearing the hook-rate guardrail.',
      'Show the tail behavior separately from the blended average.',
      'Turn fatigue evidence into a concrete rotate-or-scale recommendation.',
    ],
    segments: [
      { label: 'Frequency 1-2', share: 0.44, metric: 0.35, takeaway: 'Fresh impressions are still responding well to the hook.' },
      { label: 'Frequency 3-5', share: 0.33, metric: 0.29, takeaway: 'Mid-frequency delivery is right on the guardrail and needs monitoring.' },
      { label: 'Frequency 6+', share: 0.23, metric: 0.22, takeaway: 'The ad is wearing out in the heavy-frequency tail.' },
    ],
    questions: [
      {
        prompt: 'Why can the campaign average still look acceptable when frequency fatigue is already real?',
        answer:
          'Because low-frequency impressions often dominate volume and prop up the blend. The failure is sitting in the tail, which matters if future spend will push more impressions into that tail.',
      },
      {
        prompt: 'Why is this a distribution problem and not just a single KPI problem?',
        answer:
          'Because the business decision depends on how performance is spread across impression frequency, not only on the overall mean. Shape and tails matter for the next budget step.',
      },
      {
        prompt: 'What would make the team rotate creative even before CPA fully breaks?',
        answer:
          'Consistent erosion in hook rate, more days below guardrail, and a widening gap between low-frequency and high-frequency buckets all indicate the asset is losing marginal efficiency.',
      },
    ],
    generate: (rng, index) => {
      const drift = index * -0.0042
      const cycle = Math.sin((index / 12) * Math.PI * 2 + 0.55) * 0.014
      const rescue = index === 9 ? 0.03 : 0
      return Math.max(0.19, 0.338 + drift + cycle + normalRandom(rng) * 0.008 + rescue)
    },
  },
  geoReadiness: {
    label: 'Geo Readiness',
    title: 'Matched-geo pre-period stability check',
    description:
      'Before launching a geography-based lift study, a measurement team is checking whether treated and control geo pairs were stable enough in the pre-period to support a clean test.',
    businessQuestion:
      'Are the matched geos close enough before launch that a post-period gap will be interpretable, or is the pre-period noise already too wide for a defensible incrementality read?',
    decisionMoment: 'The incrementality team has to decide whether to launch the geo test now, repair the pairs, or narrow the market set first.',
    executiveQuestion: 'Are the matched markets stable enough to support a causal read later, or is the noise floor already too high?',
    metricLabel: 'weekly matched-geo signup-rate gap',
    targetLabel: 'maximum pre-period gap',
    targetValue: 0.0035,
    targetDirection: 'lower',
    unit: 'pct',
    shareLabel: 'planned spend share',
    skills: ['paired diagnostics', 'variance before testing', 'outlier weeks', 'benchmarking stability', 'test readiness'],
    deliverables: [
      'Check whether pre-period matching is strong enough for a geo lift study.',
      'Identify unstable pairs or weeks before they contaminate the experiment.',
      'Set expectations for how much noise the eventual incrementality test must overcome.',
    ],
    guardrails: [
      'Do not launch a geo test when the pre-period already violates the variance threshold too often.',
      'Investigate outlier weeks before calling the baseline acceptable.',
      'Treat weak pre-period fit as a design problem, not as a caveat to hide in the appendix.',
    ],
    readoutChecklist: [
      'Lead with whether the pre-period stays under the allowed gap threshold.',
      'Show which regions are clean and which are threatening precision.',
      'Translate baseline noise into the expected difficulty of detecting lift later.',
    ],
    segments: [
      { label: 'Northeast pairs', share: 0.31, metric: 0.0028, takeaway: 'Strong pre-period fit and cleanest candidate for treated spend.' },
      { label: 'Sunbelt pairs', share: 0.38, metric: 0.0037, takeaway: 'Usable, but already near the noise threshold.' },
      { label: 'Midwest pairs', share: 0.31, metric: 0.0049, takeaway: 'The baseline gap is wide enough to threaten test precision.' },
    ],
    questions: [
      {
        prompt: 'Why should a senior analyst care about pre-period fit before talking about lift?',
        answer:
          'Because poor pre-period matching inflates the noise floor. If treated and control geos were already drifting apart, a later difference is much harder to attribute credibly to media.',
      },
      {
        prompt: 'What does it mean if only a few pre-period weeks violate the gap threshold?',
        answer:
          'Those weeks need investigation. They may signal local promotions, outages, or reporting artifacts that should be removed or explicitly handled before the lift test starts.',
      },
      {
        prompt: 'Why is this still a descriptive-statistics task even though the next step is causal testing?',
        answer:
          'Because the team first needs to understand the distribution and stability of the baseline data. Good causal work starts with disciplined descriptive diagnostics.',
      },
    ],
    generate: (rng, index) => {
      const wave = Math.sin((index / 12) * Math.PI * 2 - 0.25) * 0.00055
      const noise = Math.abs(normalRandom(rng)) * 0.00048
      const badWeek = index === 7 ? 0.0015 : 0
      return Math.max(0.0012, 0.0027 + wave + noise + badWeek)
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

function formatTargetHitRate(value: number) {
  return `${(value * 100).toFixed(0)}%`
}

function getDiagnosticsVerdict(
  scenario: Scenario,
  average: number,
  targetHitRate: number,
  outlierCount: number,
) {
  const targetPassed =
    scenario.targetDirection === 'higher' ? average >= scenario.targetValue : average <= scenario.targetValue

  if (targetPassed && targetHitRate >= 0.75 && outlierCount <= 1) {
    return {
      tone: 'strong',
      headline: 'Operationally stable enough to support the next decision',
      summary:
        'The average is on the right side of the guardrail, most weeks are behaving, and the operating story is not being carried by a few weird points.',
    }
  }
  if (targetPassed || targetHitRate >= 0.5) {
    return {
      tone: 'watch',
      headline: 'Usable signal, but the operating discipline is not fully clean',
      summary:
        'There is something workable here, but volatility, mix imbalance, or a weak week-to-week hit rate means the readout still needs caution before budget or test decisions are finalized.',
    }
  }
  return {
    tone: 'weak',
    headline: 'The operating story is not healthy enough yet',
    summary:
      'The current pattern misses the intended guardrail too often or by too much. The right next step is repair, not optimistic storytelling.',
  }
}

export function AdvertisingDiagnosticsStudio() {
  const [scenario, setScenario] = useState<ScenarioKey>('reachEfficiency')
  const [seed, setSeed] = useState(18)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)

  const activeScenario = diagnosticsScenarios[scenario]
  const questions = activeScenario.questions
  const activeQuestion = questions[activeQuestionIndex % questions.length]

  const weeklyValues = useMemo(() => {
    const rng = mulberry32(seed + scenarioOffsets[scenario])
    return Array.from({ length: 12 }, (_, index) => activeScenario.generate(rng, index))
  }, [activeScenario, scenario, seed])

  const sorted = useMemo(() => [...weeklyValues].sort((a, b) => a - b), [weeklyValues])
  const average = mean(weeklyValues)
  const med = median(weeklyValues)
  const sd = stdDev(weeklyValues)
  const q1 = quantile(weeklyValues, 0.25)
  const q3 = quantile(weeklyValues, 0.75)
  const iqr = q3 - q1
  const minValue = sorted[0]
  const maxValue = sorted[sorted.length - 1]
  const skewness = useMemo(() => {
    const n = weeklyValues.length
    if (n < 3 || sd === 0) return 0
    const centeredCubeSum = weeklyValues.reduce((sum, value) => sum + ((value - average) / sd) ** 3, 0)
    return (n / ((n - 1) * (n - 2))) * centeredCubeSum
  }, [average, sd, weeklyValues])

  const whiskerLow = q1 - 1.5 * iqr
  const whiskerHigh = q3 + 1.5 * iqr
  const outlierCount = sorted.filter((value) => value < whiskerLow || value > whiskerHigh).length
  const periodsMeetingTarget = weeklyValues.filter((value) =>
    activeScenario.targetDirection === 'higher'
      ? value >= activeScenario.targetValue
      : value <= activeScenario.targetValue,
  ).length
  const targetHitRate = periodsMeetingTarget / weeklyValues.length

  const xPad = (maxValue - minValue) * 0.08 || 1
  const histogramLeft = minValue - xPad
  const histogramRight = maxValue + xPad
  const histogramBins = Math.min(6, Math.max(4, Math.ceil(Math.sqrt(weeklyValues.length))))
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
  const timeSeriesPoints = weeklyValues.map((value, index) => ({ x: index + 1, y: value }))
  const pointCount = weeklyValues.length
  const timeXScale = (value: number) => 72 + ((value - 1) / Math.max(pointCount - 1, 1)) * 468
  const timeYScale = (value: number) => 225 - ((value - timeSeriesLow) / (timeSeriesHigh - timeSeriesLow || 1)) * 170
  const histogramXScale = (value: number) => 65 + ((value - histogramLeft) / (histogramRight - histogramLeft || 1)) * 470

  const targetLabel = `${activeScenario.targetLabel}: ${formatMetric(activeScenario.targetValue, activeScenario.unit)}`
  const averageVsMedianText =
    Math.abs(average - med) < sd * 0.12
      ? 'The mean and median are close, so the average is a reasonable summary of a typical week.'
      : average > med
        ? 'The mean sits above the median, which points to a right tail or a few unusually strong weeks lifting the headline average.'
        : 'The mean sits below the median, which signals a left tail or a few unusually weak weeks dragging the operating average down.'

  const tickWeeks = [1, 4, 8, 12]
  const targetPassed =
    activeScenario.targetDirection === 'higher' ? average >= activeScenario.targetValue : average <= activeScenario.targetValue
  const verdict = getDiagnosticsVerdict(activeScenario, average, targetHitRate, outlierCount)
  const stabilityRead =
    outlierCount === 0
      ? 'No outlier weeks were flagged, so the weekly rhythm is relatively stable.'
      : `${outlierCount} outlier week(s) were flagged, which means the team should investigate volatility before trusting a blended average.`
  const recommendationLine =
    verdict.tone === 'strong'
      ? 'Recommend moving forward, but preserve the diagnostic guardrails in the planning memo.'
      : verdict.tone === 'watch'
        ? 'Recommend a constrained next step with explicit caveats about volatility, mix, or tail risk.'
        : 'Recommend fixing the operating issue before treating this as clean measurement support.'
  const targetY = timeYScale(activeScenario.targetValue)
  const averageY = timeYScale(average)
  const medianY = timeYScale(med)
  const goodBandY = activeScenario.targetDirection === 'higher' ? 45 : targetY
  const goodBandHeight = activeScenario.targetDirection === 'higher' ? Math.max(targetY - 45, 0) : Math.max(225 - targetY, 0)
  const warningDelta = Math.max(
    iqr * 0.22,
    activeScenario.unit === 'pct' ? 0.004 : activeScenario.unit === 'currency' ? 0.8 : 0.06,
  )
  const pointTone = (value: number) => {
    if (activeScenario.targetDirection === 'higher') {
      if (value >= activeScenario.targetValue) return 'good'
      if (value >= activeScenario.targetValue - warningDelta) return 'watch'
      return 'bad'
    }
    if (value <= activeScenario.targetValue) return 'good'
    if (value <= activeScenario.targetValue + warningDelta) return 'watch'
    return 'bad'
  }
  const iqrLeft = histogramXScale(q1)
  const iqrRight = histogramXScale(q3)
  const targetX = histogramXScale(activeScenario.targetValue)

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Applied advertising"
          title="Measurement diagnostics used by serious advertising teams"
          description="These are the descriptive workflows that happen before anyone talks about incrementality: reach duplication, new-to-brand mix, creative fatigue, and whether geo tests are even ready to launch."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <ChoiceRow
              label="Project"
              options={scenarioOrder.map((key) => ({ label: diagnosticsScenarios[key].label, value: key }))}
              value={scenario}
              onChange={(value) => {
                setScenario(value)
                setActiveQuestionIndex(0)
              }}
            />
            <div className="explanation-panel">
              <span className="panel-label">Workstream</span>
              <p className="strong-text">{activeScenario.title}</p>
              <p>{activeScenario.description}</p>
              <p>{activeScenario.businessQuestion}</p>
              <p>{targetLabel}</p>
            </div>
            <div className="signal-grid compact">
              <article className="signal-card">
                <span className="panel-label">Decision pressure</span>
                <strong>{activeScenario.executiveQuestion}</strong>
                <p>{activeScenario.decisionMoment}</p>
              </article>
              <article className="signal-card">
                <span className="panel-label">Guardrail</span>
                <strong>{targetLabel}</strong>
                <p>{targetPassed ? 'The current average clears the guardrail.' : 'The current average misses the guardrail.'}</p>
              </article>
            </div>
            <div className="tag-row">
              {activeScenario.skills.map((skill) => (
                <span key={skill} className="tag-pill">
                  {skill}
                </span>
              ))}
            </div>
            <section className="content-card inset">
              <h3>What the analyst ships</h3>
              <ul className="syllabus-list">
                {activeScenario.deliverables.map((deliverable) => (
                  <li key={deliverable}>{deliverable}</li>
                ))}
              </ul>
            </section>
            <div className="button-stack">
              <button type="button" className="primary-button" onClick={() => setSeed((current) => current + 1)}>
                Refresh 12 weeks of data
              </button>
            </div>
          </aside>

          <div className="module-content">
            <section className={`decision-banner ${verdict.tone}`}>
              <span className="panel-label">Diagnostic call</span>
              <h3>{verdict.headline}</h3>
              <p>{verdict.summary}</p>
              <p>{activeScenario.decisionMoment}</p>
            </section>

            <div className="metric-strip wide">
              <MetricCard value={formatMetric(average, activeScenario.unit)} label={`mean ${activeScenario.metricLabel}`} />
              <MetricCard value={formatMetric(med, activeScenario.unit)} label={`median ${activeScenario.metricLabel}`} />
              <MetricCard value={formatMetric(sd, activeScenario.unit)} label="standard deviation" />
              <MetricCard value={formatTargetHitRate(targetHitRate)} label="weeks on target" />
            </div>
            <div className="metric-strip wide">
              <MetricCard value={formatMetric(q1, activeScenario.unit)} label="Q1" />
              <MetricCard value={formatMetric(q3, activeScenario.unit)} label="Q3" />
              <MetricCard value={formatNumber(skewness, 2)} label="skewness" />
              <MetricCard value={String(outlierCount)} label="outlier weeks" />
            </div>

            <div className="signal-grid">
              <article className="signal-card">
                <span className="panel-label">Guardrail hit rate</span>
                <strong>{formatTargetHitRate(targetHitRate)}</strong>
                <p>{targetPassed ? 'The average clears the threshold.' : 'The average misses the threshold.'}</p>
              </article>
              <article className="signal-card">
                <span className="panel-label">Stability read</span>
                <strong>{outlierCount === 0 ? 'Stable weekly pattern' : 'Volatility needs inspection'}</strong>
                <p>{stabilityRead}</p>
              </article>
              <article className="signal-card">
                <span className="panel-label">Typical week</span>
                <strong>{formatMetric(med, activeScenario.unit)}</strong>
                <p>The median is the safer operating baseline when a few weeks can flatter the mean.</p>
              </article>
              <article className="signal-card">
                <span className="panel-label">Spread</span>
                <strong>{formatMetric(iqr, activeScenario.unit)}</strong>
                <p>The middle half of weeks spans this much operating noise.</p>
              </article>
            </div>

            <div className="two-up-grid">
              <section className="content-card inset">
                <h3>Weekly run chart</h3>
                <p>The line shows the operating rhythm of the measurement over the flight. The guardrail separates a healthy average from a healthy week-to-week operation.</p>
                <svg viewBox="0 0 620 280" className="chart-svg" role="img" aria-label="Advertising diagnostic time series">
                  <rect x="0" y="0" width="620" height="280" rx="24" className="chart-frame" />
                  <rect x="72" y={goodBandY} width="468" height={goodBandHeight} className="chart-band good" rx="18" />
                  <line x1="72" y1="225" x2="540" y2="225" className="chart-grid-line" />
                  <line x1="72" y1={targetY} x2="540" y2={targetY} className="critical-line" />
                  <line x1="72" y1={averageY} x2="540" y2={averageY} className="reference-line theoretical" />
                  <line x1="72" y1={medianY} x2="540" y2={medianY} className="reference-line empirical" />
                  <polyline points={buildPolyline(timeSeriesPoints, timeXScale, timeYScale)} className="curve-line null" />
                  {timeSeriesPoints.map((point) => (
                    <circle
                      key={point.x}
                      cx={timeXScale(point.x)}
                      cy={timeYScale(point.y)}
                      r="4.4"
                      className={`chart-point ${pointTone(point.y)}`}
                      strokeWidth="1.6"
                    />
                  ))}
                  <text x="24" y="28" className="chart-caption">{activeScenario.metricLabel}</text>
                  <text x="350" y={targetY - 10} className="axis-label">{targetLabel}</text>
                  <text x="482" y={averageY - 8} className="axis-label">mean</text>
                  <text x="482" y={medianY + 14} className="axis-label">median</text>
                  {tickWeeks.map((week) => (
                    <text key={week} x={timeXScale(week) - 12} y="248" className="axis-label">
                      wk {week}
                    </text>
                  ))}
                </svg>
                <div className="chart-legend">
                  <span className="legend-chip"><span className="legend-swatch good" />on guardrail</span>
                  <span className="legend-chip"><span className="legend-swatch watch" />near threshold</span>
                  <span className="legend-chip"><span className="legend-swatch bad" />misses threshold</span>
                  <span className="legend-chip"><span className="legend-swatch line control" />mean line</span>
                  <span className="legend-chip"><span className="legend-swatch line variant" />median line</span>
                </div>
              </section>

              <section className="content-card inset">
                <h3>Distribution view</h3>
                <p>The histogram shows whether the project is being driven by a stable core of weeks or by a few weeks that make the average look better than the operating reality.</p>
                <svg viewBox="0 0 620 280" className="chart-svg" role="img" aria-label="Advertising diagnostic histogram">
                  <rect x="0" y="0" width="620" height="280" rx="24" className="chart-frame" />
                  <rect x={iqrLeft} y="52" width={Math.max(iqrRight - iqrLeft, 0)} height="168" className="chart-band watch" rx="18" />
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
                  <line x1={targetX} y1="40" x2={targetX} y2="220" className="critical-line" />
                  <line x1={histogramXScale(average)} y1="40" x2={histogramXScale(average)} y2="220" className="reference-line theoretical" />
                  <line x1={histogramXScale(med)} y1="40" x2={histogramXScale(med)} y2="220" className="reference-line empirical" />
                  <text x={targetX + 6} y="66" className="axis-label">target</text>
                  <text x={histogramXScale(average) + 6} y="34" className="axis-label">mean</text>
                  <text x={histogramXScale(med) + 6} y="50" className="axis-label">median</text>
                  <text x="24" y="28" className="chart-caption">weeks</text>
                </svg>
                <div className="chart-legend">
                  <span className="legend-chip"><span className="legend-swatch watch" />middle 50% of weeks</span>
                  <span className="legend-chip"><span className="legend-swatch line guide" />target line</span>
                  <span className="legend-chip"><span className="legend-swatch line control" />mean</span>
                  <span className="legend-chip"><span className="legend-swatch line variant" />median</span>
                </div>
              </section>
            </div>

            <section className="content-card inset">
              <h3>Segment decomposition</h3>
              <p>The blend is not the story. These rows show where the result is coming from and whether scale and quality are actually aligned.</p>
              <div className="segment-stack">
                {activeScenario.segments.map((segment) => (
                  <div key={segment.label} className="segment-row">
                    <div>
                      <strong>{segment.label}</strong>
                      <p>{segment.takeaway}</p>
                    </div>
                    <div className="segment-bar-wrap" aria-hidden="true">
                      <div className="segment-bar-track">
                        <div className="segment-bar-fill" style={{ width: `${segment.share * 100}%` }} />
                      </div>
                      <span>{(segment.share * 100).toFixed(0)}% {activeScenario.shareLabel}</span>
                    </div>
                    <strong>{formatMetric(segment.metric, activeScenario.unit)}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="content-card inset">
              <h3>Executive readout</h3>
              <div className="memo-grid">
                <div className="memo-card">
                  <span className="panel-label">Recommendation</span>
                  <p className="strong-text">{recommendationLine}</p>
                  <p>
                    {periodsMeetingTarget} of {weeklyValues.length} weeks met the operating target, with a typical week around {formatMetric(med, activeScenario.unit)} and an average of {formatMetric(average, activeScenario.unit)}.
                  </p>
                  <p>{averageVsMedianText}</p>
                </div>
                <div className="memo-card">
                  <span className="panel-label">Guardrails</span>
                  <ul className="syllabus-list signal-list">
                    {activeScenario.guardrails.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <div className="two-up-grid">
              <section className="content-card inset">
                <h3>Readout checklist</h3>
                <ul className="syllabus-list signal-list">
                  {activeScenario.readoutChecklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="content-card inset">
                <h3>Interpretation</h3>
                <div className="explanation-panel">
                  <p className="strong-text">
                    The middle 50% of weeks fall between {formatMetric(q1, activeScenario.unit)} and {formatMetric(q3, activeScenario.unit)}.
                  </p>
                  <p>
                    {outlierCount > 0
                      ? `${outlierCount} week(s) sit beyond the 1.5×IQR fences, so the team should inspect those weeks before trusting a single average.`
                      : 'No weeks were flagged as outliers by the 1.5×IQR rule.'}
                  </p>
                  <p>{stabilityRead}</p>
                </div>
              </section>
            </div>

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
