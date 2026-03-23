import { useState } from 'react'
import { ChoiceRow, MetricCard, ModuleHeader, Slider } from '../components/index.ts'
import {
  buildPolyline,
  formatNumber,
  formatPct,
  mean,
  normalCdf,
  normalPdf,
  stdDev,
} from '../utils/math.ts'

type ScenarioKey = 'conversionLift' | 'brandLiftSurvey' | 'geoLift' | 'valuePerSession'

type ProportionScenario = {
  kind: 'proportion'
  label: string
  title: string
  description: string
  controlLabel: string
  variantLabel: string
  nA: number
  nB: number
  rateA: number
  rateB: number
  rolloutVolume: number
  rolloutLabel: string
  skills: string[]
  outputs: string[]
  questions: Array<{ prompt: string; answer: string }>
}

type MeanScenario = {
  kind: 'mean'
  label: string
  title: string
  description: string
  controlLabel: string
  variantLabel: string
  nA: number
  nB: number
  meanA: number
  meanB: number
  sdA: number
  sdB: number
  rolloutVolume: number
  rolloutLabel: string
  skills: string[]
  outputs: string[]
  questions: Array<{ prompt: string; answer: string }>
}

type GeoScenario = {
  kind: 'geo'
  label: string
  title: string
  description: string
  controlLabel: string
  variantLabel: string
  preControl: number[]
  postControl: number[]
  preTreatment: number[]
  postTreatment: number[]
  unit: 'count' | 'currency' | 'pct'
  rolloutMultiplier: number
  rolloutLabel: string
  skills: string[]
  outputs: string[]
  questions: Array<{ prompt: string; answer: string }>
}

type ExperimentScenario = ProportionScenario | MeanScenario | GeoScenario

const confidenceLookup: Record<number, number> = {
  0.9: 1.645,
  0.95: 1.96,
  0.99: 2.576,
}

const alphaOptions = [0.1, 0.05, 0.01]
const confidenceOptions = [0.9, 0.95, 0.99]
const scenarioOrder: ScenarioKey[] = ['conversionLift', 'brandLiftSurvey', 'geoLift', 'valuePerSession']

