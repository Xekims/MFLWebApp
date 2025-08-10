// frontend/src/utils.js

/**
 * Determines the score band for a given role score.
 * @param {number} score - The role score.
 * @returns {'elite'|'strong'|'natural'|'weak'|'unusable'} - The score band.
 */
export const scoreBand = (score) => {
  if (score >= 50) return 'elite';
  if (score >= 20) return 'strong';
  if (score >= 0) return 'natural';
  if (score >= -20) return 'weak';
  return 'unusable';
};
