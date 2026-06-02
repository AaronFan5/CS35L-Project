const VALID_CATEGORIES = new Set(['Food', 'Location', 'Opinion']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateCreatePollInput({ question, options, category, votingType } = {}) {
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

  const votingTypes = new Set(['single', 'multiple', 'ranked']);
  if(votingType !== undefined && !votingTypes.has(votingType)) {
    return 'Invalid voting type';
  }

  return null;
}

function normalizeCreatePollInput({ question, options, category, votingType }) {
  return {
    question: question.trim(),
    options: options.map((option) => option.trim()).filter((option) => option.length > 0),
    category: category || 'Opinion',
    votingType: votingType || 'single'
  };
}

function isValidPollId(pollId) {
  return typeof pollId === 'string' && UUID_PATTERN.test(pollId);
}

function validateVoteInput({ pollId, optionIndex, rankedChoices } = {}) {
  if (!isValidPollId(pollId)) {
    return 'Invalid pollId';
  }

  if(rankedChoices != undefined){
    if(!Array.isArray(rankedChoices) || rankedChoices.length == 0) {
      return 'Ranked choices cannot be empty';
    }
    if(rankedChoices.some(idx => !Number.isInteger(idx) || idx < 0)) {
      return 'Ranked choices need to be a non-negative integer';
    }
    const uniqueChoices = new Set(rankedChoices);
    if(uniqueChoices.size !== rankedChoices.length) {
      return 'Ranked choices must be unique';
    }
  } else if (!Number.isInteger(optionIndex) || optionIndex < 0) {
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