const experimentScenarios: Record<ScenarioKey, ExperimentScenario> = {
  conversionLift: {
    kind: 'proportion',
    label: 'Conversion Lift',
    title: 'User-level conversion lift on qualified lead generation',
    description:
      'A growth team is running a holdout-based lift test to estimate incremental qualified lead rate, not just attributed platform conversions, before adding a large monthly budget tranche.',
    controlLabel: 'Holdout',
    variantLabel: 'Exposed',
    nA: 420000,
    nB: 423000,
    rateA: 0.0189,
    rateB: 0.0216,
    rolloutVolume: 5200000,
    rolloutLabel: 'incremental qualified leads at the planned monthly audience scale',
    skills: ['difference in proportions', 'incrementality', 'confidence intervals', 'p-values', 'lift translation'],
    outputs: [
      'Estimate incremental conversion rate, not just platform-reported attributed conversions.',
      'Translate lift into incremental leads the business can forecast against pipeline targets.',
      'Communicate uncertainty so rollout decisions are based on ranges, not just headline point estimates.',
    ],
    questions: [
      {
        prompt: 'Why is this a lift study and not just a reporting exercise on attributed conversions?',
        answer:
          'Because the question is causal: what happened because ads ran? Attributed conversions can move with exposure while still overstating the true incremental contribution of the media.',
      },
      {
        prompt: 'Why can a statistically significant lift still be strategically weak?',
        answer:
          'Because significance only says the observed effect is hard to explain by random assignment noise. The incremental rate can still be too small to justify the budget or opportunity cost.',
      },
      {
        prompt: 'What is the correct business use of the confidence interval here?',
        answer:
          'Use it to bound plausible incremental lead outcomes under scale. The lower bound matters for risk management, not just the point estimate in the middle.',
      },
    ],
  },
  brandLiftSurvey: {
    kind: 'proportion',
    label: 'Brand Lift Survey',
    title: 'Survey-measured ad recall lift',
    description:
      'A brand team is reading exposed-versus-control survey results to determine whether a streaming and social video campaign produced a real recall lift, and whether the range is decision-worthy.',
    controlLabel: 'Control survey',
    variantLabel: 'Exposed survey',
    nA: 9400,
    nB: 9630,
    rateA: 0.147,
    rateB: 0.183,
    rolloutVolume: 1800000,
    rolloutLabel: 'incremental ad-recall-positive people in the target audience',
    skills: ['survey proportions', 'confidence intervals', 'lift interpretation', 'precision vs scale', 'brand measurement'],
    outputs: [
      'Estimate whether upper-funnel media moved a survey-based brand outcome.',
      'Translate percentage-point lift into an audience-level planning implication.',
      'Describe what a survey result can support without pretending it proves downstream sales impact.',
    ],
    questions: [
      {
        prompt: 'Why is a brand lift survey still a proportions problem?',
        answer:
          'Because each respondent either gives the target answer or does not. The main statistic is the difference between two response proportions, not a continuous mean.',
      },
      {
        prompt: 'Why should a planner avoid describing this as direct proof of sales lift?',
        answer:
          'Because the measured outcome is ad recall, not purchases. It is valid evidence on the survey outcome itself, but it is only one link in the full causal chain to business impact.',
      },
      {
        prompt: 'What does a narrow positive interval buy the team operationally?',
        answer:
          'It makes it easier to defend future budget, because the team is no longer relying on a vague directional win. The likely effect size range is tighter and easier to plan around.',
      },
    ],
  },
  geoLift: {
    kind: 'geo',
    label: 'Geo Lift',
    title: 'Matched-geo conversion lift for video prospecting',
    description:
      'A measurement team is reading a geography-based lift study for a video-heavy prospecting plan where user-level holdouts were not the right operational fit. The effect is the post-pre treated change minus the post-pre control change.',
    controlLabel: 'Matched control geos',
    variantLabel: 'Treated geos',
    preControl: [242, 251, 260, 247, 255, 246, 258, 249, 263, 252, 257, 245],
    postControl: [246, 256, 264, 251, 259, 250, 263, 254, 268, 256, 262, 249],
    preTreatment: [244, 248, 261, 249, 257, 247, 259, 251, 265, 254, 255, 246],
    postTreatment: [259, 265, 278, 267, 273, 262, 276, 268, 282, 270, 271, 262],
    unit: 'count',
    rolloutMultiplier: 210,
    rolloutLabel: 'incremental weekly qualified signups if the treatment scaled nationally',
    skills: ['difference-in-differences', 'matched-market variance', 'confidence intervals', 'incrementality', 'test-read interpretation'],
    outputs: [
      'Estimate causal lift when the experiment randomizes by geography instead of user.',
      'Check whether the treated post-period moved more than the matched controls would predict.',
      'Translate per-geo lift into a national planning estimate without ignoring uncertainty.',
    ],
    questions: [
      {
        prompt: 'Why is the treated-minus-control post gap alone not enough in a geo test?',
        answer:
          'Because geos can differ before the test starts. The correct effect compares changes, not just levels, so the analysis adjusts for what the treated geos were already doing relative to controls.',
      },
      {
        prompt: 'What does a noisy distribution of geo-level changes do to the lift estimate?',
        answer:
          'It widens the standard error and the confidence interval. Even a useful average effect can become hard to detect if the matched-market changes are volatile.',
      },
      {
        prompt: 'Why is a geo lift result often more operationally credible than raw attributed conversions?',
        answer:
          'Because the treated versus control design is trying to identify what changed because media ran, not simply what conversions happened after exposure and were easy to assign to the platform.',
      },
    ],
  },
  valuePerSession: {
    kind: 'mean',
    label: 'Value / Session',
    title: 'Average revenue per session experiment',
    description:
      'A merchandising and paid media team changed the landing experience and is testing whether value per session improved enough to justify permanent rollout before a major promotion.',
    controlLabel: 'Current experience',
    variantLabel: 'Merch-first layout',
    nA: 12400,
    nB: 12380,
    meanA: 4.82,
    meanB: 5.31,
    sdA: 15.1,
    sdB: 15.8,
    rolloutVolume: 310000,
    rolloutLabel: 'incremental monthly revenue at current session volume',
    skills: ['difference in means', 'high-variance metrics', 'confidence intervals', 'effect size', 'business value under uncertainty'],
    outputs: [
      'Estimate whether the experience increased a noisy value metric enough to matter.',
      'Show how variance drives sample size needs even when the mean lift looks attractive.',
      'Separate a positive point estimate from a claim of a fully confirmed win.',
    ],
    questions: [
      {
        prompt: 'Why can revenue per session need much more traffic than conversion rate?',
        answer:
          'Because session value is usually much noisier and more skewed. High variance inflates the standard error, so the test needs more observations to narrow the interval around the mean lift.',
      },
      {
        prompt: 'What is the correct reading if the mean lift is positive but the interval still touches zero?',
        answer:
          'The current estimate leans positive, but the data are still compatible with no real lift. The team should not talk as if the outcome is fully settled.',
      },
      {
        prompt: 'Why is this still relevant to advertising teams and not just site UX teams?',
        answer:
          'Because media efficiency depends on post-click value. Advertising decisions are downstream of what the landing experience does to value per visit.',
      },
    ],
  },
}

