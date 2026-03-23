import { useMemo, useState } from 'react'
import { ChoiceRow, MetricCard, ModuleHeader, Slider } from '../components/index.ts'
import {
  correlation,
  formatNumber,
  linearRegression,
  mean,
  normalCdf,
  stdDev,
} from '../utils/math.ts'

type ScenarioKey = 'paidSocialLeads' | 'searchOrders' | 'frequencyLift'

type Scenario = {
  label: string
  title: string
  description: string
  xLabel: string
  yLabel: string
  xUnit: 'usdK' | 'frequency'
  yUnit: 'count' | 'pctPoint'
  slopeLabel: string
  caution: string
  skills: string[]
  xs: number[]
  ys: number[]
  questions: Array<{ prompt: string; answer: string }>
}

const scenarioOrder: ScenarioKey[] = ['paidSocialLeads', 'searchOrders', 'frequencyLift']

const regressionScenarios: Record<ScenarioKey, Scenario> = {
  paidSocialLeads: {
    label: 'Social -> Leads',
    title: 'Weekly paid social spend vs. qualified leads',
    description:
      'A B2B demand generation team is using a simple spend-response model to estimate how many qualified leads additional paid social budget tends to create each week.',
    xLabel: 'weekly spend',
    yLabel: 'qualified leads',
    xUnit: 'usdK',
    yUnit: 'count',
    slopeLabel: 'additional qualified leads per extra $1k of spend',
    caution:
      'Budget may be correlated with seasonality, offer quality, or sales pressure. A strong slope is useful, but it is not automatic proof of pure causality.',
    skills: ['scatterplots', 'slope interpretation', 'R²', 'residuals', 'extrapolation risk'],
    xs: [22, 24, 27, 30, 34, 36, 40, 45, 50, 55, 60, 66],
    ys: [131, 142, 155, 164, 177, 187, 202, 216, 237, 246, 268, 283],
    questions: [
      {
        prompt: 'If the fitted slope is 3.4, what is the correct advertising interpretation?',
        answer:
          'Within the observed spend range, the model estimates about 3.4 additional qualified leads for each extra $1k in weekly spend on average. It is an average local relationship, not a guaranteed marginal return at every budget level.',
      },
      {
        prompt: 'Why does a high R² still not settle the causality question?',
        answer:
          'Because R² measures fit, not identification. Spend can rise during strong demand periods, so omitted variables can make the relationship look cleaner than the true causal effect.',
      },
      {
        prompt: 'Why should the manager avoid forecasting far beyond the highest observed spend?',
        answer:
          'Because the fitted line is only supported by the observed data range. Above that range, diminishing returns or auction saturation can break the linear pattern quickly.',
      },
    ],
  },
  searchOrders: {
    label: 'Search -> Orders',
    title: 'Brand search spend vs. attributed orders',
    description:
      'A retail performance marketer wants a disciplined read on how weekly search spend lines up with attributed order volume before setting the next quarter budget.',
    xLabel: 'weekly search spend',
    yLabel: 'attributed orders',
    xUnit: 'usdK',
    yUnit: 'count',
    slopeLabel: 'additional attributed orders per extra $1k of search spend',
    caution:
      'Search spend often rises when underlying demand is already strong, so attribution-heavy relationships can overstate the true incremental effect.',
    skills: ['correlation vs causation', 'fitted lines', 'residual inspection', 'forecasting', 'model limits'],
    xs: [18, 21, 25, 28, 30, 35, 39, 42, 46, 50, 54, 58],
    ys: [291, 308, 324, 343, 339, 370, 389, 401, 419, 438, 456, 472],
    questions: [
      {
        prompt: 'What does the intercept mean in this model, and why should a marketer be careful with it?',
        answer:
          'The intercept is the model’s predicted order count at zero spend. It is mathematically necessary, but it may not be operationally meaningful if zero spend sits outside the relevant data regime.',
      },
      {
        prompt: 'If one week has a large positive residual, what does that mean?',
        answer:
          'That week produced more orders than the line predicted at its spend level. Something else likely helped performance, such as stronger branded demand, promotion timing, or inventory mix.',
      },
      {
        prompt: 'How should the team use the model without overselling it?',
        answer:
          'Use it as a disciplined baseline for planning and for asking better questions, not as a substitute for experimentation or incrementality measurement.',
      },
    ],
  },
  frequencyLift: {
    label: 'Freq -> Lift',
    title: 'Average weekly frequency vs. aided recall lift',
    description:
      'A brand team is examining whether higher ad frequency is associated with stronger survey-measured recall lift, while watching for over-interpretation.',
    xLabel: 'average frequency',
    yLabel: 'aided recall lift',
    xUnit: 'frequency',
    yUnit: 'pctPoint',
    slopeLabel: 'additional recall-lift points per extra average exposure',
    caution:
      'Frequency is partly a result of delivery dynamics and audience composition. A linear fit can summarize the pattern, but it should not be mistaken for a complete response curve.',
    skills: ['continuous predictors', 'brand lift interpretation', 'linearity', 'residuals', 'business communication'],
    xs: [1.2, 1.5, 1.8, 2.2, 2.5, 2.8, 3.1, 3.5, 3.9, 4.3, 4.8, 5.3],
    ys: [0.8, 1.1, 1.4, 1.9, 2.2, 2.3, 2.7, 3.2, 3.4, 3.5, 3.9, 4.2],
    questions: [
      {
        prompt: 'How should the planner interpret a slope of 0.8 in this scenario?',
        answer:
          'It means the fitted line associates one additional average exposure with roughly 0.8 more recall-lift points on average, over the observed frequency range.',
      },
      {
        prompt: 'What pattern in the residual plot would suggest the linear model is too simple?',
        answer:
          'A curved residual pattern would suggest the relationship bends, which is plausible for advertising because frequency often shows diminishing returns.',
      },
      {
        prompt: 'Why is it still useful to fit a simple regression even if the true response is probably more complex?',
        answer:
          'Because the simple model gives a first disciplined summary of direction, scale, and uncertainty. It is a starting point for better planning and for deciding whether more sophisticated modeling is warranted.',
      },
    ],
  },
}

