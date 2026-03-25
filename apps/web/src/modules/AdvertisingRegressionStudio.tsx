import { useMemo, useState } from 'react'
import { ChoiceRow, MetricCard, ModuleHeader, Slider } from '../components/index.ts'
import {
  correlation,
  formatNumber,
  linearRegression,
  mean,
  multipleRegression,
  normalCdf,
  stdDev,
} from '../utils/math.ts'

type ScenarioKey = 'searchDemandControl' | 'retailMediaPromo' | 'frequencyRecall'

type ControlledScenario = {
  kind: 'controlled'
  label: string
  title: string
  description: string
  decisionMoment: string
  executiveQuestion: string
  xLabel: string
  controlLabel: string
  yLabel: string
  xUnit: 'usdK' | 'frequency'
  controlUnit: 'index' | 'pct'
  yUnit: 'count' | 'currency' | 'pctPoint'
  primarySlopeLabel: string
  controlSlopeLabel: string
  caution: string
  skills: string[]
  outputs: string[]
  guardrails: string[]
  readoutChecklist: string[]
  xs: number[]
  controls: number[]
  ys: number[]
  questions: Array<{ prompt: string; answer: string }>
}

type SimpleScenario = {
  kind: 'simple'
  label: string
  title: string
  description: string
  decisionMoment: string
  executiveQuestion: string
  xLabel: string
  yLabel: string
  xUnit: 'usdK' | 'frequency'
  yUnit: 'count' | 'currency' | 'pctPoint'
  slopeLabel: string
  caution: string
  skills: string[]
  outputs: string[]
  guardrails: string[]
  readoutChecklist: string[]
  xs: number[]
  ys: number[]
  questions: Array<{ prompt: string; answer: string }>
}

type Scenario = ControlledScenario | SimpleScenario

const scenarioOrder: ScenarioKey[] = ['searchDemandControl', 'retailMediaPromo', 'frequencyRecall']

