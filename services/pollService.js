const fs = require('fs');
const path = require('path');

const pollsFile = path.join(__dirname, '..', 'data', 'polls.json');
const votesFile = path.join(__dirname, '..', 'data', 'votes.json');

function loadPolls() {
  try {
    const data = fs.readFileSync(pollsFile, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error loading polls:', error);
    return [];
  }
}

function savePolls(polls) {
  fs.writeFileSync(pollsFile, JSON.stringify(polls, null, 2), 'utf8');
}

function loadVotes() {
  try {
    const data = fs.readFileSync(votesFile, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error loading votes:', error);
    return [];
  }
}

function saveVotes(votes) {
  fs.mkdirSync(path.dirname(votesFile), { recursive: true });
  fs.writeFileSync(votesFile, JSON.stringify(votes, null, 2), 'utf8');
}

function getAllPolls() {
  return loadPolls();
}

function getUserVotes(username) {
  return loadVotes().filter((vote) => vote.username === username);
}

function createPoll({ question, options, creator, category }) {
  const polls = loadPolls();
  const newPoll = {
    id: Date.now().toString(),
    question,
    options: options.map((option) => ({ text: option, votes: 0 })),
    creator,
    category: category || 'Opinion'
  };

  polls.push(newPoll);
  savePolls(polls);
  return newPoll;
}

function deletePoll(pollId, username) {
  const polls = loadPolls();
  const poll = polls.find(p => p.id === pollId);

  if(!poll){
    return { status: 404, error: 'Poll not found' };
  }

  if(poll.creator !== username) {
    return {status: 403, error: 'Only the creator can delete this poll.'};
}

  const updatedPolls = polls.filter(p => p.id !== pollId);
  savePolls(updatedPolls);

  const votes = loadVotes();
  const updatedVotes = votes.filter(vote => vote.pollId !== pollId);
  saveVotes(updatedVotes);

  return {};
}

function voteOnPoll({ pollId, optionIndex, username }) {
  const votes = loadVotes();
  const existingVote = votes.find((vote) => vote.username === username && vote.pollId === pollId);

  const polls = loadPolls();
  const poll = polls.find((savedPoll) => savedPoll.id === pollId);

  if (!poll) {
    return { status: 404, error: 'Poll not found' };
  }

  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    return { status: 400, error: 'Invalid option' };
  }

  if (existingVote) {
    if (existingVote.optionIndex !== optionIndex) {
      return { status: 400, error: 'You already voted on this poll' };
    }

    poll.options[optionIndex].votes--;
    const voteIndex = votes.findIndex((vote) => vote.username === username && vote.pollId === pollId);
    votes.splice(voteIndex, 1);
    saveVotes(votes);
    savePolls(polls);
    return { poll };
  }

  poll.options[optionIndex].votes++;
  votes.push({ username, pollId, optionIndex });
  saveVotes(votes);
  savePolls(polls);
  return { poll };
}

module.exports = {
  createPoll,
  getAllPolls,
  getUserVotes,
  voteOnPoll,
  deletePoll
};
