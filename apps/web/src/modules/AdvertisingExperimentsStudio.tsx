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

type ScenarioFrame = {
  label: string
  title: string
  description: string
  controlLabel: string
  variantLabel: string
  decisionMoment: string
  testUnit: string
  primaryMetric: string
  budgetLine: string
  executiveQuestion: string
  breakEvenEffect: number
  breakEvenLabel: string
  rolloutLabel: string
  skills: string[]
  outputs: string[]
  guardrails: string[]
  credibilityThreats: string[]
  readoutChecklist: string[]
  questions: Array<{ prompt: string; answer: string }>
}

type ProportionScenario = ScenarioFrame & {
  kind: 'proportion'
  nA: number
  nB: number
  rateA: number
  rateB: number
  rolloutVolume: number
}

type MeanScenario = ScenarioFrame & {
  kind: 'mean'
  nA: number
  nB: number
  meanA: number
  meanB: number
  sdA: number
  sdB: number
  rolloutVolume: number
}

type GeoScenario = ScenarioFrame & {
  kind: 'geo'
  preControl: number[]
  postControl: number[]
  preTreatment: number[]
  postTreatment: number[]
  unit: 'count' | 'currency' | 'pct'
  rolloutMultiplier: number
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
      'A growth team is deciding whether a holdout-based lift study is strong enough to support a larger lead-gen budget, not merely whether platform-attributed conversions look healthy.',
    controlLabel: 'Holdout',
    variantLabel: 'Exposed',
    decisionMoment: 'The VP of growth wants a finance-ready memo before approving the next monthly expansion tranche.',
    testUnit: 'User-randomized holdout on qualified-lead conversion',
    primaryMetric: 'Incremental qualified lead rate in percentage points',
    budgetLine: '$420k of monthly media expansion is on the table.',
    executiveQuestion: 'Is the measured lift big and credible enough to clear the CAC and payback model?',
    breakEvenEffect: 0.0018,
    breakEvenLabel: 'minimum lift required to clear the pipeline economics model',
    nA: 420000,
    nB: 423000,
    rateA: 0.0189,
    rateB: 0.0216,
    rolloutVolume: 5200000,
    rolloutLabel: 'incremental qualified leads at planned monthly audience scale',
    skills: ['difference in proportions', 'incrementality', 'commercial thresholds', 'confidence intervals', 'readout discipline'],
    outputs: [
      'Estimate incremental conversion rate instead of repeating platform-attributed conversion counts.',
      'Turn percentage-point lift into a planning range the revenue team can stress test.',
      'Separate a causal claim from a scale recommendation with explicit economic hurdles.',
    ],
    guardrails: [
      'Use the lower confidence bound as the downside planning case, not only the point estimate.',
      'Check whether holdout contamination or conversion lag could still flatter the readout.',
      'State the commercial hurdle before the team sees the winning headline.',
    ],
    credibilityThreats: [
      'Audience contamination or off-platform spillover that shrinks the true holdout contrast.',
      'Pipeline timing differences that make early reads look cleaner than mature conversion data.',
      'Budget or creative changes during the test window that changed more than exposure status.',
    ],
    readoutChecklist: [
      'Lead with absolute lift in percentage points.',
      'Translate the interval into downside, base, and upside incremental lead cases.',
      'Keep attributed conversions out of the causal proof section.',
    ],
    questions: [
      {
        prompt: 'Why is this a lift study and not just a reporting exercise on attributed conversions?',
        answer:
          'Because the decision is causal: what happened because ads ran? Attributed conversions can move with exposure while still overstating the true incremental contribution of the media.',
      },
      {
        prompt: 'Why can a statistically significant lift still be strategically weak?',
        answer:
          'Because significance only says the observed effect is hard to explain by random assignment noise. The incremental rate can still miss the CAC or payback hurdle and remain a weak scale case.',
      },
      {
        prompt: 'What is the correct business use of the confidence interval here?',
        answer:
          'Use it to bound plausible incremental lead outcomes under scale. The lower bound is the finance conversation, not an annoying footnote after the point estimate.',
      },
    ],
  },
  brandLiftSurvey: {
    kind: 'proportion',
    label: 'Brand Lift Survey',
    title: 'Survey-measured ad recall lift',
    description:
      'A brand team is reading exposed-versus-control survey results to decide whether a premium video campaign created a real upper-funnel signal worth funding again, without pretending it proved downstream sales.',
    controlLabel: 'Control survey',
    variantLabel: 'Exposed survey',
    decisionMoment: 'The brand lead needs a recommendation on whether to renew the streaming video flight next quarter.',
    testUnit: 'Exposed-versus-control brand lift survey',
    primaryMetric: 'Incremental ad recall rate in percentage points',
    budgetLine: '$1.1M in upper-funnel video budget is under review.',
    executiveQuestion: 'Did the campaign move the stated brand outcome by enough to justify another wave?',
    breakEvenEffect: 0.02,
    breakEvenLabel: 'minimum recall lift required to defend another premium brand wave',
    nA: 9400,
    nB: 9630,
    rateA: 0.147,
    rateB: 0.183,
    rolloutVolume: 1800000,
    rolloutLabel: 'incremental ad-recall-positive people in the target audience',
    skills: ['survey proportions', 'brand measurement', 'confidence intervals', 'decision-worthy lift', 'causal humility'],
    outputs: [
      'Estimate whether upper-funnel media moved the actual survey outcome being measured.',
      'Translate percentage-point lift into how many additional people likely show the target response.',
      'Protect the team from turning survey lift into fake certainty about sales lift.',
    ],
    guardrails: [
      'Treat the survey outcome as the causal outcome, not as automatic proof of downstream business lift.',
      'Watch respondent balance and nonresponse before celebrating a clean readout.',
      'Use interval width to judge whether the result is reusable for planning.',
    ],
    credibilityThreats: [
      'Question wording or survey-quality shifts that change the outcome itself.',
      'Exposure misclassification that blurs the contrast between cells.',
      'Small subgroup slicing that creates a story the sample cannot really support.',
    ],
    readoutChecklist: [
      'State the observed lift before any storytelling about brand momentum.',
      'Explicitly separate survey evidence from sales extrapolation.',
      'Ask whether the lower bound still supports another premium media wave.',
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
      'A measurement team is reading a matched-geo study because user-level holdouts were not operationally viable, and the media lead wants to know whether the incrementality case survives market noise.',
    controlLabel: 'Matched control geos',
    variantLabel: 'Treated geos',
    decisionMoment: 'Regional media managers want to nationalize the prospecting plan if the geo test is credible enough.',
    testUnit: 'Matched-geo difference-in-differences readout',
    primaryMetric: 'Incremental weekly qualified signups per geo after shared market movement is removed',
    budgetLine: 'National rollout depends on whether the test survives noisy market conditions.',
    executiveQuestion: 'Did treated markets move enough above the control-market counterfactual to justify broader rollout?',
    breakEvenEffect: 7.5,
    breakEvenLabel: 'minimum weekly incremental signups per geo needed to justify national scale',
    preControl: [242, 251, 260, 247, 255, 246, 258, 249, 263, 252, 257, 245],
    postControl: [246, 256, 264, 251, 259, 250, 263, 254, 268, 256, 262, 249],
    preTreatment: [244, 248, 261, 249, 257, 247, 259, 251, 265, 254, 255, 246],
    postTreatment: [259, 265, 278, 267, 273, 262, 276, 268, 282, 270, 271, 262],
    unit: 'count',
    rolloutMultiplier: 210,
    rolloutLabel: 'incremental weekly qualified signups if the treatment scaled nationally',
    skills: ['difference-in-differences', 'matched-market variance', 'counterfactual thinking', 'incrementality', 'geo-test discipline'],
    outputs: [
      'Estimate causal lift when the experiment randomizes by geography instead of user.',
      'Judge whether treated-market movement really beat what matched controls imply.',
      'Translate per-geo lift into a rollout range without hiding the volatility tax.',
    ],
    guardrails: [
      'Read change versus change, not treated levels versus control levels.',
      'Inspect pre-period stability before claiming the post-period gap is interpretable.',
      'Keep local promo shocks and distribution changes out of the causal blind spot.',
    ],
    credibilityThreats: [
      'Weak pre-period matching that inflates the noise floor before the test even begins.',
      'Local retail or pricing events that hit treated markets differently during the post period.',
      'Too few markets to distinguish a useful average effect from geographic noise.',
    ],
    readoutChecklist: [
      'Report the difference-in-differences estimate, not the raw post gap.',
      'Show the market count so stakeholders can see why precision changes.',
      'Translate the lift to rollout scale only after stating the volatility caveats.',
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
      'A merchandising and paid media team changed the landing experience and is testing whether value per session improved enough to justify permanent rollout before a promotion-heavy quarter.',
    controlLabel: 'Current experience',
    variantLabel: 'Merch-first layout',
    decisionMoment: 'The team wants to lock creative and landing-page templates before a major seasonal media push.',
    testUnit: 'Session-randomized value-per-session experiment',
    primaryMetric: 'Incremental revenue per session in dollars',
    budgetLine: 'The paid media plan assumes this landing-page change lifts post-click value enough to lower effective CAC.',
    executiveQuestion: 'Is the revenue-per-session lift strong enough to change the media plan, despite a noisy value metric?',
    breakEvenEffect: 0.35,
    breakEvenLabel: 'minimum revenue-per-session lift needed to change the media plan',
    nA: 12400,
    nB: 12380,
    meanA: 4.82,
    meanB: 5.31,
    sdA: 15.1,
    sdB: 15.8,
    rolloutVolume: 310000,
    rolloutLabel: 'incremental monthly revenue at current session volume',
    skills: ['difference in means', 'high-variance metrics', 'confidence intervals', 'commercial thresholds', 'risk-adjusted readouts'],
    outputs: [
      'Estimate whether the experience increased a noisy value metric enough to matter.',
      'Show how heavy variance weakens certainty even when the point estimate looks attractive.',
      'Keep the rollout memo honest when the economics hinge on the lower bound, not the mean alone.',
    ],
    guardrails: [
      'Do not let a positive mean difference hide a confidence interval that still brushes the commercial floor.',
      'Audit skew and large-order spikes before calling the lift stable.',
      'Keep promo imbalance and merchandising changes out of the treatment story.',
    ],
    credibilityThreats: [
      'A few high-value orders can flatter the mean if the metric is heavily skewed.',
      'Concurrent merchandising or pricing changes can leak into the measured lift.',
      'Short test windows can miss delayed conversion value and exaggerate uncertainty.',
    ],
    readoutChecklist: [
      'Lead with dollars per session, then scale to revenue impact.',
      'Show the commercial hurdle beside the interval, not after it.',
      'State clearly when the test is promising but still not finance-ready.',
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

function formatSignedRounded(value: number) {
  return `${value < 0 ? '-' : ''}${Math.round(Math.abs(value)).toLocaleString('en-US')}`
}

function formatIncremental(scenario: ExperimentScenario, value: number) {
  if (scenario.kind === 'mean') {
    return `${value < 0 ? '-' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`
  }
  if (scenario.kind === 'geo' && scenario.unit === 'currency') {
    return `${value < 0 ? '-' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`
  }
  return formatSignedRounded(value)
}

function formatPValue(value: number) {
  return value < 0.0001 ? '<0.0001' : value.toFixed(4)
}

function getImpactMultiplier(scenario: ExperimentScenario) {
  return scenario.kind === 'geo' ? scenario.rolloutMultiplier : scenario.rolloutVolume
}

function getVerdict(diff: number, ciLow: number, significant: boolean, breakEvenEffect: number) {
  if (ciLow >= breakEvenEffect) {
    return {
      tone: 'strong',
      headline: 'Scale candidate with downside protection',
      summary:
        'The lower confidence bound still clears the commercial hurdle, so the result is not only statistically credible but also economically usable in a conservative planning case.',
    }
  }
  if (significant && diff >= breakEvenEffect) {
    return {
      tone: 'watch',
      headline: 'Credible signal, but the commercial floor is still soft',
      summary:
        'The point estimate clears the business hurdle and the test is statistically positive, but the lower bound still dips below the economic floor. This is promising, not automatic.',
    }
  }
  if (diff > 0) {
    return {
      tone: 'watch',
      headline: 'Directional read, not an approval memo',
      summary:
        'The signal leans positive, but the interval still leaves too much room for a weak or zero outcome. The team should tighten the read before selling a rollout story.',
    }
  }
  return {
    tone: 'weak',
    headline: 'No defensible scale case yet',
    summary:
      'The current evidence does not support a positive rollout claim. Any commercial recommendation should stay in hold, redesign, or further-test mode.',
  }
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
    hypothesisText = `H0: p${activeScenario.variantLabel} = p${activeScenario.controlLabel} vs. H1: p${activeScenario.variantLabel} != p${activeScenario.controlLabel}`
    chartDomainMax = Math.max(metricA, metricB) * 1.35 || 1
    sliderDisplay = `${Math.round(scale * 100)}%`
    sliderNote = 'Scale traffic or respondent volume to see how the interval tightens before the business story changes.'
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
    hypothesisText = `H0: mu${activeScenario.variantLabel} = mu${activeScenario.controlLabel} vs. H1: mu${activeScenario.variantLabel} != mu${activeScenario.controlLabel}`
    chartDomainMax = Math.max(metricA, metricB) * 1.35 || 1
    sliderDisplay = `${Math.round(scale * 100)}%`
    sliderNote = 'Scale eligible session volume to see how a noisy value metric fights back against premature certainty.'
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
    hypothesisText = `H0: delta${activeScenario.variantLabel} = delta${activeScenario.controlLabel} vs. H1: delta${activeScenario.variantLabel} != delta${activeScenario.controlLabel}`
    chartDomainMax = Math.max(geoPreControl, geoPostControl, geoPreTreatment, geoPostTreatment) * 1.25 || 1
    sliderDisplay = `${pairCount} pairs`
    sliderNote = 'Use more or fewer matched geo pairs to see how market count changes the credibility of the rollout memo.'
  }

  const zScore = testStandardError === 0 ? 0 : diff / testStandardError
  const pValue = 2 * (1 - normalCdf(Math.abs(zScore)))
  const ciLow = diff - zCritical * standardError
  const ciHigh = diff + zCritical * standardError
  const significant = pValue < alpha
  const alphaCutoff = confidenceLookup[1 - alpha]
  const verdict = getVerdict(diff, ciLow, significant, activeScenario.breakEvenEffect)
  const impactMultiplier = getImpactMultiplier(activeScenario)
  const pointImpact = diff * impactMultiplier
  const lowImpact = ciLow * impactMultiplier
  const highImpact = ciHigh * impactMultiplier
  const hurdleImpact = activeScenario.breakEvenEffect * impactMultiplier

  const barHeight = (value: number) => (value / chartDomainMax) * 150
  const ciDomainLeft = Math.min(ciLow, activeScenario.breakEvenEffect, 0, diff) - Math.abs(diff || 1) * 0.7 - standardError * 2
  const ciDomainRight =
    Math.max(ciHigh, activeScenario.breakEvenEffect, 0, diff) + Math.abs(diff || 1) * 0.7 + standardError * 2
  const ciScale = (value: number) => 70 + ((value - ciDomainLeft) / (ciDomainRight - ciDomainLeft || 1)) * 480

  const zDomainLeft = -4
  const zDomainRight = 4
  const densityPoints = Array.from({ length: 121 }, (_, index) => {
    const x = zDomainLeft + ((zDomainRight - zDomainLeft) * index) / 120
    return { x, y: normalPdf(x) }
  })
  const zXScale = (value: number) => 70 + ((value - zDomainLeft) / (zDomainRight - zDomainLeft)) * 500
  const zYScale = (value: number) => 232 - (value / 0.4) * 165

  const intervalRead =
    ciLow > activeScenario.breakEvenEffect
      ? 'Even the downside case clears the business hurdle.'
      : ciLow > 0
        ? 'The interval stays positive, but the downside case still misses the commercial hurdle.'
        : diff > 0
          ? 'The estimate leans positive, but zero or weak lift is still live.'
          : 'The interval does not support a positive story.'

  const recommendationLine =
    verdict.tone === 'strong'
      ? 'Recommend scale with measurement guardrails intact and the downside case explicitly written into the plan.'
      : verdict.tone === 'watch'
        ? 'Recommend either a limited scale step or more evidence before the team writes a full-budget approval memo.'
        : 'Recommend hold, redesign, or more testing rather than treating this as incrementality proof.'

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Applied advertising"
          title="Experiment readouts that sound like serious media science"
          description="This module now treats lift studies the way measurement teams actually defend them: with economic thresholds, validity threats, downside planning cases, and tighter language about what the evidence really supports."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <ChoiceRow
              label="Project"
              options={scenarioOrder.map((key) => ({ label: experimentScenarios[key].label, value: key }))}
              value={scenario}
              onChange={(value) => {
                setScenario(value)
                setActiveQuestionIndex(0)
              }}
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
              label="Significance level a"
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

            <div className="signal-grid compact">
              <article className="signal-card">
                <span className="panel-label">Test design</span>
                <strong>{activeScenario.testUnit}</strong>
                <p>{activeScenario.primaryMetric}</p>
              </article>
              <article className="signal-card">
                <span className="panel-label">Decision pressure</span>
                <strong>{activeScenario.executiveQuestion}</strong>
                <p>{activeScenario.budgetLine}</p>
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
              <h3>What the team ships</h3>
              <ul className="syllabus-list">
                {activeScenario.outputs.map((output) => (
                  <li key={output}>{output}</li>
                ))}
              </ul>
            </section>
          </aside>

          <div className="module-content">
            <section className={`decision-banner ${verdict.tone}`}>
              <span className="panel-label">Readout call</span>
              <h3>{verdict.headline}</h3>
              <p>{verdict.summary}</p>
              <p>{activeScenario.decisionMoment}</p>
            </section>

            <div className="metric-strip wide">
              <MetricCard value={formatPrimaryMetric(activeScenario, metricA)} label={activeScenario.controlLabel} />
              <MetricCard value={formatPrimaryMetric(activeScenario, metricB)} label={activeScenario.variantLabel} />
              <MetricCard value={formatEffect(activeScenario, diff)} label="estimated lift" />
              <MetricCard value={formatEffect(activeScenario, activeScenario.breakEvenEffect)} label="commercial hurdle" />
            </div>

            <div className="metric-strip wide">
              <MetricCard value={formatPValue(pValue)} label="two-sided p-value" />
              <MetricCard value={formatEffect(activeScenario, ciLow)} label="CI lower bound" />
              <MetricCard value={formatIncremental(activeScenario, pointImpact)} label="scaled point case" />
              <MetricCard value={formatIncremental(activeScenario, lowImpact)} label="downside planning case" />
            </div>

            <div className="signal-grid">
              <article className="signal-card">
                <span className="panel-label">Economic gate</span>
                <strong>{formatEffect(activeScenario, activeScenario.breakEvenEffect)}</strong>
                <p>{activeScenario.breakEvenLabel}</p>
              </article>
              <article className="signal-card">
                <span className="panel-label">Interval read</span>
                <strong>{intervalRead}</strong>
                <p>
                  The hurdle-equivalent rollout case is roughly {formatIncremental(activeScenario, hurdleImpact)}{' '}
                  {activeScenario.rolloutLabel}.
                </p>
              </article>
              <article className="signal-card">
                <span className="panel-label">Relative lift</span>
                <strong>{formatPct(relativeLift)}</strong>
                <p>Useful for scale context, but the absolute lift and commercial hurdle should drive the decision memo.</p>
              </article>
              <article className="signal-card">
                <span className="panel-label">Hypothesis</span>
                <strong>{significant ? 'Reject H0 at chosen a' : 'Fail to reject H0 at chosen a'}</strong>
                <p>{hypothesisText}</p>
              </article>
            </div>

            <div className="two-up-grid">
              <section className="content-card inset">
                <h3>{activeScenario.kind === 'geo' ? 'Pre/post market means' : 'Observed performance'}</h3>
                <p>
                  {activeScenario.kind === 'geo'
                    ? 'This readout is judged on change versus change. The question is whether treated markets moved more than matched controls would have predicted.'
                    : 'The group summaries are simple on purpose. The mean or rate may barely move while the credibility of the rollout memo changes a lot with more evidence.'}
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
                <h3>Lift versus the commercial hurdle</h3>
                <p>
                  The confidence interval is the range of lift values still plausible under repeated sampling. The hurdle line marks the minimum effect that actually changes the business decision.
                </p>
                <svg viewBox="0 0 620 280" className="chart-svg" role="img" aria-label="Confidence interval for lift">
                  <rect x="0" y="0" width="620" height="280" rx="24" className="chart-frame" />
                  <line x1={ciScale(0)} y1="55" x2={ciScale(0)} y2="225" stroke="rgba(19,34,71,0.2)" strokeWidth="2" strokeDasharray="6 6" />
                  <line x1={ciScale(activeScenario.breakEvenEffect)} y1="55" x2={ciScale(activeScenario.breakEvenEffect)} y2="225" className="critical-line" />
                  <line x1={ciScale(ciLow)} y1="145" x2={ciScale(ciHigh)} y2="145" className={`interval-line ${ciLow <= 0 && ciHigh >= 0 ? 'miss' : 'good'}`} />
                  <circle cx={ciScale(diff)} cy="145" r="8" className={`interval-point ${ciLow <= 0 && ciHigh >= 0 ? 'miss' : 'good'}`} />
                  <text x={ciScale(0) + 8} y="48" className="axis-label">zero lift</text>
                  <text x={ciScale(activeScenario.breakEvenEffect) + 8} y="64" className="axis-label">hurdle</text>
                  <text x={ciScale(diff) + 10} y="136" className="axis-label">{formatEffect(activeScenario, diff)}</text>
                  <text x="26" y="28" className="chart-caption">lift</text>
                  <text x="70" y="240" className="axis-label">{formatEffect(activeScenario, ciDomainLeft)}</text>
                  <text x="500" y="240" className="axis-label">{formatEffect(activeScenario, ciDomainRight)}</text>
                </svg>
              </section>
            </div>

            <section className="content-card inset">
              <h3>Null model and p-value</h3>
              <p>
                The null curve exists to discipline the evidence claim. It tells you how surprising the observed statistic is if true lift were zero, but it is not the commercial story by itself.
              </p>
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
              <h3>Executive readout</h3>
              <div className="memo-grid">
                <div className="memo-card">
                  <span className="panel-label">Recommendation</span>
                  <p className="strong-text">{recommendationLine}</p>
                  <p>
                    Estimated lift = {formatEffect(activeScenario, diff)} with a {Math.round(confidenceLevel * 100)}% CI from {formatEffect(activeScenario, ciLow)} to {formatEffect(activeScenario, ciHigh)}.
                  </p>
                  <p>
                    At planned scale, the point case is about {formatIncremental(activeScenario, pointImpact)} {activeScenario.rolloutLabel}, with a downside case of {formatIncremental(activeScenario, lowImpact)} and an upside case of {formatIncremental(activeScenario, highImpact)}.
                  </p>
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
                <h3>Threats that can fake lift</h3>
                <ul className="syllabus-list signal-list">
                  {activeScenario.credibilityThreats.map((threat) => (
                    <li key={threat}>{threat}</li>
                  ))}
                </ul>
              </section>

              <section className="content-card inset">
                <h3>Readout checklist</h3>
                <ul className="syllabus-list signal-list">
                  {activeScenario.readoutChecklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
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