const regressionScenarios: Record<ScenarioKey, Scenario> = {
  searchDemandControl: {
    kind: 'controlled',
    label: 'Search + Demand',
    title: 'Paid search spend with branded demand as a control',
    description:
      'A performance team is trying to estimate how much weekly paid search spend contributes after controlling for branded search demand, which tends to rise when underlying intent is already strong.',
    decisionMoment: 'The search lead needs a planning coefficient for the next budget revision without turning demand-driven weeks into fake incrementality.',
    executiveQuestion: 'How much of the observed order growth still belongs to search after existing branded demand is accounted for?',
    xLabel: 'weekly search spend',
    controlLabel: 'branded query index',
    yLabel: 'site orders',
    xUnit: 'usdK',
    controlUnit: 'index',
    yUnit: 'count',
    primarySlopeLabel: 'additional site orders per extra $1k of search spend, holding branded demand fixed',
    controlSlopeLabel: 'additional site orders per 1-point increase in branded query index',
    caution:
      'Naive spend-response lines can absorb demand that was already coming. A controlled coefficient is still not perfect causality, but it is often much less misleading than the raw slope.',
    skills: ['multiple regression', 'omitted-variable bias', 'coefficient interpretation', 'R² vs causality', 'residual thinking'],
    outputs: [
      'Compare the naive spend slope to the slope after controlling for branded demand.',
      'Estimate how much the business outcome moves when spend changes while demand is held constant.',
      'Explain why a strong uncontrolled line can still overstate incrementality.',
    ],
    guardrails: [
      'Use the adjusted coefficient for planning, not the raw bivariate slope.',
      'Do not turn a controlled coefficient into pure causal proof.',
      'Keep branded demand in the memo so stakeholders can see what changed the spend story.',
    ],
    readoutChecklist: [
      'State the naive and adjusted coefficients side by side.',
      'Explain what is being held fixed in the adjusted forecast.',
      'Call out the remaining confounding risk explicitly.',
    ],
    xs: [12, 14, 15, 18, 20, 22, 24, 26, 29, 31, 34, 36],
    controls: [58, 60, 63, 69, 72, 75, 79, 83, 87, 91, 95, 100],
    ys: [345, 356, 370, 402, 423, 438, 459, 482, 505, 526, 554, 584],
    questions: [
      {
        prompt: 'Why is the naive spend coefficient usually too flattering in this setup?',
        answer:
          'Because spend and branded demand rise together. If the model omits the demand signal, the spend coefficient absorbs some of the effect of existing consumer intent and looks more powerful than it should.',
      },
      {
        prompt: 'What does “holding branded demand fixed” actually mean in the controlled coefficient?',
        answer:
          'It means comparing weeks that have similar branded demand and asking how the predicted outcome changes with spend within that demand context. It is a partial effect, not a raw association.',
      },
      {
        prompt: 'Why still avoid calling the adjusted coefficient pure incrementality?',
        answer:
          'Because the control set is still incomplete. Useful confounders may remain, and the model structure itself may still be too simple. The coefficient is better, not magically causal.',
      },
    ],
  },
  retailMediaPromo: {
    kind: 'controlled',
    label: 'Retail Media + Promo',
    title: 'Retail media spend with discount depth as a control',
    description:
      'A retail media team is estimating new-to-brand orders from DSP video spend while controlling for discount depth, because promotions can make the media line look stronger than the underlying advertising effect really is.',
    decisionMoment: 'The retail media team needs a weekly planning model that does not confuse stronger promotions with stronger media.',
    executiveQuestion: 'After accounting for discount depth, how much useful response still appears tied to DSP video spend?',
    xLabel: 'weekly DSP video spend',
    controlLabel: 'average discount depth',
    yLabel: 'new-to-brand orders',
    xUnit: 'usdK',
    controlUnit: 'pct',
    yUnit: 'count',
    primarySlopeLabel: 'additional new-to-brand orders per extra $1k of DSP video spend, holding discount depth fixed',
    controlSlopeLabel: 'additional new-to-brand orders per extra discount point',
    caution:
      'Retail media often co-moves with promotions, merchandising, and retail events. Without controls, the spend coefficient can become a messy blend of media and offer strength.',
    skills: ['multiple regression', 'control variables', 'confounding by promotion', 'coefficient comparison', 'business interpretation'],
    outputs: [
      'Separate the media effect from the promotional effect in a weekly planning model.',
      'Show why media teams must control for merchandising variables before pitching a spend-response story.',
      'Translate the controlled coefficient into a defensible planning estimate for new-to-brand acquisition.',
    ],
    guardrails: [
      'Do not let promo-heavy weeks flatter the media coefficient.',
      'Keep the planning interpretation conditional on discount depth.',
      'Use the regression as a disciplined baseline, not a replacement for experiments.',
    ],
    readoutChecklist: [
      'Lead with the adjusted coefficient, not the inflated raw slope.',
      'Show what happens to the spend story when discount depth is included.',
      'Separate weekly planning usefulness from incrementality proof.',
    ],
    xs: [18, 20, 22, 24, 27, 29, 31, 34, 36, 39, 42, 45],
    controls: [8, 10, 10, 12, 14, 15, 18, 20, 20, 22, 24, 25],
    ys: [194, 206, 212, 241, 273, 289, 323, 356, 365, 393, 419, 445],
    questions: [
      {
        prompt: 'Why can promo depth make a media line look stronger than the true media effect?',
        answer:
          'Because promotions can lift conversion propensity independently of media. If bigger promotions tend to coincide with bigger media weeks, the naive slope will attribute too much of the outcome to spend.',
      },
      {
        prompt: 'What is the correct interpretation if the adjusted spend coefficient stays positive but shrinks a lot?',
        answer:
          'The media channel still appears useful, but part of the original raw relationship was really promo-driven. The controlled model is removing some of that contamination.',
      },
      {
        prompt: 'Why is this kind of model valuable even when experiments still matter?',
        answer:
          'Because planning teams still need disciplined baseline models for weekly decisions. Regression does not replace experiments, but it improves planning quality between experiments.',
      },
    ],
  },
  frequencyRecall: {
    kind: 'simple',
    label: 'Frequency -> Recall',
    title: 'Average frequency versus aided recall lift',
    description:
      'A brand measurement team is checking whether higher weekly average frequency is associated with stronger aided recall lift, while watching closely for signs that a straight line is too simple.',
    decisionMoment: 'The planner wants a rough response curve for next-quarter frequency targets, but the team needs to know whether a straight line is already too naive.',
    executiveQuestion: 'Does a linear summary help planning here, or is curvature already warning us not to extrapolate casually?',
    xLabel: 'average weekly frequency',
    yLabel: 'aided recall lift',
    xUnit: 'frequency',
    yUnit: 'pctPoint',
    slopeLabel: 'additional recall-lift points per extra average exposure',
    caution:
      'Frequency is useful to model, but response curves often bend. A linear slope can be a good local summary while still hiding diminishing returns at the upper end.',
    skills: ['simple regression', 'slope interpretation', 'R²', 'residuals', 'curvature and saturation'],
    outputs: [
      'Summarize the average relationship between frequency and brand lift over the observed range.',
      'Use residual patterns to decide whether a straight-line model is too simple.',
      'Communicate that “associated with” is not the same as “guaranteed causal response curve.”',
    ],
    guardrails: [
      'Use the line as an in-range summary, not a forever rule.',
      'Check the residual plot before trusting the slope operationally.',
      'Keep association language disciplined even when the fit looks clean.',
    ],
    readoutChecklist: [
      'State the slope in planning units.',
      'Translate R-squared as fit, not causality.',
      'Say whether the residuals support or challenge a straight-line summary.',
    ],
    xs: [1.2, 1.5, 1.8, 2.2, 2.5, 2.8, 3.1, 3.5, 3.9, 4.3, 4.8, 5.3],
    ys: [0.8, 1.1, 1.4, 1.9, 2.2, 2.3, 2.7, 3.2, 3.4, 3.5, 3.9, 4.2],
    questions: [
      {
        prompt: 'How should the planner interpret a positive slope here?',
        answer:
          'Over the observed frequency range, higher average exposure is associated with more aided recall lift on average. It is an average relationship inside the data, not a promise that the same gain continues forever.',
      },
      {
        prompt: 'What would a curved residual pattern mean in this context?',
        answer:
          'It would suggest the response curve bends, which is common in advertising because additional exposures often show diminishing returns after a point.',
      },
      {
        prompt: 'Why can this simple model still be useful if the real response curve is richer?',
        answer:
          'Because it provides a disciplined first summary of direction, rough scale, and fit. It helps the team decide whether a more flexible response model is worth building.',
      },
    ],
  },
}

