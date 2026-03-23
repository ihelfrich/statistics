import { moduleOrder, moduleRegistry } from '../utils/types.ts'
import type { ModuleKey } from '../utils/types.ts'
import type {
  AssessmentCatalogEntry,
  AssessmentForm,
  AssessmentItem,
} from '../utils/assessmentTypes.ts'

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function shuffleOptions(item_id: string, options: NonNullable<AssessmentItem['options']>) {
  const shuffled = [...options]
  let seed = hashString(item_id)

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const swapIndex = seed % (index + 1)
    const temp = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = temp
  }

  return shuffled
}

function singleChoice(
  item_id: string,
  module_key: ModuleKey,
  skill_tag: string,
  difficulty_band: AssessmentItem['difficulty_band'],
  prompt: string,
  options: AssessmentItem['options'],
  correct_answer: string,
  rationale: string,
): AssessmentItem {
  return {
    item_id,
    module_key,
    skill_tag,
    difficulty_band,
    item_type: 'single_choice',
    prompt,
    options: options ? shuffleOptions(item_id, options) : undefined,
    correct_answer,
    rationale,
    scoring: { max_points: 1 },
  }
}

function numeric(
  item_id: string,
  module_key: ModuleKey,
  skill_tag: string,
  difficulty_band: AssessmentItem['difficulty_band'],
  prompt: string,
  correct_answer: number,
  rationale: string,
  tolerance = 0.01,
): AssessmentItem {
  return {
    item_id,
    module_key,
    skill_tag,
    difficulty_band,
    item_type: 'numeric',
    prompt,
    correct_answer,
    tolerance,
    rationale,
    scoring: { max_points: 1 },
  }
}

