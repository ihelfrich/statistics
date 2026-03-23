export type ModuleKey =
  | 'descriptive'
  | 'probability'
  | 'expectation'
  | 'distributions'
  | 'covariance'
  | 'sampling'
  | 'lln'
  | 'confidence'
  | 'testing'
  | 'regression'
  | 'anova'
  | 'bootstrap'
  | 'adDiagnostics'
  | 'adExperiments'
  | 'adRegression'

export type ModuleMeta = {
  title: string
  kicker: string
  description: string
  category: 'foundations' | 'inference' | 'modeling' | 'applied'
  slug: string
  pathway: 'Core Theory' | 'Inference Lab' | 'Modeling Studio' | 'Advertising Analytics'
  prerequisites: ModuleKey[]
  checkpointAssessmentId: string
  recommendedNext?: ModuleKey
  estimatedMinutes: number
  learningObjectives: string[]
}

export const moduleRegistry: Record<ModuleKey, ModuleMeta> = {
  descriptive: {
    title: 'Descriptive Statistics',
    kicker: 'Summarize the data',
    description: 'Center, spread, shape, and outliers — the first things you compute before any inference.',
    category: 'foundations',
    slug: 'descriptive-statistics',
    pathway: 'Core Theory',
    prerequisites: [],
    checkpointAssessmentId: 'checkpoint-descriptive',
    recommendedNext: 'probability',
    estimatedMinutes: 18,
    learningObjectives: [
      'Interpret center, spread, skew, and outliers before moving to inference.',
      'Choose between mean, median, standard deviation, and IQR in context.',
      'Read histograms, box plots, and cumulative views as operational evidence.',
    ],
  },
  probability: {
    title: 'Probability Laws',
    kicker: 'Events and logic',
    description: 'Set operations, conditioning, complements, and independence.',
    category: 'foundations',
    slug: 'probability-laws',
    pathway: 'Core Theory',
    prerequisites: ['descriptive'],
    checkpointAssessmentId: 'checkpoint-probability',
    recommendedNext: 'expectation',
    estimatedMinutes: 20,
    learningObjectives: [
      'Translate word problems into events, unions, intersections, and complements.',
      'Distinguish marginal, joint, and conditional probability statements.',
      'Test independence claims with probability rules instead of intuition.',
    ],
  },
  expectation: {
    title: 'Expectation & Variance',
    kicker: 'What to expect on average',
    description: 'Expected value, variance, and linearity — the algebra behind random variables.',
    category: 'foundations',
    slug: 'expectation-and-variance',
    pathway: 'Core Theory',
    prerequisites: ['probability'],
    checkpointAssessmentId: 'checkpoint-expectation',
    recommendedNext: 'distributions',
    estimatedMinutes: 22,
    learningObjectives: [
      'Compute expectation and variance for simple random variables.',
      'Use linearity rules correctly when combining random quantities.',
      'Interpret variance as spread around an expected value, not as a business outcome itself.',
    ],
  },
  distributions: {
    title: 'Distributions',
    kicker: 'Discrete and continuous',
    description: 'Binomial structure, normal shape, spread, and shaded probability mass.',
    category: 'foundations',
    slug: 'distributions',
    pathway: 'Core Theory',
    prerequisites: ['probability', 'expectation'],
    checkpointAssessmentId: 'checkpoint-distributions',
    recommendedNext: 'covariance',
    estimatedMinutes: 22,
    learningObjectives: [
      'Recognize when binomial and normal models are appropriate.',
      'Interpret parameters like mean and standard deviation within a distribution family.',
      'Translate areas under a curve or probability mass into concrete probability statements.',
    ],
  },
  covariance: {
    title: 'Covariance & Correlation',
    kicker: 'How variables move together',
    description: 'Measure and visualize the linear relationship between two random variables.',
    category: 'foundations',
    slug: 'covariance-and-correlation',
    pathway: 'Core Theory',
    prerequisites: ['descriptive', 'distributions'],
    checkpointAssessmentId: 'checkpoint-covariance',
    recommendedNext: 'sampling',
    estimatedMinutes: 18,
    learningObjectives: [
      'Differentiate covariance from correlation and interpret both in context.',
      'Read scatterplots for direction, strength, and linearity.',
      'Avoid causal claims when the evidence is only associative.',
    ],
  },
  sampling: {
    title: 'Sampling + CLT',
    kicker: 'From population to sample mean',
    description: 'See how repeated samples build a sampling distribution and tighten with n.',
    category: 'inference',
    slug: 'sampling-and-clt',
    pathway: 'Inference Lab',
    prerequisites: ['descriptive', 'distributions'],
    checkpointAssessmentId: 'checkpoint-sampling',
    recommendedNext: 'lln',
    estimatedMinutes: 22,
    learningObjectives: [
      'Distinguish the population distribution from the sampling distribution.',
      'Explain how sample size changes standard errors and shape.',
      'Use the CLT to justify normal approximations for sample means.',
    ],
  },
  lln: {
    title: 'Law of Large Numbers',
    kicker: 'Convergence in action',
    description: 'Watch the running average stabilize as the sample size grows.',
    category: 'inference',
    slug: 'law-of-large-numbers',
    pathway: 'Inference Lab',
    prerequisites: ['expectation', 'sampling'],
    checkpointAssessmentId: 'checkpoint-lln',
    recommendedNext: 'confidence',
    estimatedMinutes: 16,
    learningObjectives: [
      'Describe convergence of the running average toward the population mean.',
      'Separate LLN intuition from short-run randomness.',
      'Connect repeated sampling behavior to statistical reliability.',
    ],
  },
  confidence: {
    title: 'Confidence Intervals',
    kicker: 'Estimation under repetition',
    description: 'Coverage, interval width, and the role of confidence level and sample size.',
    category: 'inference',
    slug: 'confidence-intervals',
    pathway: 'Inference Lab',
    prerequisites: ['sampling', 'lln'],
    checkpointAssessmentId: 'checkpoint-confidence',
    recommendedNext: 'testing',
    estimatedMinutes: 24,
    learningObjectives: [
      'Interpret confidence intervals as repeated-sampling procedures, not probability statements about a fixed parameter.',
      'Explain how confidence level, variability, and sample size change interval width.',
      'Use interval estimates to communicate plausible effect sizes.',
    ],
  },
  testing: {
    title: 'Hypothesis Tests',
    kicker: 'Decision under uncertainty',
    description: 'Null vs. alternative, p-values, rejection regions, and power.',
    category: 'inference',
    slug: 'hypothesis-tests',
    pathway: 'Inference Lab',
    prerequisites: ['confidence'],
    checkpointAssessmentId: 'checkpoint-testing',
    recommendedNext: 'regression',
    estimatedMinutes: 26,
    learningObjectives: [
      'Formulate null and alternative hypotheses correctly.',
      'Interpret p-values, significance thresholds, and Type I error without common misconceptions.',
      'Explain how effect size, noise, and sample size drive power.',
    ],
  },
  regression: {
    title: 'Linear Regression',
    kicker: 'Fit, predict, diagnose',
    description: 'Least-squares line, residuals, R-squared, and the geometry of prediction.',
    category: 'modeling',
    slug: 'linear-regression',
    pathway: 'Modeling Studio',
    prerequisites: ['covariance', 'testing'],
    checkpointAssessmentId: 'checkpoint-regression',
    recommendedNext: 'anova',
    estimatedMinutes: 26,
    learningObjectives: [
      'Interpret slope, intercept, and fitted values in context.',
      'Read residual plots for nonlinearity, heteroskedasticity, and model misspecification.',
      'Use R-squared appropriately without treating it as proof of causality.',
    ],
  },
  anova: {
    title: 'ANOVA',
    kicker: 'Comparing group means',
    description: 'Partition total variation into between-group and within-group components.',
    category: 'modeling',
    slug: 'anova',
    pathway: 'Modeling Studio',
    prerequisites: ['testing', 'regression'],
    checkpointAssessmentId: 'checkpoint-anova',
    recommendedNext: 'bootstrap',
    estimatedMinutes: 22,
    learningObjectives: [
      'Interpret ANOVA as a structured comparison of group means.',
      'Understand between-group versus within-group variation.',
      'Explain what a significant omnibus F-test does and does not tell you.',
    ],
  },
  bootstrap: {
    title: 'Bootstrap',
    kicker: 'Resampling inference',
    description: 'Build confidence intervals without distributional assumptions by resampling.',
    category: 'modeling',
    slug: 'bootstrap',
    pathway: 'Modeling Studio',
    prerequisites: ['sampling', 'confidence'],
    checkpointAssessmentId: 'checkpoint-bootstrap',
    recommendedNext: 'adDiagnostics',
    estimatedMinutes: 20,
    learningObjectives: [
      'Explain the bootstrap as repeated sampling from the observed sample.',
      'Use resampling to approximate uncertainty without strong parametric assumptions.',
      'Compare bootstrap logic with classical standard-error approaches.',
    ],
  },
  adDiagnostics: {
    title: 'Advertising Diagnostics',
    kicker: 'Read campaign data',
    description: 'Daily KPI monitoring, distributions, segment comparisons, and realistic advertising reporting.',
    category: 'applied',
    slug: 'advertising-diagnostics',
    pathway: 'Advertising Analytics',
    prerequisites: ['descriptive'],
    checkpointAssessmentId: 'checkpoint-adDiagnostics',
    recommendedNext: 'adExperiments',
    estimatedMinutes: 24,
    learningObjectives: [
      'Interpret campaign distributions before making budget recommendations.',
      'Separate scale, efficiency, consistency, and outlier behavior in KPI reporting.',
      'Use segment diagnostics to explain why blended averages can mislead.',
    ],
  },
  adExperiments: {
    title: 'Advertising Experiments',
    kicker: 'Test creative and landing pages',
    description: 'Interpret p-values, confidence intervals, lift, and power in realistic ad experiments.',
    category: 'applied',
    slug: 'advertising-experiments',
    pathway: 'Advertising Analytics',
    prerequisites: ['confidence', 'testing', 'adDiagnostics'],
    checkpointAssessmentId: 'checkpoint-adExperiments',
    recommendedNext: 'adRegression',
    estimatedMinutes: 28,
    learningObjectives: [
      'Choose the right inferential frame for proportions versus means in ad tests.',
      'Explain lift, confidence intervals, and p-values in business language.',
      'Distinguish statistical significance from decision-worthy business impact.',
    ],
  },
  adRegression: {
    title: 'Advertising Regression',
    kicker: 'Model spend response',
    description: 'Use simple regression to quantify spend-response relationships and avoid bad business interpretation.',
    category: 'applied',
    slug: 'advertising-regression',
    pathway: 'Advertising Analytics',
    prerequisites: ['regression', 'adDiagnostics'],
    checkpointAssessmentId: 'checkpoint-adRegression',
    estimatedMinutes: 26,
    learningObjectives: [
      'Interpret spend-response slopes, fitted values, and residuals in planning contexts.',
      'Explain why strong fit metrics still do not prove incrementality.',
      'Communicate extrapolation and omitted-variable risk in marketing models.',
    ],
  },
}

export const moduleOrder: ModuleKey[] = [
  'descriptive',
  'probability',
  'expectation',
  'distributions',
  'covariance',
  'sampling',
  'lln',
  'confidence',
  'testing',
  'regression',
  'anova',
  'bootstrap',
  'adDiagnostics',
  'adExperiments',
  'adRegression',
]

export const categoryLabels: Record<ModuleMeta['category'], string> = {
  foundations: 'Foundations',
  inference: 'Inference',
  modeling: 'Modeling',
  applied: 'Applied',
}

export function isModuleKey(value: string): value is ModuleKey {
  return value in moduleRegistry
}
