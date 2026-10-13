// Deterministic career-profile-v1 scoring. Pure functions only: same inputs
// always produce the same outputs, scores stay within documented bounds, and
// ties resolve in a stable order. The POST /api/career-test route validates
// inputs before calling here; the guards below make misuse fail loudly
// instead of persisting NaN scores.
const CAREER_ASSESSMENT_DIMENSIONS = [
  'Software Engineering',
  'Data & Analytical Thinking',
  'AI & Computational Intelligence',
  'Systems & Infrastructure',
  'Security & Reliability',
  'Product & User Orientation',
  'Design & Human Experience',
  'Leadership & Delivery'
];

const CAREER_PROFILE_V1 = {
  'Software Developer': [0.95, 0.70, 0.65, 0.60, 0.55, 0.45, 0.40, 0.45],
  'Data Scientist': [0.55, 0.95, 0.90, 0.35, 0.40, 0.55, 0.35, 0.45],
  'Full Stack Developer': [0.95, 0.60, 0.55, 0.55, 0.50, 0.65, 0.65, 0.45],
  'Frontend Developer': [0.85, 0.45, 0.40, 0.30, 0.40, 0.80, 0.90, 0.50],
  'Backend Developer': [0.95, 0.65, 0.55, 0.65, 0.60, 0.45, 0.30, 0.45],
  'AI/ML Engineer': [0.80, 0.85, 1.00, 0.65, 0.50, 0.45, 0.30, 0.45],
  'Data Analyst': [0.45, 0.95, 0.55, 0.30, 0.40, 0.70, 0.40, 0.50],
  'Cloud Architect': [0.60, 0.60, 0.40, 1.00, 0.75, 0.50, 0.35, 0.75],
  'DevOps Engineer': [0.70, 0.55, 0.35, 0.95, 0.85, 0.40, 0.30, 0.60],
  'UI/UX Designer': [0.30, 0.35, 0.25, 0.20, 0.30, 0.90, 1.00, 0.55],
  'Product Manager': [0.35, 0.55, 0.35, 0.35, 0.40, 1.00, 0.65, 1.00]
};

function calculateCareerAssessmentV1(questionRows, submittedAnswers) {
  if (!Array.isArray(questionRows) || questionRows.length === 0) {
    throw new Error('calculateCareerAssessmentV1 requires a non-empty question list');
  }
  const dimensionValues = Object.fromEntries(CAREER_ASSESSMENT_DIMENSIONS.map(name => [name, []]));
  for (const question of questionRows) {
    if (!question || !CAREER_ASSESSMENT_DIMENSIONS.includes(question.category)) {
      throw new Error('calculateCareerAssessmentV1 received an unsupported assessment dimension');
    }
    const value = Number(submittedAnswers?.[question.id]);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error('calculateCareerAssessmentV1 requires integer Likert answers from 1 to 5');
    }
    dimensionValues[question.category].push((value - 1) / 4);
  }

  const dimensionScores = Object.fromEntries(CAREER_ASSESSMENT_DIMENSIONS.map(name => {
    const values = dimensionValues[name];
    if (!values.length) {
      throw new Error(`calculateCareerAssessmentV1 has no answered questions for dimension "${name}"`);
    }
    return [name, values.reduce((sum, value) => sum + value, 0) / values.length];
  }));

  const topCareers = Object.entries(CAREER_PROFILE_V1)
    .map(([career, profile]) => {
      const difference = profile.reduce((sum, reference, index) => {
        return sum + Math.abs(dimensionScores[CAREER_ASSESSMENT_DIMENSIONS[index]] - reference);
      }, 0) / CAREER_ASSESSMENT_DIMENSIONS.length;
      const similarity = 1 - difference;
      return { career, score: Number((similarity * 100).toFixed(2)), similarity };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
    .map(({ career, score }) => ({ career, score }));

  const strengths = CAREER_ASSESSMENT_DIMENSIONS
    .map((dimension, index) => ({ dimension, index, score: dimensionScores[dimension] }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map(({ dimension }) => `Strong ${dimension} orientation`);

  return { dimensionScores, topCareers, strengths };
}

module.exports = { CAREER_ASSESSMENT_DIMENSIONS, CAREER_PROFILE_V1, calculateCareerAssessmentV1 };