function formatPrimaryMetric(scenario: ExperimentScenario, value: number) {
  if (scenario.kind === 'proportion') {
    return formatPct(value)
  }
  if (scenario.kind === 'mean') {
    return `$${value.toFixed(2)}`
  }
  if (scenario.unit === 'currency') {
    return `$${value.toFixed(2)}`
  }
  if (scenario.unit === 'pct') {
    return formatPct(value)
  }
  return `${value.toFixed(1)}`
}

function formatEffect(scenario: ExperimentScenario, value: number) {
  if (scenario.kind === 'proportion') {
    return `${(value * 100).toFixed(2)} pp`
  }
  if (scenario.kind === 'mean') {
    return `$${value.toFixed(2)}`
  }
  if (scenario.unit === 'currency') {
    return `$${value.toFixed(2)}`
  }
  if (scenario.unit === 'pct') {
    return `${(value * 100).toFixed(2)} pp`
  }
  return `${value.toFixed(1)}`
}

function formatIncremental(scenario: ExperimentScenario, value: number) {
  if (scenario.kind === 'mean') {
    return `$${Math.round(value).toLocaleString('en-US')}`
  }
  if (scenario.kind === 'geo' && scenario.unit === 'currency') {
    return `$${Math.round(value).toLocaleString('en-US')}`
  }
  return `${Math.round(value).toLocaleString('en-US')}`
}

function formatPValue(value: number) {
  return value < 0.0001 ? '<0.0001' : value.toFixed(4)
}