const moduleCheckpointItems: Record<ModuleKey, AssessmentItem[]> = {
  descriptive: [
    numeric(
      'checkpoint-descriptive-01',
      'descriptive',
      'center',
      'foundation',
      'Find the mean of 4, 7, 9, and 10.',
      7.5,
      'The mean is the sum divided by the number of observations: 30 / 4 = 7.5.',
    ),
    singleChoice(
      'checkpoint-descriptive-02',
      'descriptive',
      'resistance',
      'foundation',
      'Which summary statistic is most resistant to a single extreme outlier?',
      [
        { value: 'mean', label: 'Mean' },
        { value: 'median', label: 'Median' },
        { value: 'range', label: 'Range' },
        { value: 'standard-deviation', label: 'Standard deviation' },
      ],
      'median',
      'The median depends on order, not the magnitude of one extreme value.',
    ),
    singleChoice(
      'checkpoint-descriptive-03',
      'descriptive',
      'spread',
      'foundation',
      'The interquartile range describes which part of a distribution?',
      [
        { value: 'all', label: 'All observations' },
        { value: 'middle-half', label: 'The middle 50% of observations' },
        { value: 'upper-tail', label: 'Only the highest 25% of observations' },
        { value: 'tail-gap', label: 'The gap between the maximum and minimum' },
      ],
      'middle-half',
      'IQR = Q3 - Q1, so it captures the middle half of the ordered data.',
    ),
    singleChoice(
      'checkpoint-descriptive-04',
      'descriptive',
      'shape',
      'intermediate',
      'In a right-skewed distribution, which statement is usually true?',
      [
        { value: 'mean-less', label: 'The mean is below the median' },
        { value: 'mean-equal', label: 'The mean equals the median exactly' },
        { value: 'mean-greater', label: 'The mean is above the median' },
        { value: 'sd-zero', label: 'The standard deviation must be zero' },
      ],
      'mean-greater',
      'A right tail tends to pull the mean above the median.',
    ),
    singleChoice(
      'checkpoint-descriptive-05',
      'descriptive',
      'spread',
      'foundation',
      'What does the standard deviation measure?',
      [
        { value: 'count', label: 'The number of observations' },
        { value: 'distance', label: 'Typical distance from the mean' },
        { value: 'middle', label: 'The middle observation' },
        { value: 'probability', label: 'The probability of the sample mean' },
      ],
      'distance',
      'Standard deviation summarizes typical spread around the mean.',
    ),
  ],
  probability: [
    numeric(
      'checkpoint-probability-01',
      'probability',
      'union',
      'foundation',
      'If P(A) = 0.50, P(B) = 0.40, and P(A ∩ B) = 0.20, find P(A ∪ B).',
      0.7,
      'Use P(A ∪ B) = P(A) + P(B) - P(A ∩ B) = 0.70.',
    ),
    singleChoice(
      'checkpoint-probability-02',
      'probability',
      'complement',
      'foundation',
      'If P(A) = 0.18, what is P(Aᶜ)?',
      [
        { value: '0.18', label: '0.18' },
        { value: '0.82', label: '0.82' },
        { value: '1.18', label: '1.18' },
        { value: '0.50', label: '0.50' },
      ],
      '0.82',
      'Complements sum to 1, so P(Aᶜ) = 1 - 0.18.',
    ),
    singleChoice(
      'checkpoint-probability-03',
      'probability',
      'conditional',
      'foundation',
      'Which formula defines P(A | B) when P(B) > 0?',
      [
        { value: 'joint-over-b', label: 'P(A ∩ B) / P(B)' },
        { value: 'a-over-b', label: 'P(A) / P(B)' },
        { value: 'sum', label: 'P(A) + P(B)' },
        { value: 'product', label: 'P(A)P(B)' },
      ],
      'joint-over-b',
      'Conditional probability restricts the sample space to B.',
    ),
    singleChoice(
      'checkpoint-probability-04',
      'probability',
      'independence',
      'intermediate',
      'Events A and B are independent when:',
      [
        { value: 'mutually-exclusive', label: 'They cannot happen together' },
        { value: 'product-rule', label: 'P(A ∩ B) = P(A)P(B)' },
        { value: 'same-probability', label: 'P(A) = P(B)' },
        { value: 'union-one', label: 'P(A ∪ B) = 1' },
      ],
      'product-rule',
      'Independence means the joint probability factors into the product of marginals.',
    ),
    singleChoice(
      'checkpoint-probability-05',
      'probability',
      'events',
      'foundation',
      'Mutually exclusive events are events that:',
      [
        { value: 'cannot', label: 'Cannot occur at the same time' },
        { value: 'always', label: 'Always occur together' },
        { value: 'independent', label: 'Are automatically independent' },
        { value: 'equal', label: 'Have equal probability' },
      ],
      'cannot',
      'Mutually exclusive events have no overlap.',
    ),
  ],
  expectation: [
    numeric(
      'checkpoint-expectation-01',
      'expectation',
      'expected-value',
      'foundation',
      'What is the expected value of a fair six-sided die roll?',
      3.5,
      'The average of 1, 2, 3, 4, 5, and 6 is 3.5.',
    ),
    singleChoice(
      'checkpoint-expectation-02',
      'expectation',
      'variance',
      'foundation',
      'Variance is best described as:',
      [
        { value: 'average-squared', label: 'Average squared deviation from the mean' },
        { value: 'average-deviation', label: 'Average signed deviation from the mean' },
        { value: 'middle', label: 'The middle observation' },
        { value: 'probability', label: 'The probability of an event' },
      ],
      'average-squared',
      'Variance averages squared distance from the mean.',
    ),
    singleChoice(
      'checkpoint-expectation-03',
      'expectation',
      'linearity',
      'intermediate',
      'Which expression equals E[a + bX]?',
      [
        { value: 'a-plus-bex', label: 'a + bE[X]' },
        { value: 'abex', label: 'abE[X]' },
        { value: 'aex-plus-b', label: 'aE[X] + b' },
        { value: 'variance', label: 'Var(X)' },
      ],
      'a-plus-bex',
      'Expectation is linear: constants move through predictably.',
    ),
    singleChoice(
      'checkpoint-expectation-04',
      'expectation',
      'indicator',
      'foundation',
      'If X is Bernoulli(p), what is E[X]?',
      [
        { value: '1-p', label: '1 - p' },
        { value: 'p', label: 'p' },
        { value: 'p2', label: 'p²' },
        { value: 'sqrtp', label: '√p' },
      ],
      'p',
      'A Bernoulli variable is 1 with probability p, so its mean is p.',
    ),
    singleChoice(
      'checkpoint-expectation-05',
      'expectation',
      'spread',
      'foundation',
      'A larger variance usually means:',
      [
        { value: 'closer', label: 'Values are more tightly clustered around the mean' },
        { value: 'wider', label: 'Values are more spread out around the mean' },
        { value: 'higher-mean', label: 'The mean must be larger' },
        { value: 'lower-mean', label: 'The mean must be smaller' },
      ],
      'wider',
      'Variance is a spread measure, not a center measure.',
    ),
  ],
  distributions: [
    singleChoice(
      'checkpoint-distributions-01',
      'distributions',
      'binomial',
      'foundation',
      'A binomial model is appropriate when there are:',
      [
        { value: 'fixed-independent', label: 'A fixed number of independent trials with the same success probability' },
        { value: 'continuous', label: 'A continuous measurement on every trial' },
        { value: 'changing-p', label: 'Trials with a different success probability each time' },
        { value: 'paired', label: 'Exactly two dependent outcomes each time' },
      ],
      'fixed-independent',
      'Binomial settings require fixed n, independence, and constant p.',
    ),
    singleChoice(
      'checkpoint-distributions-02',
      'distributions',
      'normal',
      'foundation',
      'Increasing the mean of a normal distribution while keeping the standard deviation fixed will:',
      [
        { value: 'shift-center', label: 'Shift the curve horizontally without changing spread' },
        { value: 'widen', label: 'Make the curve wider' },
        { value: 'skew-right', label: 'Make the curve right-skewed' },
        { value: 'shrink', label: 'Shrink total probability below 1' },
      ],
      'shift-center',
      'The mean controls center; the standard deviation controls spread.',
    ),
    singleChoice(
      'checkpoint-distributions-03',
      'distributions',
      'empirical-rule',
      'foundation',
      'For a normal distribution, about 95% of observations lie within:',
      [
        { value: '1sd', label: '1 standard deviation of the mean' },
        { value: '2sd', label: '2 standard deviations of the mean' },
        { value: '3sd', label: '3 standard deviations of the mean' },
        { value: '4sd', label: '4 standard deviations of the mean' },
      ],
      '2sd',
      'The empirical rule gives about 95% within roughly two standard deviations.',
    ),
    numeric(
      'checkpoint-distributions-04',
      'distributions',
      'binomial-mean',
      'foundation',
      'If X ~ Binomial(n = 10, p = 0.30), what is E[X]?',
      3,
      'For a binomial random variable, E[X] = np = 3.',
    ),
    singleChoice(
      'checkpoint-distributions-05',
      'distributions',
      'approximation',
      'intermediate',
      'A binomial distribution is often approximated by a normal distribution when:',
      [
        { value: 'large-conditions', label: 'np and n(1 - p) are both reasonably large' },
        { value: 'p-half', label: 'p = 0.50 exactly' },
        { value: 'n-small', label: 'n is tiny' },
        { value: 'outlier', label: 'There is an outlier in the sample' },
      ],
      'large-conditions',
      'Large expected counts in both outcomes support a normal approximation.',
    ),
  ],
  covariance: [
    singleChoice(
      'checkpoint-covariance-01',
      'covariance',
      'association',
      'foundation',
      'A positive correlation means that as x increases, y tends to:',
      [
        { value: 'increase', label: 'Increase' },
        { value: 'decrease', label: 'Decrease' },
        { value: 'stay-zero', label: 'Stay exactly at zero' },
        { value: 'be-constant', label: 'Become constant' },
      ],
      'increase',
      'Positive correlation signals positive linear association.',
    ),
    singleChoice(
      'checkpoint-covariance-02',
      'covariance',
      'correlation',
      'foundation',
      'Correlation is useful because it is:',
      [
        { value: 'unitless', label: 'Unitless and standardized' },
        { value: 'causal', label: 'A direct measure of causality' },
        { value: 'always-linear', label: 'Always the slope of the best-fit line' },
        { value: 'unbounded', label: 'Unbounded above and below' },
      ],
      'unitless',
      'Correlation standardizes covariance and removes units.',
    ),
    singleChoice(
      'checkpoint-covariance-03',
      'covariance',
      'covariance-sign',
      'foundation',
      'If covariance is negative, the variables tend to move:',
      [
        { value: 'together', label: 'Together in the same direction' },
        { value: 'opposite', label: 'In opposite directions' },
        { value: 'independent', label: 'As if they are independent' },
        { value: 'random', label: 'With zero spread' },
      ],
      'opposite',
      'Negative covariance means one tends to be high when the other is low.',
    ),
    singleChoice(
      'checkpoint-covariance-04',
      'covariance',
      'linear-association',
      'intermediate',
      'A correlation near zero implies:',
      [
        { value: 'no-linear', label: 'Little to no linear association, though nonlinear patterns may still exist' },
        { value: 'no-relationship', label: 'No relationship of any kind' },
        { value: 'perfect-negative', label: 'Perfect negative association' },
        { value: 'perfect-positive', label: 'Perfect positive association' },
      ],
      'no-linear',
      'Correlation detects linear association, not every possible pattern.',
    ),
    numeric(
      'checkpoint-covariance-05',
      'covariance',
      'perfect-correlation',
      'foundation',
      'What is the correlation for a perfect positive linear relationship?',
      1,
      'Perfect positive linear association has correlation +1.',
    ),
  ],
  sampling: [
    singleChoice(
      'checkpoint-sampling-01',
      'sampling',
      'standard-error',
      'foundation',
      'As sample size n increases, the standard error of the sample mean typically:',
      [
        { value: 'increases', label: 'Increases' },
        { value: 'decreases', label: 'Decreases' },
        { value: 'stays', label: 'Stays exactly the same' },
        { value: 'becomes-negative', label: 'Becomes negative' },
      ],
      'decreases',
      'Standard error scales like σ / √n.',
    ),
    singleChoice(
      'checkpoint-sampling-02',
      'sampling',
      'sampling-distribution',
      'foundation',
      'The sampling distribution of the sample mean is centered at:',
      [
        { value: 'population-mean', label: 'The population mean' },
        { value: 'population-sd', label: 'The population standard deviation' },
        { value: 'sample-sd', label: 'The sample standard deviation' },
        { value: 'zero', label: 'Zero no matter what' },
      ],
      'population-mean',
      'The sample mean is an unbiased estimator of the population mean.',
    ),
    numeric(
      'checkpoint-sampling-03',
      'sampling',
      'center',
      'foundation',
      'If the population mean is 50, what is the expected value of the sample mean?',
      50,
      'The sample mean is centered at the population mean.',
    ),
    singleChoice(
      'checkpoint-sampling-04',
      'sampling',
      'precision',
      'foundation',
      'Compared with a smaller sample, a larger sample generally makes the sampling distribution of the mean:',
      [
        { value: 'narrower', label: 'Narrower' },
        { value: 'wider', label: 'Wider' },
        { value: 'skewed', label: 'More skewed automatically' },
        { value: 'discrete', label: 'Discrete instead of continuous' },
      ],
      'narrower',
      'More data reduces standard error and tightens the distribution.',
    ),
    singleChoice(
      'checkpoint-sampling-05',
      'sampling',
      'clt',
      'intermediate',
      'The central limit theorem primarily explains the shape of the distribution of:',
      [
        { value: 'sample-mean', label: 'The sample mean across repeated samples' },
        { value: 'population', label: 'The population itself' },
        { value: 'single-observation', label: 'A single observation from the population' },
        { value: 'residual', label: 'Regression residuals only' },
      ],
      'sample-mean',
      'The CLT concerns repeated sample means, not the original population directly.',
    ),
  ],
  lln: [
    singleChoice(
      'checkpoint-lln-01',
      'lln',
      'convergence',
      'foundation',
      'The law of large numbers says that, as n grows, the running average tends to:',
      [
        { value: 'population-mean', label: 'Approach the population mean' },
        { value: 'zero', label: 'Approach zero' },
        { value: 'variance', label: 'Approach the population variance' },
        { value: 'max', label: 'Approach the sample maximum' },
      ],
      'population-mean',
      'Repeated averages stabilize near the expected value as sample size grows.',
    ),
    singleChoice(
      'checkpoint-lln-02',
      'lln',
      'misconception',
      'foundation',
      'Which statement is false under the law of large numbers?',
      [
        { value: 'small-sample-guarantee', label: 'A small sample must already be close to the population mean' },
        { value: 'long-run-stability', label: 'Long-run averages stabilize with more observations' },
        { value: 'randomness-remains', label: 'Short-run randomness can still be substantial' },
        { value: 'repeat-sampling', label: 'Repeated sampling is part of the idea' },
      ],
      'small-sample-guarantee',
      'LLN is a long-run result, not a guarantee about tiny samples.',
    ),
    numeric(
      'checkpoint-lln-03',
      'lln',
      'expected-value',
      'foundation',
      'If a process has expected value 12, the running average should approach what value in the long run?',
      12,
      'The LLN says the long-run average converges to the expected value.',
    ),
    singleChoice(
      'checkpoint-lln-04',
      'lln',
      'stability',
      'foundation',
      'As n increases, the running average usually becomes:',
      [
        { value: 'more-stable', label: 'More stable' },
        { value: 'less-stable', label: 'Less stable' },
        { value: 'biased', label: 'Systematically biased upward' },
        { value: 'undefined', label: 'Undefined' },
      ],
      'more-stable',
      'More observations reduce the influence of each individual draw.',
    ),
    singleChoice(
      'checkpoint-lln-05',
      'lln',
      'interpretation',
      'foundation',
      'The law of large numbers is most useful for explaining:',
      [
        { value: 'reliability', label: 'Why long-run averages become reliable under repetition' },
        { value: 'causality', label: 'Why one variable causes another' },
        { value: 'outliers', label: 'How to delete outliers' },
        { value: 'sampling-bias', label: 'Why every sample is unbiased' },
      ],
      'reliability',
      'LLN is about long-run stabilization and reliability of averages.',
    ),
  ],
  confidence: [
    singleChoice(
      'checkpoint-confidence-01',
      'confidence',
      'coverage',
      'foundation',
      'A 95% confidence interval means that:',
      [
        { value: 'procedure', label: '95% of intervals from repeated samples would capture the true parameter' },
        { value: 'parameter-prob', label: 'The fixed parameter has a 95% chance of being in this one interval' },
        { value: 'sample-prob', label: '95% of sample values lie inside the interval' },
        { value: 'certainty', label: 'The interval is guaranteed to contain the truth' },
      ],
      'procedure',
      'Confidence is a property of the interval-generating procedure under repetition.',
    ),
    singleChoice(
      'checkpoint-confidence-02',
      'confidence',
      'width',
      'foundation',
      'If you increase the confidence level from 90% to 99% with everything else fixed, the interval will usually become:',
      [
        { value: 'narrower', label: 'Narrower' },
        { value: 'wider', label: 'Wider' },
        { value: 'same', label: 'Exactly the same width' },
        { value: 'negative', label: 'Negative in width' },
      ],
      'wider',
      'Higher confidence requires a wider interval.',
    ),
    singleChoice(
      'checkpoint-confidence-03',
      'confidence',
      'sample-size',
      'foundation',
      'Holding confidence level fixed, a larger sample size usually makes a confidence interval:',
      [
        { value: 'wider', label: 'Wider' },
        { value: 'narrower', label: 'Narrower' },
        { value: 'shift-zero', label: 'Center at zero' },
        { value: 'invalid', label: 'Automatically invalid' },
      ],
      'narrower',
      'More data lowers standard error and usually tightens the interval.',
    ),
    singleChoice(
      'checkpoint-confidence-04',
      'confidence',
      'difference',
      'intermediate',
      'If a confidence interval for a difference in means excludes 0, that suggests:',
      [
        { value: 'evidence-difference', label: 'Evidence of a nonzero difference at the matching confidence level' },
        { value: 'no-difference', label: 'Evidence of no difference' },
        { value: 'same-variance', label: 'The variances are identical' },
        { value: 'randomization-failed', label: 'The sampling must be invalid' },
      ],
      'evidence-difference',
      'Excluding 0 makes the null value incompatible with the interval at that level.',
    ),
    numeric(
      'checkpoint-confidence-05',
      'confidence',
      'margin-of-error',
      'foundation',
      'If an estimate is 52 with a margin of error of 4, what is the upper end of the interval?',
      56,
      'Upper end = estimate + margin of error = 56.',
    ),
  ],
  testing: [
    singleChoice(
      'checkpoint-testing-01',
      'testing',
      'p-value',
      'foundation',
      'A p-value is best defined as:',
      [
        { value: 'null-extreme', label: 'The probability, under the null, of data at least as extreme as what was observed' },
        { value: 'null-true', label: 'The probability the null is true' },
        { value: 'alt-true', label: 'The probability the alternative is true' },
        { value: 'power', label: 'The test power' },
      ],
      'null-extreme',
      'The p-value is computed assuming the null model is true.',
    ),
    singleChoice(
      'checkpoint-testing-02',
      'testing',
      'decision',
      'foundation',
      'At significance level α, when do you reject H₀?',
      [
        { value: 'p-lt-alpha', label: 'When p-value < α' },
        { value: 'p-gt-alpha', label: 'When p-value > α' },
        { value: 'always', label: 'Always' },
        { value: 'never', label: 'Never' },
      ],
      'p-lt-alpha',
      'Small p-values indicate the data are unusual under the null.',
    ),
    singleChoice(
      'checkpoint-testing-03',
      'testing',
      'type1',
      'foundation',
      'A Type I error occurs when you:',
      [
        { value: 'reject-true-null', label: 'Reject a true null hypothesis' },
        { value: 'fail-false-null', label: 'Fail to reject a false null hypothesis' },
        { value: 'reject-false-null', label: 'Reject a false null hypothesis' },
        { value: 'estimate', label: 'Estimate a parameter with bias' },
      ],
      'reject-true-null',
      'Type I error is a false positive.',
    ),
    singleChoice(
      'checkpoint-testing-04',
      'testing',
      'power',
      'intermediate',
      'Which change usually increases test power?',
      [
        { value: 'larger-n', label: 'Increasing sample size' },
        { value: 'smaller-effect', label: 'Reducing the true effect size' },
        { value: 'more-noise', label: 'Increasing noise' },
        { value: 'lower-alpha-zero', label: 'Setting α to zero' },
      ],
      'larger-n',
      'More data lowers standard error and makes true effects easier to detect.',
    ),
    numeric(
      'checkpoint-testing-05',
      'testing',
      'z-statistic',
      'foundation',
      'Compute z when sample mean = 104, null mean = 100, and standard error = 2.',
      2,
      'z = (104 - 100) / 2 = 2.',
    ),
  ],
  regression: [
    singleChoice(
      'checkpoint-regression-01',
      'regression',
      'slope',
      'foundation',
      'In simple linear regression, the slope tells you:',
      [
        { value: 'change-y', label: 'How much predicted y changes for a 1-unit increase in x' },
        { value: 'mean-y', label: 'The mean of y' },
        { value: 'residual-sd', label: 'The residual standard deviation' },
        { value: 'correlation-only', label: 'Only the correlation sign' },
      ],
      'change-y',
      'The slope is the fitted change in y per one-unit change in x.',
    ),
    singleChoice(
      'checkpoint-regression-02',
      'regression',
      'residuals',
      'foundation',
      'A residual is computed as:',
      [
        { value: 'observed-minus-predicted', label: 'Observed y minus predicted y' },
        { value: 'predicted-minus-observed', label: 'Predicted y minus observed y' },
        { value: 'x-minus-y', label: 'x minus y' },
        { value: 'mean-minus-y', label: 'Mean of y minus observed y' },
      ],
      'observed-minus-predicted',
      'Residuals measure vertical errors from the fitted line.',
    ),
    singleChoice(
      'checkpoint-regression-03',
      'regression',
      'r-squared',
      'foundation',
      'R² is best interpreted as:',
      [
        { value: 'variation', label: 'The proportion of variation in y explained by the fitted model' },
        { value: 'causality', label: 'The percent of y caused by x' },
        { value: 'slope', label: 'The slope of the line' },
        { value: 'error-rate', label: 'The Type I error rate' },
      ],
      'variation',
      'R² is a fit metric describing explained variation.',
    ),
    singleChoice(
      'checkpoint-regression-04',
      'regression',
      'least-squares',
      'intermediate',
      'The least-squares regression line always passes through:',
      [
        { value: 'means', label: '(x̄, ȳ)' },
        { value: 'origin', label: '(0, 0)' },
        { value: 'maxes', label: '(max x, max y)' },
        { value: 'mins', label: '(min x, min y)' },
      ],
      'means',
      'OLS always passes through the point of sample means.',
    ),
    numeric(
      'checkpoint-regression-05',
      'regression',
      'prediction',
      'foundation',
      'If the fitted slope is 1.8, how much does predicted y change when x increases by 3 units?',
      5.4,
      'Predicted change = 1.8 × 3 = 5.4.',
    ),
  ],
  anova: [
    singleChoice(
      'checkpoint-anova-01',
      'anova',
      'purpose',
      'foundation',
      'ANOVA is primarily used to compare:',
      [
        { value: 'means', label: 'Group means' },
        { value: 'medians', label: 'Group medians only' },
        { value: 'correlations', label: 'Correlations between pairs of variables' },
        { value: 'time-series', label: 'Time trends only' },
      ],
      'means',
      'ANOVA evaluates whether group means differ more than random variation would suggest.',
    ),
    singleChoice(
      'checkpoint-anova-02',
      'anova',
      'f-statistic',
      'intermediate',
      'The ANOVA F-statistic becomes large when:',
      [
        { value: 'between-large', label: 'Between-group variation is large relative to within-group variation' },
        { value: 'within-large', label: 'Within-group variation dominates between-group variation' },
        { value: 'means-equal', label: 'All group means are exactly equal' },
        { value: 'n-small', label: 'Sample size is small regardless of the data' },
      ],
      'between-large',
      'F compares signal between groups to noise within groups.',
    ),
    singleChoice(
      'checkpoint-anova-03',
      'anova',
      'omnibus',
      'foundation',
      'A significant omnibus ANOVA result tells you that:',
      [
        { value: 'some-difference', label: 'At least one group mean differs, but not which one' },
        { value: 'all-different', label: 'Every group mean differs from every other' },
        { value: 'no-difference', label: 'No group means differ' },
        { value: 'causal', label: 'The grouping variable is definitely causal' },
      ],
      'some-difference',
      'ANOVA is an omnibus test; post-hoc analysis identifies the specific differences.',
    ),
    singleChoice(
      'checkpoint-anova-04',
      'anova',
      'null-hypothesis',
      'foundation',
      'The null hypothesis in one-way ANOVA is usually:',
      [
        { value: 'all-equal', label: 'All group means are equal' },
        { value: 'all-different', label: 'All group means are different' },
        { value: 'variances-equal', label: 'All variances are equal only' },
        { value: 'medians-equal', label: 'All medians are equal only' },
      ],
      'all-equal',
      'The classic ANOVA null states equal means across groups.',
    ),
    numeric(
      'checkpoint-anova-05',
      'anova',
      'degrees-of-freedom',
      'foundation',
      'If there are 4 groups, what are the between-group degrees of freedom?',
      3,
      'Between-group degrees of freedom are k - 1 = 4 - 1 = 3.',
    ),
  ],
  bootstrap: [
    singleChoice(
      'checkpoint-bootstrap-01',
      'bootstrap',
      'resampling',
      'foundation',
      'A bootstrap sample is created by sampling:',
      [
        { value: 'with-replacement', label: 'With replacement from the observed sample' },
        { value: 'without-replacement', label: 'Without replacement from the observed sample' },
        { value: 'population', label: 'Directly from the full population' },
        { value: 'normal', label: 'From a normal curve only' },
      ],
      'with-replacement',
      'Bootstrap samples resample from the observed data with replacement.',
    ),
    singleChoice(
      'checkpoint-bootstrap-02',
      'bootstrap',
      'motivation',
      'foundation',
      'Bootstrap methods are especially useful when:',
      [
        { value: 'se-hard', label: 'Analytical standard errors are hard to derive' },
        { value: 'n-zero', label: 'Sample size is zero' },
        { value: 'causality', label: 'You want to prove causality' },
        { value: 'deterministic', label: 'There is no sampling variability' },
      ],
      'se-hard',
      'Bootstrap approximates uncertainty from the observed sample itself.',
    ),
    singleChoice(
      'checkpoint-bootstrap-03',
      'bootstrap',
      'resamples',
      'foundation',
      'Using more bootstrap resamples mainly helps by:',
      [
        { value: 'smoother', label: 'Making the bootstrap distribution estimate smoother and more stable' },
        { value: 'remove-bias', label: 'Removing all bias automatically' },
        { value: 'prove-normality', label: 'Proving the population is normal' },
        { value: 'set-causality', label: 'Establishing causality' },
      ],
      'smoother',
      'More resamples reduce Monte Carlo noise in the bootstrap approximation.',
    ),
    singleChoice(
      'checkpoint-bootstrap-04',
      'bootstrap',
      'intervals',
      'intermediate',
      'A percentile bootstrap confidence interval is formed from:',
      [
        { value: 'bootstrap-quantiles', label: 'Quantiles of the bootstrap statistic distribution' },
        { value: 'population-quantiles', label: 'Quantiles of the population distribution' },
        { value: 'residuals-only', label: 'The residual standard deviation only' },
        { value: 'p-values', label: 'P-values from hypothesis tests only' },
      ],
      'bootstrap-quantiles',
      'Percentile intervals come directly from the resampled statistic distribution.',
    ),
    numeric(
      'checkpoint-bootstrap-05',
      'bootstrap',
      'interval-width',
      'foundation',
      'If a bootstrap interval runs from 10.8 to 14.1, what is its width?',
      3.3,
      'Interval width is upper minus lower = 3.3.',
      0.05,
    ),
  ],
  adDiagnostics: [
    numeric(
      'checkpoint-adDiagnostics-01',
      'adDiagnostics',
      'incremental-reach',
      'foundation',
      'Channel A reaches 40% of households, Channel B reaches 30%, and 12% of households saw both. What is the combined unique reach?',
      58,
      'Use inclusion-exclusion: 40% + 30% - 12% = 58%.',
      0.1,
    ),
    numeric(
      'checkpoint-adDiagnostics-02',
      'adDiagnostics',
      'weighted-mix',
      'foundation',
      'A retail media plan puts 60% of spend into a tactic with 70% new-to-brand rate and 40% into a tactic with 30% new-to-brand rate. What is the blended new-to-brand rate?',
      54,
      'The weighted average is 0.6 × 70% + 0.4 × 30% = 54%.',
      0.1,
    ),
    singleChoice(
      'checkpoint-adDiagnostics-03',
      'adDiagnostics',
      'duplication',
      'foundation',
      'A streaming video line has strong completion rate but adds very little incremental reach beyond the channels already in market. The best interpretation is:',
      [
        { value: 'copy-scale', label: 'It should automatically get more budget for every objective' },
        { value: 'inefficient', label: 'It may still help persuasion or frequency, but it is weak evidence for a reach-expansion claim' },
        { value: 'ignore-dup', label: 'Duplication does not matter when completion rate is high' },
        { value: 'causal', label: 'High completion proves the channel is creating unique reach' },
      ],
      'inefficient',
      'A channel can be useful for persuasion or frequency while still being weak evidence for incremental reach expansion.',
    ),
    singleChoice(
      'checkpoint-adDiagnostics-04',
      'adDiagnostics',
      'fatigue-tail',
      'foundation',
      'Why should a measurement lead care about a weak 6+ frequency bucket even if the blended hook-rate average still looks acceptable?',
      [
        { value: 'causal-proof', label: 'The weak bucket proves the exact causal loss from every extra impression' },
        { value: 'tail-risk', label: 'More spend often pushes more delivery into that weak tail, so the blend can understate fatigue risk' },
        { value: 'blend-only', label: 'The blended average is all that matters for scaling' },
        { value: 'equal-buckets', label: 'High- and low-frequency buckets should be interpreted as interchangeable' },
      ],
      'tail-risk',
      'The weak tail matters because added spend often increases delivery in the least efficient frequency buckets.',
    ),
    singleChoice(
      'checkpoint-adDiagnostics-05',
      'adDiagnostics',
      'geo-readiness',
      'intermediate',
      'Matched geos have an average pre-period gap near zero, but three weeks are far outside the usual range. The safest next step is to:',
      [
        { value: 'launch', label: 'Launch immediately because the average gap is near zero' },
        { value: 'ignore', label: 'Ignore the outlier weeks because averages are all that matter' },
        { value: 'investigate', label: 'Investigate those weeks before launch because they can widen the test noise floor' },
        { value: 'declare-lift', label: 'Treat the pre-period result as proof the later test will win' },
      ],
      'investigate',
      'Large pre-period outlier weeks can weaken the later lift read even when the average baseline gap looks small.',
    ),
    singleChoice(
      'checkpoint-adDiagnostics-06',
      'adDiagnostics',
      'mean-vs-median',
      'intermediate',
      'If mean cost per incremental household is materially below median cost per incremental household, the safest interpretation is:',
      [
        { value: 'stable', label: 'The flight is perfectly stable' },
        { value: 'scale', label: 'The plan is automatically ready to scale' },
        { value: 'few-efficient', label: 'A few unusually efficient weeks may be flattering the average' },
        { value: 'causal', label: 'The cheapest channel caused all observed efficiency' },
      ],
      'few-efficient',
      'A mean below the median on a cost metric suggests a few especially cheap weeks are pulling the average down.',
    ),
    numeric(
      'checkpoint-adDiagnostics-07',
      'adDiagnostics',
      'benchmark-hit-rate',
      'foundation',
      'A reach-efficiency project stayed under the planning cap in 7 of 12 weeks. What percent of weeks met the cap?',
      58.3,
      '7 / 12 = 0.583, or 58.3% of weeks.',
      0.2,
    ),
    singleChoice(
      'checkpoint-adDiagnostics-08',
      'adDiagnostics',
      'spread',
      'intermediate',
      'The IQR of the weekly matched-geo signup-rate gap widens from 0.4 percentage points to 1.1 percentage points before launch. That usually means:',
      [
        { value: 'same', label: 'There is no meaningful change in baseline precision' },
        { value: 'causal', label: 'The later test will automatically show a larger causal lift' },
        { value: 'worse', label: 'The baseline is becoming more volatile, which can weaken the later lift read' },
        { value: 'better', label: 'The geo pairs are becoming more stable' },
      ],
      'worse',
      'A larger IQR in the baseline gap indicates more volatility and usually a weaker pre-period fit.',
    ),
  ],
  adExperiments: [
    singleChoice(
      'checkpoint-adExperiments-01',
      'adExperiments',
      'metric-type',
      'foundation',
      'In a user holdout conversion lift study, qualified-lead rate is usually analyzed as a difference in:',
      [
        { value: 'variances', label: 'Variances' },
        { value: 'proportions', label: 'Proportions' },
        { value: 'correlations', label: 'Correlations' },
        { value: 'medians', label: 'Medians' },
      ],
      'proportions',
      'Each user either converts or does not, so the core outcome is a proportion.',
    ),
    numeric(
      'checkpoint-adExperiments-02',
      'adExperiments',
      'absolute-lift',
      'foundation',
      'Holdout conversion rate is 1.89% and exposed conversion rate is 2.16%. What is the absolute lift in percentage points?',
      0.27,
      'Absolute lift is 2.16% - 1.89% = 0.27 percentage points.',
      0.05,
    ),
    singleChoice(
      'checkpoint-adExperiments-03',
      'adExperiments',
      'p-value',
      'foundation',
      'A p-value of 0.03 in a conversion lift test does NOT mean:',
      [
        { value: 'null-extreme', label: 'A result this extreme would be fairly unusual if true lift were zero' },
        { value: 'variant-true', label: 'There is a 97% probability that the exposed group is truly better' },
        { value: 'decision-input', label: 'The observed difference is not especially compatible with a zero-lift null' },
        { value: 'evidence', label: 'The data put some strain on the no-lift model' },
      ],
      'variant-true',
      'A p-value is not the posterior probability that the exposed condition is truly better.',
    ),
    numeric(
      'checkpoint-adExperiments-04',
      'adExperiments',
      'brand-lift',
      'foundation',
      'A brand lift survey shows 18.3% positive recall in exposed respondents and 14.7% in controls. What is the absolute lift in percentage points?',
      3.6,
      'Absolute lift is 18.3% - 14.7% = 3.6 percentage points.',
      0.05,
    ),
    singleChoice(
      'checkpoint-adExperiments-05',
      'adExperiments',
      'confidence-interval',
      'foundation',
      'If a 95% confidence interval for incremental lift runs from -0.1 to +0.8 percentage points, the correct summary is:',
      [
        { value: 'guarantees-profit', label: 'A rollout is guaranteed to be profitable' },
        { value: 'leans-positive', label: 'The estimate leans positive, but the data are still compatible with no true lift' },
        { value: 'negative', label: 'The result should be treated as definitely negative' },
        { value: 'proves-huge', label: 'The lift is automatically large in business terms' },
      ],
      'leans-positive',
      'Because the interval still includes zero, the data are not yet ruling out no true lift.',
    ),
    numeric(
      'checkpoint-adExperiments-06',
      'adExperiments',
      'geo-did',
      'foundation',
      'In a geo lift test, treated markets rose by 16 units on average while control markets rose by 5 units on average. What is the difference-in-differences estimate?',
      11,
      'Difference-in-differences is treated change minus control change: 16 - 5 = 11.',
      0.05,
    ),
    singleChoice(
      'checkpoint-adExperiments-07',
      'adExperiments',
      'precision',
      'intermediate',
      'If the observed lift stays similar but the test uses more traffic, respondents, or matched markets, the interval will usually:',
      [
        { value: 'narrow', label: 'Narrow' },
        { value: 'widen', label: 'Widen' },
        { value: 'stay', label: 'Stay exactly the same' },
        { value: 'reverse', label: 'Reverse direction automatically' },
      ],
      'narrow',
      'More traffic improves precision and typically narrows the interval.',
    ),
    singleChoice(
      'checkpoint-adExperiments-08',
      'adExperiments',
      'business-impact',
      'intermediate',
      'A lift estimate is statistically significant, but the lower confidence bound is only barely above zero. The best way to communicate that result is:',
      [
        { value: 'massive-win', label: 'It is a definitive massive win and cost analysis no longer matters' },
        { value: 'guaranteed-scale', label: 'The business should scale immediately without checking economics' },
        { value: 'credible-modest', label: 'The lift looks credible, but the commercially plausible range may still be modest' },
        { value: 'ignore-ci', label: 'The confidence interval can be ignored because the p-value is below alpha' },
      ],
      'credible-modest',
      'Statistical credibility and economic magnitude are separate questions, so the interval still matters.',
    ),
  ],
  adRegression: [
    singleChoice(
      'checkpoint-adRegression-01',
      'adRegression',
      'omitted-variable-bias',
      'foundation',
      'If a spend-response model omits branded demand or promotion intensity, the spend coefficient may:',
      [
        { value: 'absorb-confounding', label: 'Absorb part of those omitted effects and become biased' },
        { value: 'stay-pure', label: 'Stay perfectly causal automatically' },
        { value: 'equal-r2', label: 'Always equal the model R²' },
        { value: 'be-zero', label: 'Always become zero' },
      ],
      'absorb-confounding',
      'Omitted variables that move with spend can distort the spend coefficient.',
    ),
    singleChoice(
      'checkpoint-adRegression-02',
      'adRegression',
      'controlled-coefficient',
      'foundation',
      'An adjusted spend coefficient in a multiple regression is interpreted as:',
      [
        { value: 'holding-fixed', label: 'The change in predicted outcome for more spend while the controls are held fixed' },
        { value: 'guaranteed-causal', label: 'A guaranteed causal lift at every spend level' },
        { value: 'raw-association', label: 'The same thing as the raw bivariate slope' },
        { value: 'variance', label: 'The variance of the outcome' },
      ],
      'holding-fixed',
      'Adjusted coefficients are partial effects conditional on the included controls.',
    ),
    numeric(
      'checkpoint-adRegression-03',
      'adRegression',
      'adjusted-forecast',
      'foundation',
      'If the adjusted spend coefficient is 2.4 orders per extra $1k and spend rises by $6k while the controls stay fixed, what is the predicted order increase?',
      14.4,
      'Predicted change = 2.4 × 6 = 14.4 orders.',
      0.05,
    ),
    singleChoice(
      'checkpoint-adRegression-04',
      'adRegression',
      'causality',
      'foundation',
      'A high R² in an advertising regression still does not by itself prove:',
      [
        { value: 'fit', label: 'That the model explains a lot of sample variation' },
        { value: 'prediction', label: 'That the model can produce fitted values' },
        { value: 'causality', label: 'Causality or incrementality' },
        { value: 'association', label: 'That the predictors move with the outcome in the sample' },
      ],
      'causality',
      'Strong fit can coexist with confounding or reverse demand effects.',
    ),
    singleChoice(
      'checkpoint-adRegression-05',
      'adRegression',
      'intercept',
      'foundation',
      'Why should an advertising analyst be careful with the intercept in a spend-response model?',
      [
        { value: 'always-causal', label: 'Because the intercept is always the cleanest causal estimate in the model' },
        { value: 'zero-regime', label: 'Because zero spend may sit outside the relevant operating regime, so the intercept may not be operationally meaningful' },
        { value: 'same-r2', label: 'Because the intercept must always equal R²' },
        { value: 'variance-only', label: 'Because the intercept is just the variance of the outcome' },
      ],
      'zero-regime',
      'The intercept is mathematically necessary, but it may not be a meaningful planning quantity if zero spend is outside the relevant data regime.',
    ),
    singleChoice(
      'checkpoint-adRegression-06',
      'adRegression',
      'residual-pattern',
      'intermediate',
      'A curved pattern in residuals often suggests that:',
      [
        { value: 'nonlinear', label: 'The linear model is missing nonlinearity such as saturation or diminishing returns' },
        { value: 'perfect-fit', label: 'The line is perfectly specified' },
        { value: 'causal-proof', label: 'The model has proven incrementality' },
        { value: 'no-variance', label: 'There is no residual variance left' },
      ],
      'nonlinear',
      'Residual structure is evidence that the straight-line form may be too simple.',
    ),
    singleChoice(
      'checkpoint-adRegression-07',
      'adRegression',
      'naive-vs-adjusted',
      'intermediate',
      'If the naive spend slope drops sharply after controlling for branded demand or promotion intensity, the safest interpretation is:',
      [
        { value: 'causal-proof', label: 'The adjusted model has now proven pure incrementality' },
        { value: 'r2-zero', label: 'The model fit must now be zero' },
        { value: 'inflated-raw', label: 'The raw slope was absorbing part of the omitted demand or promo effect' },
        { value: 'never-control', label: 'Demand or promotion should never be used as controls' },
      ],
      'inflated-raw',
      'A sharp drop usually means the raw bivariate slope was overstating the media relationship because it was mixed with a confounder.',
    ),
    singleChoice(
      'checkpoint-adRegression-08',
      'adRegression',
      'extrapolation',
      'intermediate',
      'Why is forecasting far beyond the highest observed spend risky even when the fitted line looks strong inside the sample?',
      [
        { value: 'always-safe', label: 'It is not risky if R² is high' },
        { value: 'same-line', label: 'The same slope is guaranteed forever' },
        { value: 'pattern-break', label: 'Saturation, auction changes, or different media conditions can break the fitted pattern outside the observed range' },
        { value: 'means-zero', label: 'The mean of the outcome becomes zero beyond the sample' },
      ],
      'pattern-break',
      'Extrapolation goes beyond the data that anchored the fitted relationship.',
    ),
  ],
}

