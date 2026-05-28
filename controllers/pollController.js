const pollService = require('../services/pollService');
const {
  validateCreatePollInput,
  normalizeCreatePollInput,
  isValidPollId,
  validateVoteInput
} = require('../validators/pollValidator');

async function getAllPolls(req, res) {
  try {
    res.json(await pollService.getAllPolls());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getUserVotes(req, res) {
  try {
    res.json(await pollService.getUserVotes(req.user.username));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function createPoll(req, res) {
  const validationError = validateCreatePollInput(req.body);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const pollData = {
    ...normalizeCreatePollInput(req.body),
    creator: req.user.username
  };

  try {
    const newPoll = await pollService.createPoll(pollData);
    res.json(newPoll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function deletePoll(req, res) {
  const pollId = req.params.id;

  if (!isValidPollId(pollId)) {
    return res.status(400).json({ message: 'Invalid pollId' });
  }

  try {
    const result = await pollService.deletePoll(pollId, req.user.username);
    if (result.error) return res.status(result.status).json({ message: result.error });
    res.json({ message: 'Poll Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function voteOnPoll(req, res) {
  const validationError = validateVoteInput(req.body);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const voteData = { ...req.body, username: req.user.username };

  try {
    const result = await pollService.voteOnPoll(voteData);
    if (result.error) return res.status(result.status).json({ message: result.error });
    res.json(result.poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  getAllPolls,
  getUserVotes,
  createPoll,
  deletePoll,
  voteOnPoll
};
