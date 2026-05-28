const VALID_CATEGORIES = new Set(['Food', 'Location', 'Opinion']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateCreatePollInput({ question, options, category } = {}) {
  if (typeof question !== 'string' || question.trim().length === 0) {
    return 'Question is required';
  }

  if (!Array.isArray(options)) {
    return 'Options must be an array';
  }

  if (options.some((option) => typeof option !== 'string')) {
    return 'Each option must be a string';
  }

  const normalizedOptions = options
    .map((option) => option.trim())
    .filter((option) => option.length > 0);

  if (normalizedOptions.length < 2) {
    return 'Polls must have at least two options';
  }

  const uniqueOptions = new Set(normalizedOptions.map((option) => option.toLowerCase()));
  if (uniqueOptions.size !== normalizedOptions.length) {
    return 'Poll options must be unique';
  }

  if (category !== undefined && !VALID_CATEGORIES.has(category)) {
    return 'Invalid category';
  }

  return null;
}

function normalizeCreatePollInput({ question, options, category }) {
  return {
    question: question.trim(),
    options: options.map((option) => option.trim()).filter((option) => option.length > 0),
    category: category || 'Opinion'
  };
}

function isValidPollId(pollId) {
  return typeof pollId === 'string' && UUID_PATTERN.test(pollId);
}

function validateVoteInput({ pollId, optionIndex } = {}) {
  if (!isValidPollId(pollId)) {
    return 'Invalid pollId';
  }

  if (!Number.isInteger(optionIndex) || optionIndex < 0) {
    return 'Invalid optionIndex';
  }

  return null;
}

module.exports = {
  validateCreatePollInput,
  normalizeCreatePollInput,
  isValidPollId,
  validateVoteInput
};
