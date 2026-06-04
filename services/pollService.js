const supabase = require('./supabaseClient');

const POLL_WITH_OPTIONS_SELECT = `
  id,
  question,
  category,
  creator_username,
  is_open,
  voting_type,
  max_choices,
  closes_at,
  poll_options (
    id,
    text,
    votes,
    option_index
  )
`;

function isPollExpired(closesAt) {
  return Boolean(closesAt) && new Date(closesAt) <= new Date();
}

function getEffectiveIsOpen(poll) {
  return poll.is_open && !isPollExpired(poll.closes_at);
}

function getClosesAt(closeAfterMinutes) {
  if (!closeAfterMinutes) return null;

  const closesAt = new Date();
  closesAt.setMinutes(closesAt.getMinutes() + closeAfterMinutes);
  return closesAt.toISOString();
}

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
    isOpen: getEffectiveIsOpen(poll),
    votingType: poll.voting_type,
    maxChoices: poll.max_choices,
    closesAt: poll.closes_at,
    options
  };
}

async function getAllPolls() {
  const { data, error } = await supabase
    .from('polls')
    .select(`created_at, ${POLL_WITH_OPTIONS_SELECT}`)
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

async function createPoll({ question, options, creator, category, votingType, maxChoices, closeAfterMinutes }) {
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({
      question,
      category: category || 'Opinion',
      creator_username: creator,
      voting_type: votingType || 'single',
      max_choices: maxChoices,
      closes_at: getClosesAt(closeAfterMinutes)
    })
    .select('id, question, category, creator_username, is_open, voting_type, max_choices, closes_at')
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
    .select(POLL_WITH_OPTIONS_SELECT)
    .eq('id', pollId)
    .single();

  if (error) {
    throw error;
  }

  return formatPoll(poll);
}

async function recalculateRankedPollScores(pollId, totalOptionsCount) {
  const { data: options, error: optionsError } = await supabase
    .from('poll_options')
    .select('id')
    .eq('poll_id', pollId);

  if (optionsError) {
    throw optionsError;
  }

  const scoreByOptionId = {};
  options.forEach((option) => {
    scoreByOptionId[option.id] = 0;
  });

  const { data: rankedVotes, error: votesError } = await supabase
    .from('votes')
    .select('option_id, rank')
    .eq('poll_id', pollId);

  if (votesError) {
    throw votesError;
  }

  rankedVotes.forEach((vote) => {
    if (vote.rank === null || vote.rank === undefined) return;
    scoreByOptionId[vote.option_id] += totalOptionsCount - vote.rank;
  });

  await Promise.all(options.map(async (option) => {
    const { error: updateError } = await supabase
      .from('poll_options')
      .update({ votes: scoreByOptionId[option.id] })
      .eq('id', option.id);

    if (updateError) {
      throw updateError;
    }
  }));
}

async function voteOnPoll({ pollId, optionIndex, rankedChoices, username }) {
  const { data: pollData, error: pollFetchError } = await supabase
    .from('polls')
    .select('is_open, voting_type, max_choices, closes_at')
    .eq('id', pollId)
    .single();

  if (pollFetchError || !pollData) {
    return { status: 404, error: 'Poll not found' };
  }

  if (!getEffectiveIsOpen(pollData)) {
    return { status: 403, error: 'This poll is currently closed.' };
  }

  const votingType = pollData.voting_type || 'single';

  if (votingType === 'multiple') {
    const option = await getPollOption(pollId, optionIndex);
    if (!option) {
      return { status: 400, error: 'Invalid option' };
    }

    const { data: existingVote, error: existingVoteError } = await supabase
      .from('votes')
      .select('id')
      .eq('username', username)
      .eq('poll_id', pollId)
      .eq('option_id', option.id)
      .maybeSingle();

    if (existingVoteError) {
      throw existingVoteError;
    }

    if (existingVote) {
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

      return await getPollById(pollId);
    }

    if (pollData.max_choices !== null) {
      const { count, error: countError } = await supabase
        .from('votes')
        .select('id', { count: 'exact', head: true })
        .eq('username', username)
        .eq('poll_id', pollId);

      if (countError) {
        throw countError;
      }

      if (count >= pollData.max_choices) {
        return {
          status: 400,
          error: `You can only vote for ${pollData.max_choices} option${pollData.max_choices === 1 ? '' : 's'}.`
        };
      }
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
      throw insertVoteError;
    }

    const { error: incrementError } = await supabase
      .from('poll_options')
      .update({ votes: option.votes + 1 })
      .eq('id', option.id);

    if (incrementError) {
      throw incrementError;
    }

    return await getPollById(pollId);
  }

  if (votingType === 'ranked') {
    if (!rankedChoices || !Array.isArray(rankedChoices)) {
      return { status: 400, error: 'Ranked choices missing or invalid' };
    }

    const { data: allOptions, error: allOptionsError } = await supabase
      .from('poll_options')
      .select('id, option_index')
      .eq('poll_id', pollId);

    if (allOptionsError) {
      throw allOptionsError;
    }

    const totalOptionsCount = allOptions.length;

    const { error: cleanError } = await supabase
      .from('votes')
      .delete()
      .eq('username', username)
      .eq('poll_id', pollId);

    if (cleanError) {
      throw cleanError;
    }

    for (let currentRank = 0; currentRank < rankedChoices.length; currentRank++) {
      const targetIndex = rankedChoices[currentRank];
      const matchOpt = allOptions.find(o => o.option_index === targetIndex);
      if (!matchOpt) {
        continue;
      }

      const { error: rankInsertError } = await supabase
        .from('votes')
        .insert({
          poll_id: pollId,
          option_id: matchOpt.id,
          username,
          option_index: targetIndex,
          rank: currentRank
        });

      if (rankInsertError) {
        throw rankInsertError;
      }
    }

    await recalculateRankedPollScores(pollId, totalOptionsCount);

    return await getPollById(pollId);
  }

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
      const oldOption = await getPollOption(pollId, existingVote.option_index);

      if (oldOption) {
        const { error: decrementOldOptionError } = await supabase
          .from('poll_options')
          .update({ votes: Math.max(oldOption.votes - 1, 0) })
          .eq('id', oldOption.id);

        if (decrementOldOptionError) {
          throw decrementOldOptionError;
        }
      }

      const { error: updateVoteError } = await supabase
        .from('votes')
        .update({
          option_id: option.id,
          option_index: optionIndex
        })
        .eq('id', existingVote.id);

      if (updateVoteError) {
        throw updateVoteError;
      }

      const { error: incrementNewOptionError } = await supabase
        .from('poll_options')
        .update({ votes: option.votes + 1 })
        .eq('id', option.id);

      if (incrementNewOptionError) {
        throw incrementNewOptionError;
      }

      return await getPollById(pollId);
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

    return await getPollById(pollId);
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

    return await getPollById(pollId);
}

async function togglePollStatus(pollId, username) {
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('id, creator_username, is_open, closes_at')
    .eq('id', pollId)
    .maybeSingle();

  if (pollError) throw pollError;
  if (!poll) return { status: 404, error: 'Poll not found' };
  if (poll.creator_username !== username) return { status: 403, error: 'Only the creator can close this poll.' };

  const isOpen = getEffectiveIsOpen(poll);
  const updateFields = isOpen
    ? { is_open: false }
    : { is_open: true, closes_at: null };

  const { error: updateError } = await supabase
    .from('polls')
    .update(updateFields)
    .eq('id', pollId);

  if (updateError) throw updateError;
    return await getPollById(pollId);
}

async function addComment({ pollId, username, message }) {
  const {data, error} = await supabase
    .from('comments')
    .insert({
      poll_id: pollId,
      username,
      message
    })
    .select('*')
    .single();

  if(error) throw error;
    return data;
}

async function getPollComments(pollId) {
  const {data, error} = await supabase
    .from('comments')
    .select('*')
    .eq('poll_id', pollId)
    .order('created_at', { ascending: true });

  if(error) throw error;
    return data;
}

module.exports = {
  createPoll,
  getAllPolls,
  getUserVotes,
  voteOnPoll,
  deletePoll,
  togglePollStatus,
  getPollComments,
  addComment
};
