const { useEffect, useState } = React;
const params = new URLSearchParams(window.location.search);
const currentUser = params.get('username') || 'Guest';

function Dashboard() {
  const [polls, setPolls] = useState([]);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState('');
  const [userVotes, setUserVotes] = useState({});
  const [selectedPollId, setSelectedPollId] = useState(null);

  const selectedPoll = polls.find((poll) => poll.id === selectedPollId);

  useEffect(() => {
    fetch('/polls/all')
      .then((response) => response.json())
      .then((data) => {
        setPolls(data);
        if (data.length > 0) {
          setSelectedPollId(data[0].id);
        }
      });

    fetch(`/polls/user-votes?username=${encodeURIComponent(currentUser)}`)
      .then((response) => response.json())
      .then((votes) => {
        const votesMap = {};
        votes.forEach((vote) => {
          votesMap[vote.pollId] = vote.optionIndex;
        });
        setUserVotes(votesMap);
      });
  }, []);

  const createPoll = async () => {
    const optionsArray = options.split(',').map((option) => option.trim());
    const response = await fetch('/polls/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, options: optionsArray, creator: currentUser })
    });
    const newPoll = await response.json();
    setPolls([...polls, newPoll]);
    setSelectedPollId(newPoll.id);
    setQuestion('');
    setOptions('');
  };

  const handleVote = async (pollId, optionIndex) => {
    const response = await fetch('/polls/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId, optionIndex, username: currentUser })
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    setPolls(polls.map((poll) => poll.id === pollId ? data : poll));

    const newUserVotes = { ...userVotes };
    if (userVotes[pollId] === optionIndex) {
      delete newUserVotes[pollId];
    } else {
      newUserVotes[pollId] = optionIndex;
    }
    setUserVotes(newUserVotes);
  };

  const renderPollChart = (poll) => {
    const highestVoteCount = Math.max(...poll.options.map((option) => option.votes), 1);

    return (
      <div className="poll-chart">
        {poll.options.map((option, index) => {
          const width = `${(option.votes / highestVoteCount) * 100}%`;

          return (
            <div key={index} className="chart-row">
              <span className="chart-label">{option.text}</span>
              <div className="chart-track">
                <div className="chart-bar" style={{ width }}></div>
              </div>
              <span className="chart-count">{option.votes}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <h1>Poll Dashboard - Welcome {currentUser}</h1>
      <a href="/"><button>Log Out</button></a>
      <div className="create-poll">
        <h2>Create a New Poll</h2>
        <input placeholder="Question" value={question} onChange={(event) => setQuestion(event.target.value)} /><br />
        <input placeholder="Options (comma separated)" value={options} onChange={(event) => setOptions(event.target.value)} /><br />
        <button onClick={createPoll}>Create Poll</button>
      </div>

      <h2>Polls</h2>
      <div className="poll-layout">
        <div className="poll-list">
          {polls.map((poll) => (
            <button
              key={poll.id}
              type="button"
              className={`poll-card ${selectedPollId === poll.id ? 'selected-poll' : ''}`}
              onClick={() => setSelectedPollId(poll.id)}
            >
              <h4>{poll.question}</h4>
              <p>Created by: {poll.creator}</p>
            </button>
          ))}
        </div>

        {selectedPoll && (
          <div className="poll-detail">
            <h2>{selectedPoll.question}</h2>
            <p>Created by: {selectedPoll.creator}</p>

            <div className="poll-options">
              {selectedPoll.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleVote(selectedPoll.id, index)}
                  className={userVotes[selectedPoll.id] === index ? 'voted-option' : ''}
                >
                  {option.text} ({option.votes})
                </button>
              ))}
            </div>

            {renderPollChart(selectedPoll)}
          </div>
        )}

        {!selectedPoll && polls.length === 0 && (
          <p>No polls yet.</p>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);
