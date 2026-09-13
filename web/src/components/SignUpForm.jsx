import { useState } from 'react';
import { supabase } from '../api/supabase';

export default function SignUpForm({ onSwitchToSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    // With email confirmation off, signUp returns a session and useSession
    // swaps this screen out on its own. With it on, there's no session until
    // the user clicks the link in their inbox.
    if (!data.session) setPendingEmail(email);
  }

  if (pendingEmail) {
    return (
      <div className="login-wrap">
        <div className="card login">
          <h1>yournal</h1>
          <p className="login-sub">Check your inbox</p>
          <p className="login-notice">
            We sent a confirmation link to <strong>{pendingEmail}</strong>. Click it to
            finish creating your account, then sign in.
          </p>
          <button className="btn" type="button" onClick={onSwitchToSignIn}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <form className="card login" onSubmit={handleSubmit}>
        <h1>yournal</h1>
        <p className="login-sub">Start your journal</p>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span className="field-hint">At least 6 characters</span>
        </label>

        {error && <p className="login-error">{error}</p>}

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </button>

        <p className="login-switch">
          Already have an account?{' '}
          <button type="button" className="link-btn" onClick={onSwitchToSignIn}>
            Sign in
          </button>
        </p>
      </form>
    </div>
  );
}