const assessmentItemPresentation: Partial<
  Record<
    string,
    Pick<AssessmentItem, 'scenario_title' | 'scenario_context' | 'decision_focus'>
  >
> = {
  'checkpoint-adDiagnostics-01': {
    scenario_title: 'Cross-channel reach audit',
    scenario_context:
      'A planner is combining two upper-funnel lines and needs unique household reach before signing off on more video budget.',
    decision_focus:
      'Adjust for overlap before you describe extra scale as incremental reach.',
  },
  'checkpoint-adDiagnostics-02': {
    scenario_title: 'Retail media mix review',
    scenario_context:
      'A commerce lead is blending sponsored products and DSP inventory and wants the plan-level new-to-brand expectation.',
    decision_focus:
      'Use weighted averages when tactic shares differ materially.',
  },
  'checkpoint-adDiagnostics-03': {
    scenario_title: 'Reach duplication check',
    scenario_context:
      'A streaming line is posting strong completion rates, but overlap analysis says it adds little unique reach beyond channels already in market.',
    decision_focus:
      'Separate persuasion or quality signals from true reach expansion.',
  },
  'checkpoint-adDiagnostics-04': {
    scenario_title: 'CTV frequency review',
    scenario_context:
      'A measurement lead is reviewing hook rate by frequency bucket before approving more spend into connected TV.',
    decision_focus:
      'Watch the weak tail because scaling often pushes more delivery into the least efficient buckets.',
  },
  'checkpoint-adDiagnostics-05': {
    scenario_title: 'Matched-market readiness scan',
    scenario_context:
      'A geo test looks balanced on average, but several pre-period weeks show unusually wide control-versus-treated gaps.',
    decision_focus:
      'Baseline instability raises the future noise floor even when the average gap looks small.',
  },
  'checkpoint-adDiagnostics-06': {
    scenario_title: 'Incremental cost distribution',
    scenario_context:
      'Weekly cost per incremental household varies across the flight, and the mean is noticeably lower than the median.',
    decision_focus:
      'Check whether a few unusually efficient weeks are flattering the overall average.',
  },
  'checkpoint-adDiagnostics-07': {
    scenario_title: 'Weekly efficiency scorecard',
    scenario_context:
      'The planning team tracks how often the flight stays below the cost-per-incremental-household cap.',
    decision_focus:
      'Translate counts into benchmark hit rates instead of saying the plan worked in only vague terms.',
  },
  'checkpoint-adDiagnostics-08': {
    scenario_title: 'Pre-period volatility monitor',
    scenario_context:
      'The spread of weekly geo gaps is widening before the test launch window.',
    decision_focus:
      'More baseline volatility usually means a weaker and noisier lift read later.',
  },
  'checkpoint-adExperiments-01': {
    scenario_title: 'Conversion lift design review',
    scenario_context:
      'A performance team is reading a user-level holdout on qualified-lead rate and needs the right statistical frame before scoring the result.',
    decision_focus:
      'Start by matching the business metric to the correct estimator type.',
  },
  'checkpoint-adExperiments-02': {
    scenario_title: 'Conversion lift readout',
    scenario_context:
      'A 14-day holdout compares exposed and control conversion rates for a paid social acquisition push.',
    decision_focus:
      'State lift in percentage points before jumping to relative or commercial storytelling.',
  },
  'checkpoint-adExperiments-03': {
    scenario_title: 'P-value interpretation check',
    scenario_context:
      'A stakeholder is reading the experiment dashboard and wants to translate a p-value into a business conclusion.',
    decision_focus:
      'Do not convert p-values into posterior certainty about the winning variant.',
  },
  'checkpoint-adExperiments-04': {
    scenario_title: 'Brand lift survey readout',
    scenario_context:
      'Survey responses from exposed and control groups are being compared for aided recall after a video campaign.',
    decision_focus:
      'Compute the observed lift cleanly before discussing whether it is big enough to matter.',
  },
  'checkpoint-adExperiments-05': {
    scenario_title: 'Confidence interval readout',
    scenario_context:
      'The incrementality summary shows a positive point estimate, but the interval spans both slightly negative and positive lift.',
    decision_focus:
      'Use the interval to separate directional optimism from what the data have actually ruled out.',
  },
  'checkpoint-adExperiments-06': {
    scenario_title: 'Geo lift estimate',
    scenario_context:
      'Matched markets were measured before and after a regional media increase, and both treated and control geos moved during the same period.',
    decision_focus:
      'Difference-in-differences removes the shared market movement before attributing the remainder to the intervention.',
  },
  'checkpoint-adExperiments-07': {
    scenario_title: 'Test sizing discussion',
    scenario_context:
      'The team is deciding whether to add more traffic, respondents, or markets to tighten the experiment read.',
    decision_focus:
      'Precision usually improves when you increase the effective sample size while the effect stays similar.',
  },
  'checkpoint-adExperiments-08': {
    scenario_title: 'Readout memo',
    scenario_context:
      'A statistically significant lift estimate has a lower bound just above zero, and finance is asking whether the campaign is now an easy scale call.',
    decision_focus:
      'Distinguish statistical credibility from business magnitude and unit economics.',
  },
  'checkpoint-adRegression-01': {
    scenario_title: 'Spend-response rebuild',
    scenario_context:
      'A media analyst is modeling orders on spend, but the current spec ignores branded demand and promotion intensity.',
    decision_focus:
      'Missing demand drivers can leak into the spend coefficient and distort the story.',
  },
  'checkpoint-adRegression-02': {
    scenario_title: 'Adjusted coefficient interpretation',
    scenario_context:
      'The model now includes spend, branded search demand, promo intensity, and seasonality controls.',
    decision_focus:
      'Interpret the spend coefficient as a conditional association, not an automatic causal effect.',
  },
  'checkpoint-adRegression-03': {
    scenario_title: 'Budget change forecast',
    scenario_context:
      'A planner wants to use the adjusted coefficient to estimate the outcome impact of a modest spend increase within the observed data range.',
    decision_focus:
      'Translate slope units correctly before turning the model into a forecast.',
  },
  'checkpoint-adRegression-04': {
    scenario_title: 'Fit versus incrementality',
    scenario_context:
      'The team is impressed by a high R-squared and is close to treating the model as proof of media causality.',
    decision_focus:
      'Good in-sample fit does not remove confounding or reverse-demand risk.',
  },
  'checkpoint-adRegression-05': {
    scenario_title: 'Intercept sanity check',
    scenario_context:
      'A stakeholder wants to read the intercept as the baseline order volume at zero spend.',
    decision_focus:
      'Ask whether zero spend is even part of the operating regime represented in the data.',
  },
  'checkpoint-adRegression-06': {
    scenario_title: 'Residual diagnostics',
    scenario_context:
      'Residuals still show a visible curve after fitting a straight-line spend-response model.',
    decision_focus:
      'Residual structure is often evidence of diminishing returns or another missing nonlinear pattern.',
  },
  'checkpoint-adRegression-07': {
    scenario_title: 'Naive versus adjusted comparison',
    scenario_context:
      'The raw bivariate spend slope drops sharply after adding demand and promotion controls.',
    decision_focus:
      'A large drop is a warning that the raw slope was absorbing omitted demand effects.',
  },
  'checkpoint-adRegression-08': {
    scenario_title: 'Extrapolation risk review',
    scenario_context:
      'The business wants to forecast performance at spend levels well above the historical sample because the fitted line looks strong in-range.',
    decision_focus:
      'Outside the observed range, saturation, auction shifts, and channel mix changes can break the fitted pattern.',
  },
}

