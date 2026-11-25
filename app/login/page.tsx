"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getUserProfile";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // 1. Authenticate user with Supabase
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (loginError) {
        throw loginError;
      }

      if (!data.user) {
        throw new Error("Unable to retrieve your account.");
      }

      // 2. Load or auto-create the user's profile row
      const { profile, error: profileError } = await getOrCreateProfile();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error(
          profileError
            ? `Unable to load your profile: ${profileError}`
            : "Your profile could not be found. Please contact support."
        );
      }

      // 3. Redirect according to the registered role (with leading slashes)
      const dashboardRoutes: Record<string, string> = {
        refugee: "/dashboard/refugee",
        employer: "/dashboard/employer",
        mentor: "/dashboard/mentor",
      };

      const destination = dashboardRoutes[profile.role];

      if (!destination) {
        await supabase.auth.signOut();
        throw new Error("Your account has an invalid user role.");
      }

      router.replace(destination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please try again."
      );

      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );

      if (resetError) {
        throw resetError;
      }

      setSuccess(
        "If an account exists for this email, a password recovery link will be sent. Check your inbox."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send the recovery email."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      {/* NAVIGATION */}
      <nav className="auth-navbar">
        <Link href="/" className="brand">
          <span className="brand-icon">T</span>
          Talent<span className="brand-light">Link</span>
        </Link>

        <Link href="/" className="auth-back">
          ← Back to Home
        </Link>
      </nav>

      {/* LOGIN SECTION */}
      <section className="register-container login-container">
        <div className="register-heading">
          <span className="section-label">WELCOME BACK</span>

          <h1>Welcome to Talent Link.</h1>

          <p>
            Sign in to connect with opportunities, professional networks and
            career growth.
          </p>
        </div>

        <div className="register-card login-card">
          <h2>Sign in to your account</h2>

          <p className="form-description">
            Enter your registered email and password.
          </p>

          <form className="register-form" onSubmit={handleLogin}>
            {/* EMAIL */}
            <div className="form-field">
              <label htmlFor="login-email">Email address</label>

              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            {/* PASSWORD */}
            <div className="form-field">
              <label htmlFor="login-password">Password</label>

              <div className="password-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* FORGOT PASSWORD */}
            <div className="forgot-password">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>

            {/* ERROR */}
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            {/* SUCCESS */}
            {success && (
              <div className="success-message-inline" role="status">
                {success}
              </div>
            )}

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              className="primary-button register-submit"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In →"}
            </button>
          </form>

          <div className="login-divider">
            <span>New to Talent Link?</span>
          </div>

          <Link
            href="/register"
            className="secondary-button login-register-link"
          >
            Create an Account →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="auth-footer">
        Talent Link © 2026 · Connecting talent. Unlocking opportunity.
      </footer>
    </main>
  );
}