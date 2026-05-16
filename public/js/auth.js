const pageType = document.body.dataset.pageType || 'login';
const pageTitle = pageType === 'signup' ? 'Sign Up' : 'Login';
const pageHeadline = pageType === 'signup' ? 'Create your account' : 'Sign in to your account';
const { useState } = React;

function AuthForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);

    try {
      const response = await fetch(`/auth/${pageType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, username, password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Submit failed');
      }

      if (pageType === 'login') {
        window.location.href = `/dashboard`;
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>{pageTitle}</h1>
      <p>{pageHeadline}</p>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(event) => setName(event.target.value)} type="text" placeholder="Name" required />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email" required />
        </div>
        <div>
          <label htmlFor="username">Username</label>
          <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} type="text" placeholder="Username" required />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" required />
        </div>
        <button type="submit">{pageTitle}</button>
      </form>
      <div>
        {pageType === 'signup'
          ? <span>Already have an account? <a href="/auth/login">Login</a></span>
          : <span>Need an account? <a href="/auth/signup">Sign up</a></span>}
      </div>
      {error && <div>{error}</div>}
      {result && (
        <div>
          <strong>{result.type === 'signup' ? 'Signup Received' : 'Login Received'}</strong>
          <p>Name: {result.name}</p>
          <p>Email: {result.email}</p>
          <p>Username: {result.username}</p>
          <p>Password: {result.password}</p>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<AuthForm />);