export const assessment_items = Object.fromEntries(
  Object.values(moduleCheckpointItems)
    .flat()
    .map((item) => [item.item_id, { ...item, ...(assessmentItemPresentation[item.item_id] ?? {}) }]),
) satisfies Record<string, AssessmentItem>

export const checkpoint_forms_by_module = moduleOrder.reduce<Record<ModuleKey, AssessmentForm>>(
  (accumulator, module_key) => {
    const itemCount = moduleCheckpointItems[module_key].length
    const isAdvertisingModule = moduleRegistry[module_key].pathway === 'Advertising Analytics'
    accumulator[module_key] = {
      assessment_id: moduleRegistry[module_key].checkpointAssessmentId,
      form_version: '2026.1',
      title: `${moduleRegistry[module_key].title} Checkpoint`,
      subtitle: isAdvertisingModule ? 'Applied scenario checkpoint' : 'Objective short-form practice',
      mode: 'checkpoint',
      module_key,
      duration_minutes: Math.max(12, Math.ceil(itemCount * 2)),
      instructions:
        isAdvertisingModule
          ? 'Work each item like a real measurement readout: compute the statistic, pressure-test the interpretation, and avoid overstating what the data prove.'
          : 'Answer each item without external help, then review the rationale to diagnose the specific skill you need to tighten.',
      item_ids: moduleCheckpointItems[module_key].map((item) => item.item_id),
    }
    return accumulator
  },
  {} as Record<ModuleKey, AssessmentForm>,
)

