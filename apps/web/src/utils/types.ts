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

export type ModuleMeta = {
  title: string
  kicker: string
  description: string
  category: 'foundations' | 'inference' | 'modeling'
}

export const moduleRegistry: Record<ModuleKey, ModuleMeta> = {
  descriptive: {
    title: 'Descriptive Statistics',
    kicker: 'Summarize the data',
    description: 'Center, spread, shape, and outliers — the first things you compute before any inference.',
    category: 'foundations',
  },
  probability: {
    title: 'Probability Laws',
    kicker: 'Events and logic',
    description: 'Set operations, conditioning, complements, and independence.',
    category: 'foundations',
  },
  expectation: {
    title: 'Expectation & Variance',
    kicker: 'What to expect on average',
    description: 'Expected value, variance, and linearity — the algebra behind random variables.',
    category: 'foundations',
  },
  distributions: {
    title: 'Distributions',
    kicker: 'Discrete and continuous',
    description: 'Binomial structure, normal shape, spread, and shaded probability mass.',
    category: 'foundations',
  },
  covariance: {
    title: 'Covariance & Correlation',
    kicker: 'How variables move together',
    description: 'Measure and visualize the linear relationship between two random variables.',
    category: 'foundations',
  },
  sampling: {
    title: 'Sampling + CLT',
    kicker: 'From population to sample mean',
    description: 'See how repeated samples build a sampling distribution and tighten with n.',
    category: 'inference',
  },
  lln: {
    title: 'Law of Large Numbers',
    kicker: 'Convergence in action',
    description: 'Watch the running average stabilize as the sample size grows.',
    category: 'inference',
  },
  confidence: {
    title: 'Confidence Intervals',
    kicker: 'Estimation under repetition',
    description: 'Coverage, interval width, and the role of confidence level and sample size.',
    category: 'inference',
  },
  testing: {
    title: 'Hypothesis Tests',
    kicker: 'Decision under uncertainty',
    description: 'Null vs. alternative, p-values, rejection regions, and power.',
    category: 'inference',
  },
  regression: {
    title: 'Linear Regression',
    kicker: 'Fit, predict, diagnose',
    description: 'Least-squares line, residuals, R-squared, and the geometry of prediction.',
    category: 'modeling',
  },
  anova: {
    title: 'ANOVA',
    kicker: 'Comparing group means',
    description: 'Partition total variation into between-group and within-group components.',
    category: 'modeling',
  },
  bootstrap: {
    title: 'Bootstrap',
    kicker: 'Resampling inference',
    description: 'Build confidence intervals without distributional assumptions by resampling.',
    category: 'modeling',
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
]

export const categoryLabels: Record<ModuleMeta['category'], string> = {
  foundations: 'Foundations',
  inference: 'Inference',
  modeling: 'Modeling',
}
