const express = require('express');
const pollService = require('../services/pollService');
const { requireAuth } = require('../middleware/authMiddleware'); // import middleware
const router = express.Router();

const VALID_CATEGORIES = new Set(['Food', 'Location', 'Opinion']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validatePollData({ question, options, category } = {}) {
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

function normalizePollData({ question, options, category }) {
  return {
    question: question.trim(),
    options: options.map((option) => option.trim()).filter((option) => option.length > 0),
    category: category || 'Opinion'
  };
}

function validatePollId(pollId) {
  return typeof pollId === 'string' && UUID_PATTERN.test(pollId);
}

// anyone can view all polls
router.get('/all', async (req, res) => {
  try {
    res.json(await pollService.getAllPolls());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// protect all routes below this line
router.use(requireAuth);

router.get('/user-votes', async (req, res) => {
  try {
    res.json(await pollService.getUserVotes(req.user.username)); // securely extracted from token
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/create', async (req, res) => {
  const validationError = validatePollData(req.body);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const pollData = {
    ...normalizePollData(req.body),
    creator: req.user.username
  }; // securely set creator

  try {
    const newPoll = await pollService.createPoll(pollData);
    res.json(newPoll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  const pollId = req.params.id;

  if (!validatePollId(pollId)) {
    return res.status(400).json({ message: 'Invalid pollId' });
  }

  try {
    const result = await pollService.deletePoll(pollId, req.user.username); // securely set user
    if(result.error) return res.status(result.status).json({ message: result.error });
    res.json({ message: 'Poll Deleted'});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/vote', async (req, res) => {
  const { pollId, optionIndex } = req.body;

  if (!validatePollId(pollId)) {
    return res.status(400).json({ message: 'Invalid pollId' });
  }

  if (!Number.isInteger(optionIndex) || optionIndex < 0) {
    return res.status(400).json({ message: 'Invalid optionIndex' });
  }

  const voteData = { ...req.body, username: req.user.username }; // securely set voter
  try {
    const result = await pollService.voteOnPoll(voteData);
    if (result.error) return res.status(result.status).json({ message: result.error });
    res.json(result.poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