export const formal_assessment_forms = {
  'core-statistics-diagnostic': {
    assessment_id: 'core-statistics-diagnostic',
    form_version: '2026.1',
    title: 'Core Statistics Diagnostic',
    subtitle: 'Comprehensive review across descriptive statistics, inference, and modeling',
    mode: 'diagnostic',
    duration_minutes: 35,
    instructions:
      'Work independently and choose the strongest answer you can justify from first principles.',
    item_ids: [
      'checkpoint-descriptive-02',
      'checkpoint-descriptive-04',
      'checkpoint-probability-01',
      'checkpoint-probability-03',
      'checkpoint-expectation-01',
      'checkpoint-distributions-03',
      'checkpoint-distributions-04',
      'checkpoint-covariance-04',
      'checkpoint-sampling-01',
      'checkpoint-sampling-05',
      'checkpoint-lln-02',
      'checkpoint-confidence-01',
      'checkpoint-confidence-04',
      'checkpoint-testing-01',
      'checkpoint-testing-04',
      'checkpoint-regression-02',
      'checkpoint-regression-03',
      'checkpoint-anova-03',
      'checkpoint-bootstrap-01',
      'checkpoint-bootstrap-04',
    ],
  },
  'advertising-analytics-diagnostic': {
    assessment_id: 'advertising-analytics-diagnostic',
    form_version: '2026.1',
    title: 'Advertising Analytics Diagnostic',
    subtitle: 'Campaign interpretation, experimentation, and spend-response modeling',
    mode: 'diagnostic',
    duration_minutes: 35,
    instructions:
      'Answer in an applied decision-making frame. The goal is interpretation quality and technical accuracy, not rote memorization.',
    item_ids: [
      'checkpoint-adDiagnostics-01',
      'checkpoint-adDiagnostics-02',
      'checkpoint-adDiagnostics-03',
      'checkpoint-adDiagnostics-04',
      'checkpoint-adDiagnostics-05',
      'checkpoint-adDiagnostics-06',
      'checkpoint-adExperiments-01',
      'checkpoint-adExperiments-02',
      'checkpoint-adExperiments-03',
      'checkpoint-adExperiments-04',
      'checkpoint-adExperiments-05',
      'checkpoint-adExperiments-06',
      'checkpoint-adExperiments-07',
      'checkpoint-adRegression-01',
      'checkpoint-adRegression-02',
      'checkpoint-adRegression-03',
      'checkpoint-adRegression-04',
      'checkpoint-adRegression-05',
      'checkpoint-adRegression-06',
      'checkpoint-adRegression-07',
    ],
  },
} satisfies Record<string, AssessmentForm>

