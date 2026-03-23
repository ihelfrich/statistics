function item(module_key, item_type, skill_tag, correct_answer, tolerance = undefined) {
  return { module_key, item_type, skill_tag, correct_answer, tolerance }
}

const itemBank = {
  'checkpoint-descriptive-02': item('descriptive', 'single_choice', 'resistance', 'median'),
  'checkpoint-descriptive-04': item('descriptive', 'single_choice', 'shape', 'mean-greater'),
  'checkpoint-probability-01': item('probability', 'numeric', 'union', 0.7, 0.01),
  'checkpoint-probability-03': item('probability', 'single_choice', 'conditional', 'joint-over-b'),
  'checkpoint-expectation-01': item('expectation', 'numeric', 'expected-value', 3.5, 0.01),
  'checkpoint-distributions-03': item('distributions', 'single_choice', 'empirical-rule', '2sd'),
  'checkpoint-distributions-04': item('distributions', 'numeric', 'binomial-mean', 3, 0.01),
  'checkpoint-covariance-04': item('covariance', 'single_choice', 'linear-association', 'no-linear'),
  'checkpoint-sampling-01': item('sampling', 'single_choice', 'standard-error', 'decreases'),
  'checkpoint-sampling-05': item('sampling', 'single_choice', 'clt', 'sample-mean'),
  'checkpoint-lln-02': item('lln', 'single_choice', 'misconception', 'small-sample-guarantee'),
  'checkpoint-confidence-01': item('confidence', 'single_choice', 'coverage', 'procedure'),
  'checkpoint-confidence-04': item('confidence', 'single_choice', 'difference', 'evidence-difference'),
  'checkpoint-testing-01': item('testing', 'single_choice', 'p-value', 'null-extreme'),
  'checkpoint-testing-04': item('testing', 'single_choice', 'power', 'larger-n'),
  'checkpoint-regression-02': item('regression', 'single_choice', 'residuals', 'observed-minus-predicted'),
  'checkpoint-regression-03': item('regression', 'single_choice', 'r-squared', 'variation'),
  'checkpoint-anova-03': item('anova', 'single_choice', 'omnibus', 'some-difference'),
  'checkpoint-bootstrap-01': item('bootstrap', 'single_choice', 'resampling', 'with-replacement'),
  'checkpoint-bootstrap-04': item('bootstrap', 'single_choice', 'intervals', 'bootstrap-quantiles'),
  'checkpoint-regression-05': item('regression', 'numeric', 'prediction', 5.4, 0.05),
  'checkpoint-adDiagnostics-01': item('adDiagnostics', 'single_choice', 'interpretation', 'few-strong'),
  'checkpoint-adDiagnostics-02': item('adDiagnostics', 'numeric', 'benchmark-hit-rate', 40, 0.1),
  'checkpoint-adDiagnostics-03': item('adDiagnostics', 'single_choice', 'segment-scale', 'efficient-not-scalable'),
  'checkpoint-adDiagnostics-04': item('adDiagnostics', 'single_choice', 'spread', 'middle-stability'),
  'checkpoint-adDiagnostics-05': item('adDiagnostics', 'single_choice', 'blended-metrics', 'hide-segments'),
  'checkpoint-adExperiments-01': item('adExperiments', 'single_choice', 'metric-type', 'proportions'),
  'checkpoint-adExperiments-02': item('adExperiments', 'single_choice', 'p-value', 'variant-true'),
  'checkpoint-adExperiments-03': item('adExperiments', 'single_choice', 'confidence-interval', 'supports-positive'),
  'checkpoint-adExperiments-04': item('adExperiments', 'numeric', 'absolute-lift', 0.6, 0.05),
  'checkpoint-adExperiments-05': item('adExperiments', 'single_choice', 'sample-size', 'narrow'),
  'checkpoint-adRegression-01': item('adRegression', 'single_choice', 'slope', 'avg-marginal'),
  'checkpoint-adRegression-02': item('adRegression', 'single_choice', 'causality', 'causality'),
  'checkpoint-adRegression-03': item('adRegression', 'single_choice', 'residual', 'above-line'),
  'checkpoint-adRegression-04': item('adRegression', 'single_choice', 'extrapolation', 'pattern-break'),
}

export const diagnosticForms = {
  'core-statistics-diagnostic': {
    assessment_id: 'core-statistics-diagnostic',
    form_version: '2026.1',
    duration_minutes: 35,
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
    duration_minutes: 35,
    item_ids: [
      'checkpoint-descriptive-04',
      'checkpoint-confidence-04',
      'checkpoint-testing-01',
      'checkpoint-testing-04',
      'checkpoint-regression-03',
      'checkpoint-regression-05',
      'checkpoint-adDiagnostics-01',
      'checkpoint-adDiagnostics-02',
      'checkpoint-adDiagnostics-03',
      'checkpoint-adDiagnostics-04',
      'checkpoint-adDiagnostics-05',
      'checkpoint-adExperiments-01',
      'checkpoint-adExperiments-02',
      'checkpoint-adExperiments-03',
      'checkpoint-adExperiments-04',
      'checkpoint-adExperiments-05',
      'checkpoint-adRegression-01',
      'checkpoint-adRegression-02',
      'checkpoint-adRegression-03',
      'checkpoint-adRegression-04',
    ],
  },
}

export function getDiagnosticForm(assessment_id) {
  return diagnosticForms[assessment_id]
}

export function getItemDefinition(item_id) {
  return itemBank[item_id]
}
