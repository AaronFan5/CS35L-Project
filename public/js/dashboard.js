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
  const data = await response.json();

  if(!response.ok) {
    throw new Error(data.message || 'Failed to fetch polls');
  }
  return data;
}

async function fetchFollowing() {
  const response = await fetch('/users/me/following');
  const data = await response.json();

  if(!response.ok) {
    throw new Error(data.message || 'Failed to fetch following users');
  }
  return data;
}

async function searchUsersRequest(query) {
  const response = await fetch(`/users/search?q=${encodeURIComponent(query)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  return data;
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
      if(!votesMap[vote.pollId]) {
        votesMap[vote.pollId] = [];
      }
      votesMap[vote.pollId].push(vote.optionIndex);
    });
  }
  for(const pollId in votesMap) {
    votesMap[pollId] = votesMap[pollId].join(',');
  }
  return votesMap;
}

function filterPolls(polls, { viewMode, currentUser, userVotes, followingUsers, activeFilter, searchTerm }) {
  return polls
    .filter(poll => {
      if (viewMode === 'Mine') return poll.creator === currentUser;
      if (viewMode === 'Voted') return userVotes.hasOwnProperty(poll.id) && userVotes[poll.id].length > 0;
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
  const [searchMode, setSearchMode] = useState('Polls');
  const [userResults, setUserResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [viewMode, setViewMode] = useState('All');
  const [votingType, setVotingType] = useState('single');

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

  useEffect(() => {
    const query = searchTerm.trim();

    if (searchMode !== 'Users' || !query) {
      setUserResults([]);
      setIsSearchingUsers(false);
      return;
    }

    setIsSearchingUsers(true);

    const timeoutId = setTimeout(() => {
      searchUsersRequest(query)
        .then((users) => {
          setUserResults(Array.isArray(users) ? users : []);
        })
        .catch((error) => {
          console.error('User search error:', error);
          setUserResults([]);
        })
        .finally(() => {
          setIsSearchingUsers(false);
        });
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchMode, searchTerm]);

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
      const newPoll = await createPollRequest({ question, options: optionsArray, category, votingType });
      setPolls([...polls, newPoll]);
      setSelectedPollId(newPoll.id);
      setQuestion('');
      setOptions(['', '']);
      setVotingType('single');
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
    const poll = polls.find((p) => p.id === pollId);
    const votingType = poll.votingType || 'single';
    let updatedPoll;

    try {
      if (votingType === 'ranked') {
        let currentRanks = userVotes[pollId] ? String(userVotes[pollId]).split(',').filter(Boolean).map(Number) : [];
        
        if (currentRanks.includes(optionIndex)) {
          currentRanks = currentRanks.filter((idx) => idx !== optionIndex);
        } else {
          currentRanks.push(optionIndex);
        }

        const response = await fetch('/polls/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pollId, rankedChoices: currentRanks })
        });

        if (!response.ok) {
          throw new Error('Failed to save ranked vote');
        }
        const responseData = await response.json();
        updatedPoll = responseData.poll ? responseData.poll : responseData;

        const newUserVotes = { ...userVotes };
        if (currentRanks.length === 0) {
          delete newUserVotes[pollId];
        } else {
          newUserVotes[pollId] = currentRanks.join(',');
        }
        setUserVotes(newUserVotes);

      } else {
        updatedPoll = await voteOnPollRequest(pollId, optionIndex);
        const newUserVotes = { ...userVotes };

        if (votingType === 'multiple') {
          let currentChoices = userVotes[pollId] ? String(userVotes[pollId]).split(',').filter(Boolean).map(Number) : [];
          
          if (currentChoices.includes(optionIndex)) {
            currentChoices = currentChoices.filter((idx) => idx !== optionIndex);
          } else {
            currentChoices.push(optionIndex);
          }

          if (currentChoices.length === 0) {
            delete newUserVotes[pollId];
          } else {
            newUserVotes[pollId] = currentChoices.join(',');
          }
        } else {
          if (userVotes[pollId] === optionIndex) {
            delete newUserVotes[pollId];
          } else {
            newUserVotes[pollId] = optionIndex;
          }
        }
        setUserVotes(newUserVotes);
      }

      setPolls(polls.map((p) => p.id === pollId ? updatedPoll.poll : p));
    } catch (error) {
      alert(error.message);
    }
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

        if (searchMode === 'Users') {
          setSearchMode('Polls');
          setSearchTerm('');
          setUserResults([]);
        }
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

            <select value={votingType} onChange={(e) => setVotingType(e.target.value)}>
              <option value="single">Single</option>
              <option value="multiple">Multiple</option>
              <option value="ranked">Ranked Choice</option>
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
          <div className="search-mode-toggle">
            {['Polls', 'Users'].map(mode => (
              <button
                key={mode}
                type="button"
                className={`search-mode-btn${searchMode === mode ? ' active' : ''}`}
                onClick={() => setSearchMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder={searchMode === 'Polls' ? 'Search polls...' : 'Search users...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {searchMode === 'Polls' && (
          <React.Fragment>
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
                    {selectedPoll.options.map((option, index) => {
                      const votingType = selectedPoll.votingType || 'single';
                      let isVoted = false;

                      if (votingType === 'single') {
                        isVoted = String(userVotes[selectedPoll.id]) === String(index);
                      } else {
                        const savedSelections = userVotes[selectedPoll.id] ? String(userVotes[selectedPoll.id]).split(',').filter(Boolean) : [];
                        isVoted = savedSelections.includes(String(index));
                      }
                      return (
                        <button
                          key={index}
                          onClick={() => handleVote(selectedPoll.id, index)}
                          className={isVoted ? 'voted-option' : ''}
                          disabled={!selectedPoll.isOpen}
                        >
                          {option.text} ({option.votes})
                        </button>
                      );
                    })}
                  </div>
                  {renderPollChart(selectedPoll)}
                </div>
              )}
            </div>
          </React.Fragment>
        )}

        {searchMode === 'Users' && (
          <div className="user-results">
            {isSearchingUsers && (
              <p className="empty-state">Searching users...</p>
            )}

            {!isSearchingUsers && searchTerm.trim() && userResults.map((user) => (
              <div className="user-result" key={user.username}>
                <div>
                  <h4>{user.username}</h4>
                  {user.name && <p>{user.name}</p>}
                </div>
                <button
                  className={`follow-button user-result-follow${followingUsers.includes(user.username) ? ' following' : ''}`}
                  onClick={() => toggleFollow(user.username)}
                >
                  {followingUsers.includes(user.username) ? 'Following' : 'Follow'}
                </button>
              </div>
            ))}

            {!isSearchingUsers && !searchTerm.trim() && (
              <p className="empty-state">Search for a username.</p>
            )}

            {!isSearchingUsers && searchTerm.trim() && userResults.length === 0 && (
              <p className="empty-state">No users found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);