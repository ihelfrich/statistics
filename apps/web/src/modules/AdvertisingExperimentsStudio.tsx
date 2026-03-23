import { useState } from 'react'
import { ChoiceRow, MetricCard, ModuleHeader, Slider } from '../components/index.ts'
import {
  buildPolyline,
  formatNumber,
  formatPct,
  normalCdf,
  normalPdf,
} from '../utils/math.ts'

type ScenarioKey = 'creativeCtr' | 'landingPageCvr' | 'revenuePerSession'

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
  questions: Array<{ prompt: string; answer: string }>
}

type ExperimentScenario = ProportionScenario | MeanScenario

const confidenceLookup: Record<number, number> = {
  0.9: 1.645,
  0.95: 1.96,
  0.99: 2.576,
}

const alphaOptions = [0.1, 0.05, 0.01]
const confidenceOptions = [0.9, 0.95, 0.99]

const scenarioOrder: ScenarioKey[] = ['creativeCtr', 'landingPageCvr', 'revenuePerSession']

const experimentScenarios: Record<ScenarioKey, ExperimentScenario> = {
  creativeCtr: {
    kind: 'proportion',
    label: 'Creative CTR',
    title: 'Creative A/B test on click-through rate',
    description:
      'A paid social team is deciding whether a new opening hook should replace the current creative in a prospecting campaign with millions of impressions at stake.',
    controlLabel: 'Current cut',
    variantLabel: 'New hook',
    nA: 240000,
    nB: 238000,
    rateA: 0.0114,
    rateB: 0.0127,
    rolloutVolume: 2400000,
    rolloutLabel: 'incremental monthly clicks if rolled out',
    skills: ['difference in proportions', 'p-values', 'confidence intervals', 'lift vs significance', 'power'],
    questions: [
      {
        prompt: 'What does a p-value of 0.03 mean here?',
        answer:
          'It means that if the two creatives truly had the same CTR, a difference this large or larger would occur only about 3% of the time from random assignment noise alone. It is not the probability that the variant is “true.”',
      },
      {
        prompt: 'Why should the team still care about effect size even when the p-value is small?',
        answer:
          'Because statistical significance answers whether the data are hard to explain under the null, not whether the lift is large enough to matter financially or operationally.',
      },
      {
        prompt: 'If the confidence interval excludes zero but is narrow, what operational advantage does that give the marketer?',
        answer:
          'It means the team has both directional confidence and a tighter estimate of the likely lift range, which makes forecasting and rollout planning more defensible.',
      },
    ],
  },
  landingPageCvr: {
    kind: 'proportion',
    label: 'Landing CVR',
    title: 'Post-click landing page test on conversion rate',
    description:
      'A performance marketer is testing a shorter product page and wants to know whether the higher conversion rate is real enough to deploy before a high-spend promotion.',
    controlLabel: 'Current page',
    variantLabel: 'Short-form page',
    nA: 18400,
    nB: 18320,
    rateA: 0.036,
    rateB: 0.0419,
    rolloutVolume: 92000,
    rolloutLabel: 'incremental monthly orders if rolled out',
    skills: ['difference in proportions', 'confidence intervals', 'practical significance', 'power', 'sampling variability'],
    questions: [
      {
        prompt: 'Why is this a proportions problem rather than a means problem?',
        answer:
          'Because the core outcome is binary at the session level: each visit either converts or does not convert. The natural statistic is a conversion proportion, not a continuous mean.',
      },
      {
        prompt: 'If the test is significant but the lower CI bound is very close to zero, how should the marketer describe the result?',
        answer:
          'They should say the page is likely better, but the worst plausible lift is still modest. The evidence supports rollout, but expectations should remain disciplined.',
      },
      {
        prompt: 'How does increasing traffic affect the interval width if the observed rates stay the same?',
        answer:
          'More traffic reduces the standard error, so the confidence interval narrows and the p-value typically falls. Precision improves even if the estimated lift does not change.',
      },
    ],
  },
  revenuePerSession: {
    kind: 'mean',
    label: 'Revenue / Session',
    title: 'Average revenue per session test',
    description:
      'An ecommerce team changed the product page layout and is testing whether average revenue per session increases enough to justify a permanent rollout.',
    controlLabel: 'Current experience',
    variantLabel: 'Merch-first layout',
    nA: 12400,
    nB: 12380,
    meanA: 4.82,
    meanB: 5.31,
    sdA: 15.1,
    sdB: 15.8,
    rolloutVolume: 310000,
    rolloutLabel: 'incremental monthly revenue if rolled out',
    skills: ['difference in means', 'high variance metrics', 'confidence intervals', 'p-values', 'business impact'],
    questions: [
      {
        prompt: 'Why can a mean-based test require a lot of traffic even when the lift looks useful in dollars?',
        answer:
          'Revenue per session is noisy and often right-skewed. Large variance inflates the standard error, so the test needs more observations to distinguish a real lift from noise.',
      },
      {
        prompt: 'If the average lift is positive but the CI still includes zero, what is the correct interpretation?',
        answer:
          'The observed data lean positive, but the evidence is still compatible with no true effect. The team should avoid claiming a confirmed win until uncertainty narrows.',
      },
      {
        prompt: 'Why should the advertiser separate “average revenue per session” from “conversion rate” in interpretation?',
        answer:
          'Because a revenue lift can come from higher order values, a different product mix, or a different conversion rate. The mean summarizes outcome value, but it does not reveal the mechanism.',
      },
    ],
  },
}

