
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update your password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">

      <nav className="auth-navbar">
        <Link href="/" className="brand">
          <span className="brand-icon">T</span>
          Talent<span className="brand-light">Link</span>
        </Link>

        <Link href="/login" className="auth-back">
          ← Back to Login
        </Link>
      </nav>

      <section className="register-container login-container">

        <div className="register-heading">
          <span className="section-label">
            ACCOUNT SECURITY
          </span>

          <h1>Reset your password.</h1>

          <p>
            Choose a new secure password for your
            Talent Link account.
          </p>
        </div>

        <div className="register-card login-card">

          {success ? (

            <div className="success-message">
              <div className="success-icon">✓</div>

              <h2>Password updated!</h2>

              <p>
                Your password has been changed successfully.
                You can now sign in using your new password.
              </p>

              <Link
                href="/login"
                className="primary-button"
              >
                Continue to Login →
              </Link>
            </div>

          ) : (

            <>
              <h2>Create a new password</h2>

              <form
                className="register-form"
                onSubmit={handleReset}
              >

                <div className="form-field">
                  <label htmlFor="new-password">
                    New password
                  </label>

                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="At least 8 characters"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="confirm-password">
                    Confirm new password
                  </label>

                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="Enter password again"
                    required
                  />
                </div>

                {error && (
                  <div className="error-message" role="alert">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="primary-button register-submit"
                  disabled={loading}
                >
                  {loading
                    ? "Updating Password..."
                    : "Update Password →"}
                </button>

              </form>
            </>
          )}

        </div>
      </section>

      <footer className="auth-footer">
        Talent Link © 2026 · Connecting talent. Unlocking opportunity.
      </footer>

    </main>
  );
}