function formatXValue(scenario: Scenario, value: number) {
  return scenario.xUnit === 'usdK' ? `$${value.toFixed(0)}k` : `${value.toFixed(1)}`
}

function formatYValue(scenario: Scenario, value: number) {
  return scenario.yUnit === 'count' ? `${Math.round(value).toLocaleString('en-US')}` : `${value.toFixed(1)} pts`
}

function formatSlopeValue(scenario: Scenario, value: number) {
  return scenario.yUnit === 'count' ? value.toFixed(2) : `${value.toFixed(2)} pts`
}

function formatPValue(value: number) {
  return value < 0.0001 ? '<0.0001' : value.toFixed(4)
}

export function AdvertisingRegressionStudio() {
  const [scenario, setScenario] = useState<ScenarioKey>('paidSocialLeads')
  const [forecastPosition, setForecastPosition] = useState(50)
  const [showResiduals, setShowResiduals] = useState(false)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)

  const activeScenario = regressionScenarios[scenario]
  const xs = activeScenario.xs
  const ys = activeScenario.ys
  const reg = useMemo(() => linearRegression(xs, ys), [xs, ys])
  const questions = activeScenario.questions
  const activeQuestion = questions[activeQuestionIndex % questions.length]

  const n = xs.length
  const mx = mean(xs)
  const sxx = xs.reduce((sum, value) => sum + (value - mx) ** 2, 0)
  const sse = reg.residuals.reduce((sum, value) => sum + value ** 2, 0)
  const residualSE = Math.sqrt(sse / (n - 2))
  const slopeSE = residualSE / Math.sqrt(sxx)
  const slopeZ = slopeSE === 0 ? 0 : reg.slope / slopeSE
  const slopePValue = 2 * (1 - normalCdf(Math.abs(slopeZ)))
  const slopeCILow = reg.slope - 1.96 * slopeSE
  const slopeCIHigh = reg.slope + 1.96 * slopeSE
  const corr = correlation(xs, ys)
  const residualSD = stdDev(reg.residuals)

  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = Math.min(...ys, ...reg.predicted)
  const yMax = Math.max(...ys, ...reg.predicted)
  const padX = (xMax - xMin) * 0.12 || 1
  const padY = (yMax - yMin) * 0.14 || 1
  const domainXLeft = xMin - padX
  const domainXRight = xMax + padX
  const domainYLow = yMin - padY
  const domainYHigh = yMax + padY

  const toSvgX = (value: number) => 72 + ((value - domainXLeft) / (domainXRight - domainXLeft)) * 470
  const toSvgY = (value: number) => 228 - ((value - domainYLow) / (domainYHigh - domainYLow)) * 180

  const forecastX = xMin + ((xMax - xMin) * forecastPosition) / 100
  const forecastY = reg.intercept + reg.slope * forecastX

  const residScale = Math.max(...reg.residuals.map((value) => Math.abs(value)), residualSD * 1.5, 1)

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Applied advertising"
          title="Model spend-response without losing statistical discipline"
          description="Simple regression is useful in advertising, but only when slope, fit, residuals, and causal limits are interpreted correctly."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <ChoiceRow
              label="Scenario"
              options={scenarioOrder.map((key) => ({ label: regressionScenarios[key].label, value: key }))}
              value={scenario}
              onChange={setScenario}
            />
            <Slider
              label="Forecast point"
              value={forecastPosition}
              min={0}
              max={100}
              step={1}
              display={formatXValue(activeScenario, forecastX)}
              note="Move within the observed range to see the fitted prediction."
              onChange={setForecastPosition}
            />
            <div className="choice-row">
              <span>View</span>
              <div className="choice-buttons">
                <button type="button" className={`mini-choice ${!showResiduals ? 'active' : ''}`} onClick={() => setShowResiduals(false)}>
                  Scatter + fit
                </button>
                <button type="button" className={`mini-choice ${showResiduals ? 'active' : ''}`} onClick={() => setShowResiduals(true)}>
                  Residuals
                </button>
              </div>
            </div>
            <div className="explanation-panel">
              <span className="panel-label">Business setup</span>
              <p className="strong-text">{activeScenario.title}</p>
              <p>{activeScenario.description}</p>
              <p>{activeScenario.caution}</p>
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
              <MetricCard value={formatSlopeValue(activeScenario, reg.slope)} label="slope" />
              <MetricCard value={formatNumber(reg.intercept, 2)} label="intercept" />
              <MetricCard value={formatNumber(reg.rSquared, 3)} label="R²" />
              <MetricCard value={formatNumber(residualSD, 2)} label="residual SD" />
            </div>
            <div className="metric-strip wide">
              <MetricCard value={formatNumber(corr, 3)} label="correlation r" />
              <MetricCard value={formatPValue(slopePValue)} label="approx. slope p-value" />
              <MetricCard value={`${formatSlopeValue(activeScenario, slopeCILow)} to ${formatSlopeValue(activeScenario, slopeCIHigh)}`} label="slope 95% CI" />
              <MetricCard value={formatYValue(activeScenario, forecastY)} label="predicted outcome" />
            </div>

            <section className="content-card inset">
              <h3>{showResiduals ? 'Residual plot' : 'Scatter plot with fitted line'}</h3>
              <p>
                {showResiduals
                  ? 'Residuals should bounce around zero without a clear shape. Patterns or funnels are a warning that the model may be missing structure.'
                  : 'The fitted line summarizes the average relationship in the observed data. The highlighted point is the model prediction at the chosen planning value.'}
              </p>
              <svg viewBox="0 0 620 280" className="chart-svg" role="img" aria-label={showResiduals ? 'Residual plot' : 'Regression chart'}>
                <rect x="0" y="0" width="620" height="280" rx="24" className="chart-frame" />
                {showResiduals ? (
                  <>
                    <line x1="72" y1="140" x2="542" y2="140" stroke="rgba(19,34,71,0.2)" strokeWidth="1.5" strokeDasharray="6 6" />
                    {xs.map((value, index) => (
                      <circle
                        key={`${value}-${index}`}
                        cx={toSvgX(value)}
                        cy={140 - (reg.residuals[index] / residScale) * 85}
                        r="4.5"
                        fill="rgba(45,96,176,0.56)"
                        stroke="rgba(45,96,176,0.84)"
                        strokeWidth="1.5"
                      />
                    ))}
                    <text x="26" y="30" className="chart-caption">residual</text>
                    <text x="500" y="245" className="axis-label">{activeScenario.xLabel}</text>
                  </>
                ) : (
                  <>
                    <line x1="72" y1="228" x2="542" y2="228" stroke="rgba(19,34,71,0.12)" strokeWidth="1" />
                    <line x1="72" y1="42" x2="72" y2="228" stroke="rgba(19,34,71,0.12)" strokeWidth="1" />
                    <line
                      x1={toSvgX(domainXLeft)}
                      y1={toSvgY(reg.intercept + reg.slope * domainXLeft)}
                      x2={toSvgX(domainXRight)}
                      y2={toSvgY(reg.intercept + reg.slope * domainXRight)}
                      stroke="rgba(225,86,42,0.82)"
                      strokeWidth="3"
                      strokeDasharray="8 6"
                    />
                    {xs.map((value, index) => (
                      <circle
                        key={`${value}-${index}`}
                        cx={toSvgX(value)}
                        cy={toSvgY(ys[index])}
                        r="4.5"
                        fill="rgba(45,96,176,0.56)"
                        stroke="rgba(45,96,176,0.84)"
                        strokeWidth="1.5"
                      />
                    ))}
                    <circle cx={toSvgX(forecastX)} cy={toSvgY(forecastY)} r="7" fill="rgba(225,86,42,0.95)" stroke="white" strokeWidth="2" />
                    <text x={toSvgX(forecastX) + 10} y={toSvgY(forecastY) - 8} className="axis-label">
                      {formatYValue(activeScenario, forecastY)}
                    </text>
                    <text x="26" y="30" className="chart-caption">{activeScenario.yLabel}</text>
                    <text x="490" y="245" className="axis-label">{activeScenario.xLabel}</text>
                  </>
                )}
              </svg>
            </section>

            <section className="content-card inset">
              <h3>Interpretation</h3>
              <div className="explanation-panel">
                <code>ŷ = {formatNumber(reg.intercept, 2)} + {formatNumber(reg.slope, 3)}·x</code>
                <p className="strong-text">
                  The fitted slope implies roughly {formatSlopeValue(activeScenario, reg.slope)} {activeScenario.slopeLabel}.
                </p>
                <p>
                  The approximate 95% confidence interval for the slope runs from {formatSlopeValue(activeScenario, slopeCILow)} to {formatSlopeValue(activeScenario, slopeCIHigh)}, with an approximate p-value of {formatPValue(slopePValue)}.
                </p>
                <p>
                  R² = {formatNumber(reg.rSquared, 3)}, so the line explains about {formatNumber(reg.rSquared * 100, 1)}% of the observed variation in {activeScenario.yLabel}. That is a fit statement, not a causal guarantee.
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