function formatPrimaryMetric(scenario: ExperimentScenario, value: number) {
  return scenario.kind === 'proportion' ? formatPct(value) : `$${value.toFixed(2)}`
}

function formatEffect(scenario: ExperimentScenario, value: number) {
  return scenario.kind === 'proportion' ? `${(value * 100).toFixed(2)} pp` : `$${value.toFixed(2)}`
}

function formatIncremental(scenario: ExperimentScenario, value: number) {
  if (scenario.kind === 'proportion') {
    return `${Math.round(value).toLocaleString('en-US')}`
  }
  return `$${Math.round(value).toLocaleString('en-US')}`
}

function formatPValue(value: number) {
  return value < 0.0001 ? '<0.0001' : value.toFixed(4)
}

export function AdvertisingExperimentsStudio() {
  const [scenario, setScenario] = useState<ScenarioKey>('creativeCtr')
  const [sampleScale, setSampleScale] = useState(100)
  const [alpha, setAlpha] = useState(0.05)
  const [confidenceLevel, setConfidenceLevel] = useState(0.95)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)

  const activeScenario = experimentScenarios[scenario]
  const scale = sampleScale / 100
  const zCritical = confidenceLookup[confidenceLevel]
  const questions = activeScenario.questions
  const activeQuestion = questions[activeQuestionIndex % questions.length]

  let metricA = 0
  let metricB = 0
  let nA = 0
  let nB = 0
  let diff = 0
  let standardError = 0
  let testStandardError = 0
  let hypothesisText = ''

  if (activeScenario.kind === 'proportion') {
    nA = Math.max(1000, Math.round(activeScenario.nA * scale))
    nB = Math.max(1000, Math.round(activeScenario.nB * scale))
    const successesA = Math.round(nA * activeScenario.rateA)
    const successesB = Math.round(nB * activeScenario.rateB)
    metricA = successesA / nA
    metricB = successesB / nB
    diff = metricB - metricA
    const pooledRate = (successesA + successesB) / (nA + nB)
    standardError = Math.sqrt((metricA * (1 - metricA)) / nA + (metricB * (1 - metricB)) / nB)
    testStandardError = Math.sqrt(pooledRate * (1 - pooledRate) * ((1 / nA) + (1 / nB)))
    hypothesisText = `H₀: p${activeScenario.variantLabel} = p${activeScenario.controlLabel} vs. H₁: p${activeScenario.variantLabel} ≠ p${activeScenario.controlLabel}`
  } else {
    nA = Math.max(250, Math.round(activeScenario.nA * scale))
    nB = Math.max(250, Math.round(activeScenario.nB * scale))
    metricA = activeScenario.meanA
    metricB = activeScenario.meanB
    diff = metricB - metricA
    standardError = Math.sqrt((activeScenario.sdA ** 2) / nA + (activeScenario.sdB ** 2) / nB)
    testStandardError = standardError
    hypothesisText = `H₀: μ${activeScenario.variantLabel} = μ${activeScenario.controlLabel} vs. H₁: μ${activeScenario.variantLabel} ≠ μ${activeScenario.controlLabel}`
  }

  const zScore = testStandardError === 0 ? 0 : diff / testStandardError
  const pValue = 2 * (1 - normalCdf(Math.abs(zScore)))
  const ciLow = diff - zCritical * standardError
  const ciHigh = diff + zCritical * standardError
  const relativeLift = metricA === 0 ? 0 : diff / metricA
  const observedEffect = testStandardError === 0 ? 0 : diff / testStandardError
  const alphaCutoff = confidenceLookup[1 - alpha]
  const power =
    (1 - normalCdf(alphaCutoff - observedEffect)) + normalCdf(-alphaCutoff - observedEffect)
  const incrementalImpact = diff * activeScenario.rolloutVolume
  const significant = pValue < alpha

  const barDomainMax = Math.max(metricA, metricB) * 1.3 || 1
  const barHeight = (value: number) => (value / barDomainMax) * 150

  const ciDomainLeft = Math.min(ciLow, 0, diff) - Math.abs(diff || 1) * 0.7 - standardError * 2
  const ciDomainRight = Math.max(ciHigh, 0, diff) + Math.abs(diff || 1) * 0.7 + standardError * 2
  const ciScale = (value: number) => 70 + ((value - ciDomainLeft) / (ciDomainRight - ciDomainLeft)) * 480

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
      ? 'The variant is credibly better than control at the chosen alpha level. A rollout is defensible if the operational tradeoffs also check out.'
      : diff > 0
        ? 'The estimate is directionally positive, but uncertainty still matters. This is evidence, not permission to ignore risk.'
        : 'The current data do not support a positive lift. The team should not describe this as a win.'

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Applied advertising"
          title="Interpret experiments the way an ad team should"
          description="These scenarios force the real decisions: proportions vs means, p-values vs effect sizes, confidence intervals, power, and whether a result is worth rolling out."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <ChoiceRow
              label="Scenario"
              options={scenarioOrder.map((key) => ({ label: experimentScenarios[key].label, value: key }))}
              value={scenario}
              onChange={setScenario}
            />
            <Slider
              label="Sample size"
              value={sampleScale}
              min={50}
              max={200}
              step={5}
              display={`${sampleScale}%`}
              note="Scale traffic or survey volume to see precision change."
              onChange={(value) => setSampleScale(Math.round(value))}
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
              <span className="panel-label">Business setup</span>
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
          </aside>

          <div className="module-content">
            <div className="metric-strip wide">
              <MetricCard value={formatPrimaryMetric(activeScenario, metricA)} label={activeScenario.controlLabel} />
              <MetricCard value={formatPrimaryMetric(activeScenario, metricB)} label={activeScenario.variantLabel} />
              <MetricCard value={formatEffect(activeScenario, diff)} label="absolute lift" />
              <MetricCard value={formatPct(relativeLift)} label="relative lift" />
            </div>
            <div className="metric-strip wide">
              <MetricCard value={formatPValue(pValue)} label="two-sided p-value" />
              <MetricCard value={formatNumber(zScore, 2)} label="z statistic" />
              <MetricCard value={formatPct(power)} label="approx. power" />
              <MetricCard value={significant ? 'Reject H₀' : 'Fail to reject H₀'} label="decision" />
            </div>

            <div className="two-up-grid">
              <section className="content-card inset">
                <h3>Observed performance</h3>
                <p>The bars show the observed group summaries after scaling the traffic. The numbers move only a little, but the uncertainty around them changes a lot with sample size.</p>
                <svg viewBox="0 0 620 280" className="chart-svg" role="img" aria-label="Experiment results">
                  <rect x="0" y="0" width="620" height="280" rx="24" className="chart-frame" />
                  <line x1="80" y1="225" x2="540" y2="225" stroke="rgba(19,34,71,0.12)" strokeWidth="1" />
                  <rect x="150" y={225 - barHeight(metricA)} width="120" height={barHeight(metricA)} className="bar-rect" rx="10" />
                  <rect x="350" y={225 - barHeight(metricB)} width="120" height={barHeight(metricB)} className="hist-bar" rx="10" />
                  <text x="170" y="248" className="axis-label">{activeScenario.controlLabel}</text>
                  <text x="372" y="248" className="axis-label">{activeScenario.variantLabel}</text>
                  <text x="168" y={215 - barHeight(metricA)} className="axis-label">{formatPrimaryMetric(activeScenario, metricA)}</text>
                  <text x="368" y={215 - barHeight(metricB)} className="axis-label">{formatPrimaryMetric(activeScenario, metricB)}</text>
                  <text x="26" y="28" className="chart-caption">{activeScenario.kind === 'proportion' ? 'rate' : 'mean value'}</text>
                </svg>
              </section>

              <section className="content-card inset">
                <h3>Lift with confidence interval</h3>
                <p>The point is the estimated lift. The interval is the range of effect sizes still plausible under repeated sampling at the chosen confidence level.</p>
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
                  The p-value is {formatPValue(pValue)}, so the result is <strong>{significant ? 'statistically significant' : 'not statistically significant'}</strong> at α = {alpha}.
                  {` ${actionText}`}
                </p>
                <p>
                  If rolled out at the current scale, the estimate implies roughly {formatIncremental(activeScenario, incrementalImpact)} {activeScenario.rolloutLabel}.
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