function formatXValue(scenario: Scenario, value: number) {
  return scenario.xUnit === 'usdK' ? `$${value.toFixed(0)}k` : `${value.toFixed(1)}`
}

function formatControlValue(scenario: ControlledScenario, value: number) {
  return scenario.controlUnit === 'pct' ? `${value.toFixed(0)}%` : value.toFixed(0)
}

function formatYValue(scenario: Scenario, value: number) {
  if (scenario.yUnit === 'count') {
    return `${Math.round(value).toLocaleString('en-US')}`
  }
  if (scenario.yUnit === 'currency') {
    return `$${value.toFixed(2)}`
  }
  return `${value.toFixed(1)} pts`
}

function formatSlopeValue(scenario: Scenario, value: number) {
  if (scenario.yUnit === 'count') {
    return value.toFixed(2)
  }
  if (scenario.yUnit === 'currency') {
    return `$${value.toFixed(2)}`
  }
  return `${value.toFixed(2)} pts`
}

function formatPValue(value: number) {
  return value < 0.0001 ? '<0.0001' : value.toFixed(4)
}

function getRegressionVerdict(
  scenario: Scenario,
  primaryCoeff: number,
  primaryCILow: number,
  pValue: number,
  simpleSlope: number,
) {
  const controlledShrinkage =
    scenario.kind === 'controlled' && simpleSlope !== 0
      ? 1 - primaryCoeff / simpleSlope
      : 0

  if (primaryCILow > 0 && pValue < 0.05) {
    return {
      tone: 'strong',
      headline: 'Usable planning signal with a defensible positive coefficient',
      summary:
        scenario.kind === 'controlled' && controlledShrinkage > 0.2
          ? 'The controlled model still supports a positive planning effect, and the shrinkage from the naive slope is a useful warning about how much confounding was in the raw line.'
          : 'The coefficient remains positive across the interval and is strong enough to use as a disciplined planning input, subject to the usual model caveats.',
    }
  }
  if (primaryCoeff > 0) {
    return {
      tone: 'watch',
      headline: 'Directional coefficient, but the memo still needs caution',
      summary:
        'The coefficient leans positive, but the uncertainty or model risk is still substantial enough that the readout should stay provisional rather than triumphant.',
    }
  }
  return {
    tone: 'weak',
    headline: 'No strong planning coefficient yet',
    summary:
      'The current model does not support a confident positive planning story. The specification, data, or business use should be tightened before this is used aggressively.',
  }
}

