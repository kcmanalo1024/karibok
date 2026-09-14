import React, { useState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { supabase } from './supabase';

const tagline = "Your Life Gets Chaotic. Your Tasks Don't Have To Be.";

export function SplashScreen() {
  return <main className="splash-screen" aria-label="KARIBOK is opening">
    <div className="splash-content">
      <img src="/karibok-logo.png" alt="KARIBOK" className="splash-logo" />
      <p>{tagline}</p>
      <div className="splash-loader" role="status" aria-label="Loading KARIBOK"><span /></div>
    </div>
  </main>;
}

export function AuthScreen({ sessionError, onRetry }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (busy || !supabase) return;
    setBusy(true);
    setFeedback(null);
    try {
      const { data, error } = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
      if (error) throw error;
      setPassword('');
      // Only the auth listener opens the workspace. A confirmation email alone is not a session.
      if (!data.session) {
        setFeedback({ error: false, text: mode === 'signup'
          ? 'Check your email to confirm your account, then sign in to your workspace.'
          : 'No active session was returned. Please try signing in again.' });
      }
    } catch (error) {
      setFeedback({ error: true, text: error.message || 'We could not sign you in. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-screen">
    <section className="auth-brand-panel" aria-label="Welcome to KARIBOK">
      <img src="/karibok-logo.png" alt="KARIBOK" className="auth-logo" />
      <div className="auth-brand-copy">
        <div className="eyebrow">STUDY · WORK · HUSTLE</div>
        <h1>{tagline}</h1>
        <p>A little structure. A little breathing room.<br />One task at a time.</p>
      </div>
      <p className="auth-motto">Isa-isa lang, uusad din.</p>
    </section>
    <section className="auth-form-panel" aria-labelledby="auth-title">
      <div className="auth-card">
        <div className="eyebrow">YOUR PERSONAL WORKSPACE</div>
        <h2 id="auth-title">{mode === 'login' ? 'Welcome back.' : 'Make room for progress.'}</h2>
        <p className="auth-description">{mode === 'login' ? 'Sign in and pick up where you left off.' : 'Create an account to start organizing your day.'}</p>
        <div className="auth-mode" aria-label="Account options">
          <button type="button" aria-pressed={mode === 'login'} disabled={busy} onClick={() => { setMode('login'); setFeedback(null); }}>Login</button>
          <button type="button" aria-pressed={mode === 'signup'} disabled={busy} onClick={() => { setMode('signup'); setFeedback(null); }}>Sign Up</button>
        </div>
{!supabase && (
  <p className="auth-feedback" role="status">
    Supabase is not connected in this build.
  </p>
)}        {sessionError && <div className="auth-feedback" role="alert"><p>{sessionError}</p><button className="text-btn" onClick={onRetry}>Retry session check</button></div>}
        <form onSubmit={submit} aria-busy={busy}>
          <label className="field" htmlFor="auth-email">Email</label>
          <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" disabled={busy || !supabase} />
          <label className="field" htmlFor="auth-password">Password</label>
          <input id="auth-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 8 : undefined} required value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'} disabled={busy || !supabase} />
          {feedback && <p className={`auth-feedback ${feedback.error ? 'auth-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
          <button className="primary auth-submit" type="submit" disabled={busy || !supabase}>
            {busy ? <><LoaderCircle className="loading-spin" size={17} /> Please wait…</> : <>{mode === 'login' ? 'Sign in' : 'Create an account'} <ArrowRight size={17} /></>}
          </button>
        </form>
        <p className="auth-footnote">Your tasks, projects, and progress. All in one place.</p>
      </div>
    </section>
  </main>;
}

export function WorkspaceLoading({ workspace }) {
  const [error, setError] = useState('');
  const failed = workspace.status.startsWith('Could not');
  return <main className="workspace-loading">
    <img className="splash-logo" src="/karibok-logo.png" alt="KARIBOK" />
    <h1>{workspace.user ? 'Opening your workspace…' : 'Checking your session…'}</h1>
    <p role="status">{workspace.status}</p>
    {!failed && <LoaderCircle className="loading-spin" size={22} aria-hidden="true" />}
    {failed && <div className="flex gap-3 flex-wrap justify-center"><button className="primary" onClick={() => workspace.retry().catch(e => setError(e.message))}>Retry connection</button><button className="secondary" onClick={() => workspace.signOut().catch(e => setError(e.message))}>Sign out</button></div>}
    {error && <p role="alert">{error}</p>}
  </main>;
}