export const assessment_forms = {
  ...checkpoint_forms_by_module,
  ...formal_assessment_forms,
}

export const formal_assessment_catalog: AssessmentCatalogEntry[] = [
  {
    assessment_id: 'core-statistics-diagnostic',
    title: 'Core Statistics Diagnostic',
    subtitle: 'Timed diagnostic',
    mode: 'diagnostic',
    duration_minutes: 35,
    audience: 'General statistics learners',
    description:
      'A 20-item review spanning descriptive analysis, probability, inference, regression, ANOVA, and resampling.',
    route_path: '/assess/core-statistics-diagnostic',
  },
  {
    assessment_id: 'advertising-analytics-diagnostic',
    title: 'Advertising Analytics Diagnostic',
    subtitle: 'Timed diagnostic',
    mode: 'diagnostic',
    duration_minutes: 35,
    audience: 'Advertising and growth operators',
    description:
      'A 20-item review emphasizing campaign interpretation, lift experiments, uncertainty, and spend-response modeling.',
    route_path: '/assess/advertising-analytics-diagnostic',
  },
]

export function getAssessmentForm(assessment_id: string) {
  return assessment_forms[assessment_id as keyof typeof assessment_forms]
}

export function getCheckpointForm(module_key: ModuleKey) {
  return checkpoint_forms_by_module[module_key]
}
