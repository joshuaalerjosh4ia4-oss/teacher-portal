import type { FormEvent } from "react";
import { ErrorBanner, Logo } from "../components/Brand";

interface AuthPanelProps {
  userMustChangePassword: boolean;
  error: string;
  isSubmitting: boolean;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  onPasswordChange: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
}

export function AuthScreen({
  userMustChangePassword,
  error,
  isSubmitting,
  onLogin,
  onPasswordChange,
  onSignOut,
}: AuthPanelProps) {
  if (userMustChangePassword) {
    return (
      <main className="auth-wrap">
        <aside className="auth-story">
          <Logo />
          <div className="auth-story-copy">
            <span className="story-kicker">MYCLASSES TEACHER PORTAL</span>
            <p className="story-quote">Welcome to your school workspace.</p>
            <span className="story-rule" />
            <p className="story-note">Manage your classes, share updates, and keep your teaching day organized.</p>
          </div>
          <span className="story-footer">MYCLASSES · TEACHER WORKSPACE</span>
        </aside>
        <section className="auth-card" aria-labelledby="password-title">
          <span className="auth-step">ACCOUNT SECURITY <span>01 / 01</span></span>
          <p className="eyebrow">Before we begin</p>
          <h1 id="password-title">Set a new password</h1>
          <p className="lead">Your temporary password has done its job. Choose a new one to open your workspace.</p>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <form onSubmit={onPasswordChange}>
            <label className="field">New password
              <input name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
            </label>
            <label className="field">Confirm new password
              <input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
            </label>
            <button className="button button-primary full-width" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update password"}
            </button>
          </form>
          <button className="button button-secondary full-width" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-wrap">
      <aside className="auth-story">
        <Logo />
        <div className="auth-story-copy">
          <span className="story-kicker">MYCLASSES TEACHER PORTAL</span>
          <p className="story-quote">Welcome to your school workspace.</p>
          <span className="story-rule" />
          <p className="story-note">Manage your classes, share updates, and keep your teaching day organized.</p>
        </div>
        <span className="story-footer">MYCLASSES · TEACHER WORKSPACE</span>
      </aside>
      <section className="auth-card" aria-labelledby="login-title">
        <span className="auth-step">YOUR WORKSPACE <span>SECURE SIGN IN</span></span>
        <p className="eyebrow">Good to have you back</p>
        <h1 id="login-title">Sign in to teach</h1>
        <p className="lead">Pick up where your classes left off.</p>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <form onSubmit={onLogin}>
          <label className="field">Email address
            <input name="email" type="email" autoComplete="username" required maxLength={254} />
          </label>
          <label className="field">Password
            <input name="password" type="password" autoComplete="current-password" required maxLength={128} />
          </label>
          <button className="button button-primary full-width" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Continue to workspace"}
          </button>
        </form>
        <p className="hint auth-help">Need access? <span>Ask your administrator to set up a teacher account.</span></p>
      </section>
    </main>
  );
}