export function AdvertisingRegressionStudio() {
  const [scenario, setScenario] = useState<ScenarioKey>('searchDemandControl')
  const [forecastPosition, setForecastPosition] = useState(50)
  const [showResiduals, setShowResiduals] = useState(false)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)

  const activeScenario = regressionScenarios[scenario]
  const xs = activeScenario.xs
  const ys = activeScenario.ys
  const questions = activeScenario.questions
  const activeQuestion = questions[activeQuestionIndex % questions.length]

  const simpleReg = useMemo(() => linearRegression(xs, ys), [xs, ys])
  const controlledReg = useMemo(
    () =>
      activeScenario.kind === 'controlled'
        ? multipleRegression(xs.map((value, index) => [value, activeScenario.controls[index]]), ys)
        : null,
    [activeScenario, xs, ys],
  )

  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const forecastX = xMin + ((xMax - xMin) * forecastPosition) / 100

  const meanControl = activeScenario.kind === 'controlled' ? mean(activeScenario.controls) : 0
  const adjustedPrimaryCoeff = activeScenario.kind === 'controlled' ? controlledReg?.coefficients[1] ?? 0 : simpleReg.slope
  const adjustedPrimarySE = activeScenario.kind === 'controlled' ? controlledReg?.standardErrors[1] ?? 0 : 0
  const adjustedControlCoeff = activeScenario.kind === 'controlled' ? controlledReg?.coefficients[2] ?? 0 : 0
  const adjustedIntercept = activeScenario.kind === 'controlled' ? controlledReg?.coefficients[0] ?? 0 : simpleReg.intercept
  const predictedOutcome =
    activeScenario.kind === 'controlled'
      ? adjustedIntercept + adjustedPrimaryCoeff * forecastX + adjustedControlCoeff * meanControl
      : simpleReg.intercept + simpleReg.slope * forecastX

  const adjustedResiduals = activeScenario.kind === 'controlled' ? controlledReg?.residuals ?? [] : simpleReg.residuals
  const adjustedPredicted = activeScenario.kind === 'controlled' ? controlledReg?.predicted ?? [] : simpleReg.predicted
  const adjustedRSquared = activeScenario.kind === 'controlled' ? controlledReg?.rSquared ?? 0 : simpleReg.rSquared
  const residualSD = stdDev(adjustedResiduals)

  const primaryZ = activeScenario.kind === 'controlled'
    ? adjustedPrimarySE === 0
      ? 0
      : adjustedPrimaryCoeff / adjustedPrimarySE
    : residualSD === 0 || xs.length < 3
      ? 0
      : (() => {
          const mx = mean(xs)
          const sxx = xs.reduce((sum, value) => sum + (value - mx) ** 2, 0)
          const residualSE = Math.sqrt(
            simpleReg.residuals.reduce((sum, value) => sum + value ** 2, 0) / Math.max(1, xs.length - 2),
          )
          const slopeSE = residualSE / Math.sqrt(sxx || 1)
          return slopeSE === 0 ? 0 : simpleReg.slope / slopeSE
        })()

  const primaryPValue = 2 * (1 - normalCdf(Math.abs(primaryZ)))
  const primaryCoeff = activeScenario.kind === 'controlled' ? adjustedPrimaryCoeff : simpleReg.slope
  const primarySE = activeScenario.kind === 'controlled'
    ? adjustedPrimarySE
    : (() => {
        const mx = mean(xs)
        const sxx = xs.reduce((sum, value) => sum + (value - mx) ** 2, 0)
        const residualSE = Math.sqrt(
          simpleReg.residuals.reduce((sum, value) => sum + value ** 2, 0) / Math.max(1, xs.length - 2),
        )
        return residualSE / Math.sqrt(sxx || 1)
      })()
  const primaryCILow = primaryCoeff - 1.96 * primarySE
  const primaryCIHigh = primaryCoeff + 1.96 * primarySE
  const verdict = getRegressionVerdict(activeScenario, primaryCoeff, primaryCILow, primaryPValue, simpleReg.slope)
  const coefficientShift =
    activeScenario.kind === 'controlled'
      ? simpleReg.slope === 0
        ? 0
        : 1 - adjustedPrimaryCoeff / simpleReg.slope
      : 0
  const recommendationLine =
    verdict.tone === 'strong'
      ? 'Use the model as a planning input, but keep the conditional interpretation and model risk in the writeup.'
      : verdict.tone === 'watch'
        ? 'Use the model only as a directional aid until the uncertainty or specification risk is reduced.'
        : 'Do not sell this model as a confident planning rule yet.'
  const residualRead =
    showResiduals
      ? 'Use the residual pattern to decide whether the current form is missing structure.'
      : 'Switch to the residual view to see whether the current form is hiding curvature or specification problems.'

  const xPad = (xMax - xMin) * 0.12 || 1
  const yMin = Math.min(...ys, ...adjustedPredicted)
  const yMax = Math.max(...ys, ...adjustedPredicted)
  const padY = (yMax - yMin) * 0.14 || 1
  const domainXLeft = xMin - xPad
  const domainXRight = xMax + xPad
  const domainYLow = yMin - padY
  const domainYHigh = yMax + padY
  const toSvgX = (value: number) => 72 + ((value - domainXLeft) / (domainXRight - domainXLeft || 1)) * 470
  const toSvgY = (value: number) => 228 - ((value - domainYLow) / (domainYHigh - domainYLow || 1)) * 180
  const residScale = Math.max(...adjustedResiduals.map((value) => Math.abs(value)), residualSD * 1.5, 1)
  const controlCut = activeScenario.kind === 'controlled' ? meanControl : 0
  const forecastSvgX = toSvgX(forecastX)
  const forecastSvgY = toSvgY(predictedOutcome)
  const residualBandTop = 140 - (residualSD / residScale) * 85
  const residualBandBottom = 140 + (residualSD / residScale) * 85

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Applied advertising"
          title="Regression that looks like real advertising planning work"
          description="This module moves beyond toy spend-response lines and into actual advertising modeling problems: confounding demand, promo controls, naive versus adjusted coefficients, and residual checks."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <ChoiceRow
              label="Project"
              options={scenarioOrder.map((key) => ({ label: regressionScenarios[key].label, value: key }))}
              value={scenario}
              onChange={(value) => {
                setScenario(value)
                setActiveQuestionIndex(0)
              }}
            />
            <Slider
              label="Planning value"
              value={forecastPosition}
              min={0}
              max={100}
              step={1}
              display={formatXValue(activeScenario, forecastX)}
              note={
                activeScenario.kind === 'controlled'
                  ? `Predictions hold ${activeScenario.controlLabel} at a typical value of ${formatControlValue(activeScenario, meanControl)}.`
                  : 'Move within the observed range to see the fitted prediction.'
              }
              onChange={setForecastPosition}
            />
            <div className="choice-row">
              <span>View</span>
              <div className="choice-buttons">
                <button type="button" className={`mini-choice ${!showResiduals ? 'active' : ''}`} onClick={() => setShowResiduals(false)}>
                  Fit
                </button>
                <button type="button" className={`mini-choice ${showResiduals ? 'active' : ''}`} onClick={() => setShowResiduals(true)}>
                  Residuals
                </button>
              </div>
            </div>
            <div className="explanation-panel">
              <span className="panel-label">Measurement brief</span>
              <p className="strong-text">{activeScenario.title}</p>
              <p>{activeScenario.description}</p>
              <p>{activeScenario.caution}</p>
            </div>
            <div className="signal-grid compact">
              <article className="signal-card">
                <span className="panel-label">Decision pressure</span>
                <strong>{activeScenario.executiveQuestion}</strong>
                <p>{activeScenario.decisionMoment}</p>
              </article>
              <article className="signal-card">
                <span className="panel-label">Model use</span>
                <strong>{showResiduals ? 'Residual diagnostics' : 'Planning fit view'}</strong>
                <p>{residualRead}</p>
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
              <span className="panel-label">Model call</span>
              <h3>{verdict.headline}</h3>
              <p>{verdict.summary}</p>
              <p>{activeScenario.decisionMoment}</p>
            </section>

            <div className="metric-strip wide">
              {activeScenario.kind === 'controlled' ? (
                <>
                  <MetricCard value={formatSlopeValue(activeScenario, simpleReg.slope)} label="naive spend slope" />
                  <MetricCard value={formatSlopeValue(activeScenario, adjustedPrimaryCoeff)} label="adjusted spend coefficient" />
                  <MetricCard value={formatSlopeValue(activeScenario, adjustedControlCoeff)} label={activeScenario.controlLabel} />
                  <MetricCard value={formatNumber(adjustedRSquared, 3)} label="adjusted model R²" />
                </>
              ) : (
                <>
                  <MetricCard value={formatSlopeValue(activeScenario, simpleReg.slope)} label="slope" />
                  <MetricCard value={formatNumber(simpleReg.intercept, 2)} label="intercept" />
                  <MetricCard value={formatNumber(simpleReg.rSquared, 3)} label="R²" />
                  <MetricCard value={formatNumber(residualSD, 2)} label="residual SD" />
                </>
              )}
            </div>

            <div className="metric-strip wide">
              {activeScenario.kind === 'controlled' ? (
                <>
                  <MetricCard value={formatPValue(primaryPValue)} label="adjusted coeff. p-value" />
                  <MetricCard value={`${formatSlopeValue(activeScenario, primaryCILow)} to ${formatSlopeValue(activeScenario, primaryCIHigh)}`} label="adjusted 95% CI" />
                  <MetricCard value={formatYValue(activeScenario, predictedOutcome)} label="predicted outcome" />
                  <MetricCard value={formatNumber(correlation(xs, ys), 3)} label="raw correlation r" />
                </>
              ) : (
                <>
                  <MetricCard value={formatNumber(correlation(xs, ys), 3)} label="correlation r" />
                  <MetricCard value={formatPValue(primaryPValue)} label="slope p-value" />
                  <MetricCard value={`${formatSlopeValue(activeScenario, primaryCILow)} to ${formatSlopeValue(activeScenario, primaryCIHigh)}`} label="slope 95% CI" />
                  <MetricCard value={formatYValue(activeScenario, predictedOutcome)} label="predicted outcome" />
                </>
              )}
            </div>

            <div className="signal-grid">
              <article className="signal-card">
                <span className="panel-label">Coefficient interval</span>
                <strong>{`${formatSlopeValue(activeScenario, primaryCILow)} to ${formatSlopeValue(activeScenario, primaryCIHigh)}`}</strong>
                <p>The 95% interval is the fast read on whether the planning coefficient stays comfortably positive.</p>
              </article>
              <article className="signal-card">
                <span className="panel-label">Forecast read</span>
                <strong>{formatYValue(activeScenario, predictedOutcome)}</strong>
                <p>
                  Predicted at {formatXValue(activeScenario, forecastX)}
                  {activeScenario.kind === 'controlled' ? ` with ${activeScenario.controlLabel} held at ${formatControlValue(activeScenario, meanControl)}` : ''}.
                </p>
              </article>
              {activeScenario.kind === 'controlled' ? (
                <article className="signal-card">
                  <span className="panel-label">Confounding adjustment</span>
                  <strong>{`${formatNumber(coefficientShift * 100, 1)}% shrink from naive slope`}</strong>
                  <p>A large drop after controls is a warning that the raw line was flattering the media story.</p>
                </article>
              ) : (
                <article className="signal-card">
                  <span className="panel-label">Fit caution</span>
                  <strong>{`R² = ${formatNumber(simpleReg.rSquared, 3)}`}</strong>
                  <p>Fit is useful, but it does not convert this into a guaranteed response curve.</p>
                </article>
              )}
              <article className="signal-card">
                <span className="panel-label">Evidence</span>
                <strong>{`p = ${formatPValue(primaryPValue)}`}</strong>
                <p>Use this as an evidence summary for the coefficient, not as a certainty machine.</p>
              </article>
            </div>

            <div className="two-up-grid">
              <section className="content-card inset">
                <h3>{showResiduals ? 'Residual plot' : 'Primary driver vs outcome'}</h3>
                <p>
                  {showResiduals
                    ? 'Residuals should bounce around zero without a pattern. Curves or funnels are warnings that the model is missing structure.'
                    : activeScenario.kind === 'controlled'
                      ? 'The dashed line is the naive fit. The solid line is the adjusted prediction at a typical control value. Point color shows lower versus higher control conditions.'
                      : 'The fitted line summarizes the average relationship in the observed data over the range shown.'}
                </p>
                <svg viewBox="0 0 620 280" className="chart-svg" role="img" aria-label={showResiduals ? 'Residual plot' : 'Regression chart'}>
                  <rect x="0" y="0" width="620" height="280" rx="24" className="chart-frame" />
                  {showResiduals ? (
                    <>
                      <rect x="72" y={residualBandTop} width="470" height={Math.max(residualBandBottom - residualBandTop, 0)} className="chart-band watch" rx="18" />
                      <line x1="72" y1="140" x2="542" y2="140" className="chart-grid-line emphasis" />
                      {xs.map((value, index) => (
                        <circle
                          key={`${value}-${index}`}
                          cx={toSvgX(value)}
                          cy={140 - (adjustedResiduals[index] / residScale) * 85}
                          r="4.5"
                          className={`chart-point ${Math.abs(adjustedResiduals[index]) <= residualSD ? 'good' : 'bad'}`}
                          strokeWidth="1.5"
                        />
                      ))}
                      <text x="474" y={residualBandTop - 8} className="axis-label">±1 residual SD</text>
                      <text x="26" y="30" className="chart-caption">residual</text>
                      <text x="490" y="245" className="axis-label">{activeScenario.xLabel}</text>
                    </>
                  ) : (
                    <>
                      <line x1="72" y1="228" x2="542" y2="228" className="chart-grid-line" />
                      <line x1="72" y1="42" x2="72" y2="228" className="chart-grid-line" />
                      <line x1="72" y1="138" x2="542" y2="138" className="chart-grid-line" />
                      <line x1={forecastSvgX} y1="42" x2={forecastSvgX} y2="228" className="chart-guide" />
                      <line x1="72" y1={forecastSvgY} x2={forecastSvgX} y2={forecastSvgY} className="chart-guide" />
                      <line
                        x1={toSvgX(domainXLeft)}
                        y1={toSvgY(simpleReg.intercept + simpleReg.slope * domainXLeft)}
                        x2={toSvgX(domainXRight)}
                        y2={toSvgY(simpleReg.intercept + simpleReg.slope * domainXRight)}
                        stroke="rgba(213,82,45,0.78)"
                        strokeWidth="2.5"
                        strokeDasharray="8 6"
                      />
                      <line
                        x1={toSvgX(domainXLeft)}
                        y1={toSvgY(
                          activeScenario.kind === 'controlled'
                            ? adjustedIntercept + adjustedPrimaryCoeff * domainXLeft + adjustedControlCoeff * meanControl
                            : simpleReg.intercept + simpleReg.slope * domainXLeft,
                        )}
                        x2={toSvgX(domainXRight)}
                        y2={toSvgY(
                          activeScenario.kind === 'controlled'
                            ? adjustedIntercept + adjustedPrimaryCoeff * domainXRight + adjustedControlCoeff * meanControl
                            : simpleReg.intercept + simpleReg.slope * domainXRight,
                        )}
                        stroke="rgba(47,123,166,0.92)"
                        strokeWidth="3"
                      />
                      {xs.map((value, index) => {
                        return (
                          <circle
                            key={`${value}-${index}`}
                            cx={toSvgX(value)}
                            cy={toSvgY(ys[index])}
                            r="4.5"
                            className={`chart-point ${activeScenario.kind === 'controlled' && activeScenario.controls[index] > controlCut ? 'variant' : 'control'}`}
                            strokeWidth="1.5"
                          />
                        )
                      })}
                      <circle cx={forecastSvgX} cy={forecastSvgY} r="7" className="chart-point focus" strokeWidth="2" />
                      <text x={forecastSvgX + 10} y={forecastSvgY - 8} className="axis-label">
                        {formatYValue(activeScenario, predictedOutcome)}
                      </text>
                      <text x="24" y="28" className="chart-caption">{activeScenario.yLabel}</text>
                      <text x="480" y="245" className="axis-label">{activeScenario.xLabel}</text>
                    </>
                  )}
                </svg>
                <div className="chart-legend">
                  {showResiduals ? (
                    <>
                      <span className="legend-chip"><span className="legend-swatch watch" />within ±1 residual SD</span>
                      <span className="legend-chip"><span className="legend-swatch bad" />large residual</span>
                      <span className="legend-chip"><span className="legend-swatch line guide" />zero residual</span>
                    </>
                  ) : activeScenario.kind === 'controlled' ? (
                    <>
                      <span className="legend-chip"><span className="legend-swatch line variant" />naive fit</span>
                      <span className="legend-chip"><span className="legend-swatch line control" />adjusted fit</span>
                      <span className="legend-chip"><span className="legend-swatch control" />lower control weeks</span>
                      <span className="legend-chip"><span className="legend-swatch variant" />higher control weeks</span>
                      <span className="legend-chip"><span className="legend-swatch guide" />forecast point</span>
                    </>
                  ) : (
                    <>
                      <span className="legend-chip"><span className="legend-swatch line control" />fitted line</span>
                      <span className="legend-chip"><span className="legend-swatch control" />observed weeks</span>
                      <span className="legend-chip"><span className="legend-swatch guide" />forecast point</span>
                    </>
                  )}
                </div>
              </section>

              <section className="content-card inset">
                <h3>{activeScenario.kind === 'controlled' ? 'Naive vs adjusted model' : 'Model summary'}</h3>
                <div className="explanation-panel">
                  {activeScenario.kind === 'controlled' ? (
                    <>
                      <code>Naive: ŷ = {formatNumber(simpleReg.intercept, 2)} + {formatNumber(simpleReg.slope, 3)}·x</code>
                      <code>Adjusted: ŷ = {formatNumber(adjustedIntercept, 2)} + {formatNumber(adjustedPrimaryCoeff, 3)}·x + {formatNumber(adjustedControlCoeff, 3)}·c</code>
                      <p className="strong-text">
                        The primary coefficient changes from {formatSlopeValue(activeScenario, simpleReg.slope)} in the naive model to {formatSlopeValue(activeScenario, adjustedPrimaryCoeff)} after controlling for {activeScenario.controlLabel}.
                      </p>
                      <p>
                        That adjusted coefficient means roughly {formatSlopeValue(activeScenario, adjustedPrimaryCoeff)} {activeScenario.primarySlopeLabel}.
                      </p>
                      <p>
                        The control coefficient is {formatSlopeValue(activeScenario, adjustedControlCoeff)} {activeScenario.controlSlopeLabel}.
                      </p>
                    </>
                  ) : (
                    <>
                      <code>ŷ = {formatNumber(simpleReg.intercept, 2)} + {formatNumber(simpleReg.slope, 3)}·x</code>
                      <p className="strong-text">
                        The fitted slope implies roughly {formatSlopeValue(activeScenario, simpleReg.slope)} {activeScenario.slopeLabel}.
                      </p>
                      <p>
                        R² = {formatNumber(simpleReg.rSquared, 3)}, so the line explains about {formatNumber(simpleReg.rSquared * 100, 1)}% of the observed variation in {activeScenario.yLabel}. That is a fit statement, not a causal guarantee.
                      </p>
                    </>
                  )}
                </div>
              </section>
            </div>

            <section className="content-card inset">
              <h3>Executive readout</h3>
              <div className="memo-grid">
                <div className="memo-card">
                  <span className="panel-label">Recommendation</span>
                  <p className="strong-text">{recommendationLine}</p>
                  <p>
                    The primary coefficient runs from {formatSlopeValue(activeScenario, primaryCILow)} to {formatSlopeValue(activeScenario, primaryCIHigh)} with p = {formatPValue(primaryPValue)}.
                  </p>
                  <p>
                    The fitted prediction at {formatXValue(activeScenario, forecastX)}
                    {activeScenario.kind === 'controlled' ? ` and ${formatControlValue(activeScenario, meanControl)} ${activeScenario.controlLabel}` : ''} is {formatYValue(activeScenario, predictedOutcome)}.
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
                    {activeScenario.kind === 'controlled'
                      ? 'The controlled model is usually the more honest planning read because it separates the media line from a competing driver moving at the same time.'
                      : 'The simple model is useful as a first summary, but the residuals still decide whether the line is credible enough to carry planning weight.'}
                  </p>
                  <p>
                    {activeScenario.kind === 'controlled'
                      ? `The coefficient shift from naive to adjusted is ${formatNumber(coefficientShift * 100, 1)}%, which helps show how much the raw line was absorbing from the omitted driver.`
                      : `R² = ${formatNumber(simpleReg.rSquared, 3)}, so the line explains about ${formatNumber(simpleReg.rSquared * 100, 1)}% of the observed variation in ${activeScenario.yLabel}. That is a fit statement, not a causal guarantee.`}
                  </p>
                  <p>{activeScenario.caution}</p>
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
