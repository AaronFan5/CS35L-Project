const supabase = require('./supabaseClient');

function formatPoll(poll) {
  const options = [...(poll.poll_options || [])]
    .sort((a, b) => a.option_index - b.option_index)
    .map((option) => ({
      text: option.text,
      votes: option.votes
    }));

  return {
    id: poll.id,
    question: poll.question,
    category: poll.category,
    creator: poll.creator_username,
    options
  };
}

async function getAllPolls() {
  const { data, error } = await supabase
    .from('polls')
    .select(`
      id,
      question,
      category,
      creator_username,
      created_at,
      poll_options (
        id,
        text,
        votes,
        option_index
      )
    `)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data.map(formatPoll);
}

async function getUserVotes(username) {
  const { data, error } = await supabase
    .from('votes')
    .select('poll_id, option_index')
    .eq('username', username);

  if (error) {
    throw error;
  }

  return data.map((vote) => ({
    pollId: vote.poll_id,
    optionIndex: vote.option_index
  }));
}

async function createPoll({ question, options, creator, category }) {
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({
      question,
      category: category || 'Opinion',
      creator_username: creator
    })
    .select('id, question, category, creator_username')
    .single();

  if (pollError) {
    throw pollError;
  }

  const optionRows = options.map((option, index) => ({
    poll_id: poll.id,
    text: option,
    option_index: index,
    votes: 0
  }));

  const { data: createdOptions, error: optionsError } = await supabase
    .from('poll_options')
    .insert(optionRows)
    .select('id, text, votes, option_index')
    .order('option_index', { ascending: true });

  if (optionsError) {
    throw optionsError;
  }

  return formatPoll({
    ...poll,
    poll_options: createdOptions
  });
}

async function deletePoll(pollId, username) {
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('id, creator_username')
    .eq('id', pollId)
    .maybeSingle();

  if (pollError) {
    throw pollError;
  }

  if (!poll) {
    return { status: 404, error: 'Poll not found' };
  }

  if (poll.creator_username !== username) {
    return { status: 403, error: 'Only the creator can delete this poll.' };
  }

  const { error: deleteError } = await supabase
    .from('polls')
    .delete()
    .eq('id', pollId);

  if (deleteError) {
    throw deleteError;
  }

  return {};
}

async function getPollOption(pollId, optionIndex) {
  const { data: option, error } = await supabase
    .from('poll_options')
    .select('id, poll_id, option_index, votes')
    .eq('poll_id', pollId)
    .eq('option_index', optionIndex)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return option;
}

async function getPollById(pollId) {
  const { data: poll, error } = await supabase
    .from('polls')
    .select(`
      id,
      question,
      category,
      creator_username,
      poll_options (
        id,
        text,
        votes,
        option_index
      )
    `)
    .eq('id', pollId)
    .single();

  if (error) {
    throw error;
  }

  return formatPoll(poll);
}

async function voteOnPoll({ pollId, optionIndex, username }) {
  const option = await getPollOption(pollId, optionIndex);

  if (!option) {
    return { status: 400, error: 'Invalid option' };
  }

  const { data: existingVote, error: existingVoteError } = await supabase
    .from('votes')
    .select('id, option_id, option_index')
    .eq('username', username)
    .eq('poll_id', pollId)
    .maybeSingle();

  if (existingVoteError) {
    throw existingVoteError;
  }

  if (existingVote) {
    if (existingVote.option_index !== optionIndex) {
      return { status: 400, error: 'You already voted on this poll' };
    }

    const { error: deleteVoteError } = await supabase
      .from('votes')
      .delete()
      .eq('id', existingVote.id);

    if (deleteVoteError) {
      throw deleteVoteError;
    }

    const { error: decrementError } = await supabase
      .from('poll_options')
      .update({ votes: Math.max(option.votes - 1, 0) })
      .eq('id', option.id);

    if (decrementError) {
      throw decrementError;
    }

    return { poll: await getPollById(pollId) };
  }

  const { error: insertVoteError } = await supabase
    .from('votes')
    .insert({
      poll_id: pollId,
      option_id: option.id,
      username,
      option_index: optionIndex
    });

  if (insertVoteError) {
    if (insertVoteError.code === '23505') {
      return { status: 400, error: 'You already voted on this poll' };
    }

    throw insertVoteError;
  }

  const { error: incrementError } = await supabase
    .from('poll_options')
    .update({ votes: option.votes + 1 })
    .eq('id', option.id);

  if (incrementError) {
    throw incrementError;
  }

  return { poll: await getPollById(pollId) };
}

module.exports = {
  createPoll,
  getAllPolls,
  getUserVotes,
  voteOnPoll,
  deletePoll
};