export function AdvertisingExperimentsStudio() {
  const [scenario, setScenario] = useState<ScenarioKey>('conversionLift')
  const [evidenceScale, setEvidenceScale] = useState(100)
  const [alpha, setAlpha] = useState(0.05)
  const [confidenceLevel, setConfidenceLevel] = useState(0.95)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)

  const activeScenario = experimentScenarios[scenario]
  const questions = activeScenario.questions
  const activeQuestion = questions[activeQuestionIndex % questions.length]
  const zCritical = confidenceLookup[confidenceLevel]

  let metricA = 0
  let metricB = 0
  let diff = 0
  let standardError = 0
  let testStandardError = 0
  let relativeLift = 0
  let incrementalImpact = 0
  let hypothesisText = ''
  let chartDomainMax = 1
  let sliderDisplay = ''
  let sliderNote = ''
  let pairCount = 0
  let geoPreControl = 0
  let geoPostControl = 0
  let geoPreTreatment = 0
  let geoPostTreatment = 0

  if (activeScenario.kind === 'proportion') {
    const scale = evidenceScale / 100
    const nA = Math.max(1500, Math.round(activeScenario.nA * scale))
    const nB = Math.max(1500, Math.round(activeScenario.nB * scale))
    const successesA = Math.round(nA * activeScenario.rateA)
    const successesB = Math.round(nB * activeScenario.rateB)
    metricA = successesA / nA
    metricB = successesB / nB
    diff = metricB - metricA
    const pooledRate = (successesA + successesB) / (nA + nB)
    standardError = Math.sqrt((metricA * (1 - metricA)) / nA + (metricB * (1 - metricB)) / nB)
    testStandardError = Math.sqrt(pooledRate * (1 - pooledRate) * ((1 / nA) + (1 / nB)))
    relativeLift = metricA === 0 ? 0 : diff / metricA
    incrementalImpact = diff * activeScenario.rolloutVolume
    hypothesisText = `H₀: p${activeScenario.variantLabel} = p${activeScenario.controlLabel} vs. H₁: p${activeScenario.variantLabel} ≠ p${activeScenario.controlLabel}`
    chartDomainMax = Math.max(metricA, metricB) * 1.35 || 1
    sliderDisplay = `${Math.round(scale * 100)}%`
    sliderNote = 'Scale respondent or traffic volume to see how precision changes.'
  } else if (activeScenario.kind === 'mean') {
    const scale = evidenceScale / 100
    const nA = Math.max(250, Math.round(activeScenario.nA * scale))
    const nB = Math.max(250, Math.round(activeScenario.nB * scale))
    metricA = activeScenario.meanA
    metricB = activeScenario.meanB
    diff = metricB - metricA
    standardError = Math.sqrt((activeScenario.sdA ** 2) / nA + (activeScenario.sdB ** 2) / nB)
    testStandardError = standardError
    relativeLift = metricA === 0 ? 0 : diff / metricA
    incrementalImpact = diff * activeScenario.rolloutVolume
    hypothesisText = `H₀: μ${activeScenario.variantLabel} = μ${activeScenario.controlLabel} vs. H₁: μ${activeScenario.variantLabel} ≠ μ${activeScenario.controlLabel}`
    chartDomainMax = Math.max(metricA, metricB) * 1.35 || 1
    sliderDisplay = `${Math.round(scale * 100)}%`
    sliderNote = 'Scale eligible session volume to see how much variance changes precision.'
  } else {
    const maxPairs = activeScenario.preControl.length
    pairCount = Math.max(6, Math.min(maxPairs, Math.round((maxPairs * evidenceScale) / 100)))
    const preControl = activeScenario.preControl.slice(0, pairCount)
    const postControl = activeScenario.postControl.slice(0, pairCount)
    const preTreatment = activeScenario.preTreatment.slice(0, pairCount)
    const postTreatment = activeScenario.postTreatment.slice(0, pairCount)

    geoPreControl = mean(preControl)
    geoPostControl = mean(postControl)
    geoPreTreatment = mean(preTreatment)
    geoPostTreatment = mean(postTreatment)

    metricA = geoPostControl
    metricB = geoPostTreatment
    const controlChanges = postControl.map((value, index) => value - preControl[index])
    const treatmentChanges = postTreatment.map((value, index) => value - preTreatment[index])
    const controlMeanChange = mean(controlChanges)
    const treatmentMeanChange = mean(treatmentChanges)
    diff = treatmentMeanChange - controlMeanChange
    standardError = Math.sqrt((stdDev(controlChanges) ** 2) / pairCount + (stdDev(treatmentChanges) ** 2) / pairCount)
    testStandardError = standardError
    const counterfactualPost = geoPreTreatment + controlMeanChange
    relativeLift = counterfactualPost === 0 ? 0 : diff / counterfactualPost
    incrementalImpact = diff * activeScenario.rolloutMultiplier
    hypothesisText = `H₀: Δ${activeScenario.variantLabel} = Δ${activeScenario.controlLabel} vs. H₁: Δ${activeScenario.variantLabel} ≠ Δ${activeScenario.controlLabel}`
    chartDomainMax = Math.max(geoPreControl, geoPostControl, geoPreTreatment, geoPostTreatment) * 1.25 || 1
    sliderDisplay = `${pairCount} pairs`
    sliderNote = 'Use more or fewer matched geo pairs to see how market count changes precision.'
  }

  const zScore = testStandardError === 0 ? 0 : diff / testStandardError
  const pValue = 2 * (1 - normalCdf(Math.abs(zScore)))
  const ciLow = diff - zCritical * standardError
  const ciHigh = diff + zCritical * standardError
  const observedEffect = testStandardError === 0 ? 0 : diff / testStandardError
  const alphaCutoff = confidenceLookup[1 - alpha]
  const power = (1 - normalCdf(alphaCutoff - observedEffect)) + normalCdf(-alphaCutoff - observedEffect)
  const significant = pValue < alpha

  const barHeight = (value: number) => (value / chartDomainMax) * 150
  const ciDomainLeft = Math.min(ciLow, 0, diff) - Math.abs(diff || 1) * 0.7 - standardError * 2
  const ciDomainRight = Math.max(ciHigh, 0, diff) + Math.abs(diff || 1) * 0.7 + standardError * 2
  const ciScale = (value: number) => 70 + ((value - ciDomainLeft) / (ciDomainRight - ciDomainLeft || 1)) * 480

  const zDomainLeft = -4
  const zDomainRight = 4
  const densityPoints = Array.from({ length: 121 }, (_, index) => {
    const x = zDomainLeft + ((zDomainRight - zDomainLeft) * index) / 120
    return { x, y: normalPdf(x) }
  })
  const zXScale = (value: number) => 70 + ((value - zDomainLeft) / (zDomainRight - zDomainLeft)) * 500
  const zYScale = (value: number) => 232 - (value / 0.4) * 165

  const actionText =
    ciLow > 0
      ? 'The estimate is directionally strong enough to defend a rollout if the operational costs and strategic constraints also make sense.'
      : diff > 0
        ? 'The point estimate is positive, but uncertainty is still material. The right read is “promising, not settled.”'
        : 'The current evidence does not support describing this as a positive lift.'

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Applied advertising"
          title="Experiments the way real media measurement teams run them"
          description="This module is built around actual advertising measurement work: holdout-based conversion lift, brand lift surveys, geo-based incrementality, and high-variance value experiments."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <ChoiceRow
              label="Project"
              options={scenarioOrder.map((key) => ({ label: experimentScenarios[key].label, value: key }))}
              value={scenario}
              onChange={setScenario}
            />
            <Slider
              label={activeScenario.kind === 'geo' ? 'Matched markets' : 'Evidence scale'}
              value={evidenceScale}
              min={50}
              max={activeScenario.kind === 'geo' ? 100 : 200}
              step={activeScenario.kind === 'geo' ? 5 : 5}
              display={sliderDisplay}
              note={sliderNote}
              onChange={(value) => setEvidenceScale(Math.round(value))}
            />
            <ChoiceRow
              label="Significance level α"
              options={alphaOptions.map((value) => ({ label: String(value), value }))}
              value={alpha}
              onChange={setAlpha}
            />
            <ChoiceRow
              label="Confidence"
              options={confidenceOptions.map((value) => ({ label: `${Math.round(value * 100)}%`, value }))}
              value={confidenceLevel}
              onChange={setConfidenceLevel}
            />
            <div className="explanation-panel">
              <span className="panel-label">Measurement brief</span>
              <p className="strong-text">{activeScenario.title}</p>
              <p>{activeScenario.description}</p>
            </div>
            <div className="tag-row">
              {activeScenario.skills.map((skill) => (
                <span key={skill} className="tag-pill">
                  {skill}
                </span>
              ))}
            </div>
            <section className="content-card inset">
              <h3>What the team ships</h3>
              <ul className="syllabus-list">
                {activeScenario.outputs.map((output) => (
                  <li key={output}>{output}</li>
                ))}
              </ul>
            </section>
          </aside>

          <div className="module-content">
            <div className="metric-strip wide">
              <MetricCard value={formatPrimaryMetric(activeScenario, metricA)} label={activeScenario.controlLabel} />
              <MetricCard value={formatPrimaryMetric(activeScenario, metricB)} label={activeScenario.variantLabel} />
              <MetricCard value={formatEffect(activeScenario, diff)} label="estimated lift" />
              <MetricCard value={formatPct(relativeLift)} label="relative lift" />
            </div>
            <div className="metric-strip wide">
              <MetricCard value={formatPValue(pValue)} label="two-sided p-value" />
              <MetricCard value={formatNumber(zScore, 2)} label={activeScenario.kind === 'geo' ? 'DiD z statistic' : 'z statistic'} />
              <MetricCard value={formatPct(power)} label="approx. power" />
              <MetricCard value={significant ? 'Reject H₀' : 'Fail to reject H₀'} label="decision" />
            </div>

            <div className="two-up-grid">
              <section className="content-card inset">
                <h3>{activeScenario.kind === 'geo' ? 'Pre/post market means' : 'Observed performance'}</h3>
                <p>
                  {activeScenario.kind === 'geo'
                    ? 'The geo study is judged on change, not just level. The treated post-period must outperform what the control-market change would have predicted.'
                    : 'The bars show the observed group summaries. The estimates can move only slightly while precision changes a lot with more evidence.'}
                </p>
                <svg viewBox="0 0 620 280" className="chart-svg" role="img" aria-label="Experiment results">
                  <rect x="0" y="0" width="620" height="280" rx="24" className="chart-frame" />
                  <line x1="80" y1="225" x2="540" y2="225" stroke="rgba(19,34,71,0.12)" strokeWidth="1" />
                  {activeScenario.kind === 'geo' ? (
                    <>
                      <rect x="95" y={225 - barHeight(geoPreControl)} width="84" height={barHeight(geoPreControl)} className="bar-rect" rx="10" />
                      <rect x="195" y={225 - barHeight(geoPostControl)} width="84" height={barHeight(geoPostControl)} className="bar-rect" rx="10" />
                      <rect x="345" y={225 - barHeight(geoPreTreatment)} width="84" height={barHeight(geoPreTreatment)} className="hist-bar" rx="10" />
                      <rect x="445" y={225 - barHeight(geoPostTreatment)} width="84" height={barHeight(geoPostTreatment)} className="hist-bar" rx="10" />
                      <text x="108" y="248" className="axis-label">ctrl pre</text>
                      <text x="206" y="248" className="axis-label">ctrl post</text>
                      <text x="356" y="248" className="axis-label">trt pre</text>
                      <text x="458" y="248" className="axis-label">trt post</text>
                    </>
                  ) : (
                    <>
                      <rect x="150" y={225 - barHeight(metricA)} width="120" height={barHeight(metricA)} className="bar-rect" rx="10" />
                      <rect x="350" y={225 - barHeight(metricB)} width="120" height={barHeight(metricB)} className="hist-bar" rx="10" />
                      <text x="170" y="248" className="axis-label">{activeScenario.controlLabel}</text>
                      <text x="372" y="248" className="axis-label">{activeScenario.variantLabel}</text>
                      <text x="168" y={215 - barHeight(metricA)} className="axis-label">{formatPrimaryMetric(activeScenario, metricA)}</text>
                      <text x="368" y={215 - barHeight(metricB)} className="axis-label">{formatPrimaryMetric(activeScenario, metricB)}</text>
                    </>
                  )}
                  <text x="26" y="28" className="chart-caption">{activeScenario.kind === 'mean' ? 'mean value' : 'rate / outcome level'}</text>
                </svg>
              </section>

              <section className="content-card inset">
                <h3>Lift with confidence interval</h3>
                <p>The point estimate is the best current lift read. The interval shows the effect sizes still plausible under repeated sampling at the chosen confidence level.</p>
                <svg viewBox="0 0 620 280" className="chart-svg" role="img" aria-label="Confidence interval for lift">
                  <rect x="0" y="0" width="620" height="280" rx="24" className="chart-frame" />
                  <line x1={ciScale(0)} y1="55" x2={ciScale(0)} y2="225" stroke="rgba(19,34,71,0.2)" strokeWidth="2" strokeDasharray="6 6" />
                  <line x1={ciScale(ciLow)} y1="145" x2={ciScale(ciHigh)} y2="145" className={`interval-line ${ciLow <= 0 && ciHigh >= 0 ? 'miss' : 'good'}`} />
                  <circle cx={ciScale(diff)} cy="145" r="8" className={`interval-point ${ciLow <= 0 && ciHigh >= 0 ? 'miss' : 'good'}`} />
                  <text x={ciScale(0) + 8} y="48" className="axis-label">zero lift</text>
                  <text x={ciScale(diff) + 10} y="136" className="axis-label">{formatEffect(activeScenario, diff)}</text>
                  <text x="26" y="28" className="chart-caption">lift</text>
                  <text x="70" y="240" className="axis-label">{formatEffect(activeScenario, ciDomainLeft)}</text>
                  <text x="500" y="240" className="axis-label">{formatEffect(activeScenario, ciDomainRight)}</text>
                </svg>
              </section>
            </div>

            <section className="content-card inset">
              <h3>Null model and p-value</h3>
              <p>The curve is the null distribution in z-space. The dashed lines mark the two-sided rejection cutoffs for α, and the dark line shows the observed statistic.</p>
              <svg viewBox="0 0 640 290" className="chart-svg" role="img" aria-label="Null distribution for experiment test">
                <rect x="0" y="0" width="640" height="290" rx="24" className="chart-frame" />
                <polyline points={buildPolyline(densityPoints, zXScale, zYScale)} className="curve-line null" />
                <line x1={zXScale(-alphaCutoff)} y1="52" x2={zXScale(-alphaCutoff)} y2="232" className="critical-line" />
                <line x1={zXScale(alphaCutoff)} y1="52" x2={zXScale(alphaCutoff)} y2="232" className="critical-line" />
                <line x1={zXScale(zScore)} y1="70" x2={zXScale(zScore)} y2="232" className="observed-line" />
                <text x="40" y="30" className="chart-caption">density</text>
                <text x={zXScale(zScore) + 10} y="62" className="axis-label">z = {formatNumber(zScore, 2)}</text>
              </svg>
            </section>

            <section className="content-card inset">
              <h3>Interpretation</h3>
              <div className="explanation-panel">
                <code>{hypothesisText}</code>
                <p className="strong-text">
                  Estimated lift = {formatEffect(activeScenario, diff)} with a {Math.round(confidenceLevel * 100)}% CI from {formatEffect(activeScenario, ciLow)} to {formatEffect(activeScenario, ciHigh)}.
                </p>
                <p>
                  The p-value is {formatPValue(pValue)}, so the result is <strong>{significant ? 'statistically significant' : 'not statistically significant'}</strong> at α = {alpha}. {actionText}
                </p>
                <p>
                  At the planned scale, the point estimate implies roughly {formatIncremental(activeScenario, incrementalImpact)} {activeScenario.kind === 'geo' ? activeScenario.rolloutLabel : activeScenario.rolloutLabel}.
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
                <span className="panel-label">Interpretation drill</span>
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
