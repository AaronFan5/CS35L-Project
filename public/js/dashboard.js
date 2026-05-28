const { useEffect, useState } = React;

async function fetchCurrentUser() {
  const response = await fetch('/auth/me');

  if (!response.ok) {
    throw new Error('Not authenticated');
  }

  return response.json();
}

async function fetchUserVotes() {
  const response = await fetch('/polls/user-votes');
  return response.json();
}

async function fetchPolls() {
  const response = await fetch('/polls/all');
  return response.json();
}

async function fetchFollowing() {
  const response = await fetch('/users/me/following');
  return response.json();
}

async function createPollRequest(pollData) {
  const response = await fetch('/polls/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pollData)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  return data;
}

async function deletePollRequest(pollId) {
  const response = await fetch(`/polls/${pollId}`, { method: 'DELETE' });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message);
  }
}

async function voteOnPollRequest(pollId, optionIndex) {
  const response = await fetch('/polls/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pollId, optionIndex })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  return data;
}

async function followUserRequest(username) {
  const response = await fetch(`/users/${encodeURIComponent(username)}/follow`, {
    method: 'POST'
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  return data;
}

async function unfollowUserRequest(username) {
  const response = await fetch(`/users/${encodeURIComponent(username)}/follow`, {
    method: 'DELETE'
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  return data;
}

async function logoutRequest() {
  await fetch('/auth/logout', { method: 'POST' });
}

function votesByPollId(votes) {
  const votesMap = {};

  if (Array.isArray(votes)) {
    votes.forEach((vote) => {
      votesMap[vote.pollId] = vote.optionIndex;
    });
  }

  return votesMap;
}

function filterPolls(polls, { viewMode, currentUser, userVotes, followingUsers, activeFilter, searchTerm }) {
  return polls
    .filter(poll => {
      if (viewMode === 'Mine') return poll.creator === currentUser;
      if (viewMode === 'Voted') return userVotes.hasOwnProperty(poll.id);
      if (viewMode === 'Following') return followingUsers.includes(poll.creator);
      return true;
    })
    .filter(poll => activeFilter === 'All' ? true : poll.category === activeFilter)
    .filter(poll => poll.question.toLowerCase().includes(searchTerm.toLowerCase()));
}

function Dashboard() {
  const [currentUser, setCurrentUser] = useState('');
  const [polls, setPolls] = useState([]);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [userVotes, setUserVotes] = useState({});
  const [followingUsers, setFollowingUsers] = useState([]);
  const [selectedPollId, setSelectedPollId] = useState(null);
  const [category, setCategory] = useState('Opinion');
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('All');

  const selectedPoll = polls.find((poll) => poll.id === selectedPollId);

  const filteredPolls = filterPolls(polls, {
    viewMode,
    currentUser,
    userVotes,
    followingUsers,
    activeFilter,
    searchTerm
  });

  useEffect(() => {
    fetchCurrentUser()
      .then((data) => {
        setCurrentUser(data.username);
        return Promise.all([fetchUserVotes(), fetchFollowing()]);
      })
      .then(([votes, following]) => {
        setUserVotes(votesByPollId(votes));
        setFollowingUsers(Array.isArray(following) ? following : []);
      })
      .catch((err) => {
        console.error('Auth error:', err);
        if (err.message === 'Not authenticated') {
          window.location.href = '/auth/login';
        }
      });

    fetchPolls()
      .then((data) => {
        setPolls(data);
        if (data.length > 0) setSelectedPollId(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (filteredPolls.length > 0 && !filteredPolls.find(poll => poll.id === selectedPollId)) {
      setSelectedPollId(filteredPolls[0].id);
    }
  }, [activeFilter, followingUsers, polls, viewMode]);

  const updateOption = (index, value) => {
    setOptions(options.map((option, optionIndex) => optionIndex === index ? value : option));
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, optionIndex) => optionIndex !== index));
  };

  const createPoll = async () => {
    const optionsArray = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) { alert('Please enter a question.'); return; }
    if (optionsArray.length < 2) { alert('Please enter at least 2 options.'); return; }

    try {
      const newPoll = await createPollRequest({ question, options: optionsArray, category });
      setPolls([...polls, newPoll]);
      setSelectedPollId(newPoll.id);
      setQuestion('');
      setOptions(['', '']);
    } catch (error) {
      alert(error.message);
      return;
    }
  };

  const deletePoll = async (pollId) => {
    try {
      await deletePollRequest(pollId);
      const updatedPolls = polls.filter(poll => poll.id !== pollId);
      setPolls(updatedPolls);
      if (selectedPollId === pollId && updatedPolls.length > 0) {
        setSelectedPollId(updatedPolls[0].id);
      } else if (updatedPolls.length === 0) {
        setSelectedPollId(null);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const togglePollStatus = async (pollId) => {
    const response = await fetch('/polls/toggle-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId })
    });
    const data = await response.json();
    if (response.ok) {
      setPolls(polls.map((poll) => (poll.id === pollId ? data : poll)));
    } else {
      alert(data.message);
    }
  };

  const handleVote = async (pollId, optionIndex) => {
    let updatedPoll;

    try {
      updatedPoll = await voteOnPollRequest(pollId, optionIndex);
    } catch (error) {
      alert(error.message);
      return;
    }

    setPolls(polls.map((poll) => poll.id === pollId ? updatedPoll : poll));
    const newUserVotes = { ...userVotes };
    if (userVotes[pollId] === optionIndex) {
      delete newUserVotes[pollId];
    } else {
      newUserVotes[pollId] = optionIndex;
    }
    setUserVotes(newUserVotes);
  };

  const toggleFollow = async (username) => {
    const isFollowing = followingUsers.includes(username);

    try {
      if (isFollowing) {
        await unfollowUserRequest(username);
        setFollowingUsers((users) => users.filter((user) => user !== username));
      } else {
        await followUserRequest(username);
        setFollowingUsers((users) => (
          users.includes(username) ? users : [...users, username]
        ));
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    await logoutRequest();
    window.location.href = '/';
  };

  const renderPollChart = (poll) => {
    const highestVoteCount = Math.max(...poll.options.map((o) => o.votes), 1);
    return (
      <div className="poll-chart">
        {poll.options.map((option, index) => (
          <div key={index} className="chart-row">
            <span className="chart-label">{option.text}</span>
            <div className="chart-track">
              <div className="chart-bar" style={{ width: `${(option.votes / highestVoteCount) * 100}%` }}></div>
            </div>
            <span className="chart-count">{option.votes}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="dashboard-header">
        <span className="dashboard-title">Polls</span>
        <div className="nav-actions">
          {currentUser && <span className="nav-user">{currentUser}</span>}
          <button className="btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
        </div>
      </div>

      <div className="dashboard-body">
        <div className="create-poll">
          <h2>Create a poll</h2>
          <div className="form-group">
            <label>Question</label>
            <input placeholder="What do you want to ask?" value={question} onChange={(e) => setQuestion(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Options</label>
            <div className="option-input-list">
              {options.map((option, index) => (
                <div className="option-input-row" key={index}>
                  <input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-ghost btn-sm option-remove-button"
                    onClick={() => removeOption(index)}
                    disabled={options.length <= 2}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-ghost btn-sm add-option-button" onClick={addOption}>
              Add option
            </button>
          </div>
          <div className="create-poll-footer">
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Food">Food</option>
              <option value="Location">Location</option>
              <option value="Opinion">Opinion</option>
            </select>
            <button onClick={createPoll}>Create poll</button>
          </div>
        </div>

        <div className="tab-group">
          {['All', 'Following', 'Mine', 'Voted'].map(mode => (
            <button
              key={mode}
              className={`tab-btn${viewMode === mode ? ' active' : ''}`}
              onClick={() => setViewMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search polls..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          {['All', 'Food', 'Location', 'Opinion'].map(tab => (
            <button
              key={tab}
              className={`filter-pill${activeFilter === tab ? ' active' : ''}`}
              onClick={() => setActiveFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="poll-layout">
          <div className="poll-list">
            {filteredPolls.map((poll) => (
              <button
                key={poll.id}
                type="button"
                className={`poll-card${selectedPollId === poll.id ? ' selected-poll' : ''}`}
                onClick={() => setSelectedPollId(poll.id)}
              >
                <h4>{poll.question}</h4>
                <p>by {poll.creator}</p>
              </button>
            ))}
            {filteredPolls.length === 0 && (
              <p className="empty-state">No polls found.</p>
            )}
          </div>

          {selectedPoll && (
            <div className="poll-detail">
              <h2>{selectedPoll.question}</h2>
              
              <p className="poll-meta">
                Category: <strong>{selectedPoll.category}</strong> &middot; by {selectedPoll.creator}
              </p>

              {!selectedPoll.isOpen && <p style={{ color: '#7c2d12', fontWeight: 'bold' }}>🔒 This poll is closed to new votes.</p>}

              {selectedPoll.creator !== currentUser && (
                <button
                  className={`follow-button${followingUsers.includes(selectedPoll.creator) ? ' following' : ''}`}
                  onClick={() => toggleFollow(selectedPoll.creator)}
                  style={{ marginBottom: '16px' }}
                >
                  {followingUsers.includes(selectedPoll.creator) ? 'Following' : 'Follow'}
                </button>
              )}

              {selectedPoll.creator === currentUser && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <button onClick={() => deletePoll(selectedPoll.id)} className="delete-poll-button">Delete Poll</button>
                  <button onClick={() => togglePollStatus(selectedPoll.id)} className="btn-ghost">
                    {selectedPoll.isOpen ? 'Close Poll' : 'Reopen Poll'}
                  </button>
                </div>
              )}
              <div className="poll-options">
                {selectedPoll.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleVote(selectedPoll.id, index)}
                    className={userVotes[selectedPoll.id] === index ? 'voted-option' : ''}
                    disabled={!selectedPoll.isOpen}
                    style={{ opacity: !selectedPoll.isOpen ? 0.6 : 1, cursor: !selectedPoll.isOpen ? 'not-allowed' : 'pointer' }}
                  >
                    {option.text} ({option.votes})
                  </button>
                ))}
              </div>
              {renderPollChart(selectedPoll)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);