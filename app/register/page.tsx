"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type UserRole = "refugee" | "employer" | "mentor";

const ROLES: { value: UserRole; icon: string; title: string; hint: string }[] = [
  { value: "refugee", icon: "👤", title: "Job Seeker", hint: "Find opportunities" },
  { value: "employer", icon: "🏢", title: "Employer", hint: "Find skilled talent" },
  { value: "mentor", icon: "🤝", title: "Mentor", hint: "Share expertise" },
];

const QUALIFICATIONS = [
  ["secondary", "Secondary education"],
  ["certificate", "Certificate"],
  ["diploma", "Diploma"],
  ["bachelors", "Bachelor's degree"],
  ["masters", "Master's degree"],
  ["doctorate", "Doctorate"],
  ["professional", "Professional certification"],
  ["other", "Other"],
];

const EMPLOYMENT_TYPES = [
  ["full-time", "Full-time employment"],
  ["part-time", "Part-time employment"],
  ["remote", "Remote work"],
  ["internship", "Internship"],
  ["fellowship", "Fellowship"],
  ["freelancing", "Freelancing"],
];

const EXPERIENCE_LEVELS = [
  ["1-3", "1–3 years"],
  ["4-6", "4–6 years"],
  ["7-10", "7–10 years"],
  ["10-plus", "More than 10 years"],
];

/** Read a trimmed string value from the form. */
function getText(data: FormData, key: string): string {
  return String(data.get(key) ?? "").trim();
}

/** Collect only the fields that belong to the selected role. */
function getRoleMetadata(role: UserRole, data: FormData) {
  switch (role) {
    case "refugee":
      return {
        qualification: getText(data, "qualification"),
        skills: getText(data, "skills"),
        employment: getText(data, "employment"),
      };
    case "employer":
      return {
        organization: getText(data, "organization"),
        industry: getText(data, "industry"),
        website: getText(data, "website"),
      };
    case "mentor":
      return {
        expertise: getText(data, "expertise"),
        experience: getText(data, "experience"),
        mentorship: getText(data, "mentorship"),
      };
  }
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

function SelectField({
  id,
  label,
  placeholder,
  options,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: string[][];
}) {
  return (
    <Field id={id} label={label}>
      <select id={id} name={id} required defaultValue="">
        <option value="">{placeholder}</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </Field>
  );
}

export default function RegisterPage() {
  const [role, setRole] = useState<UserRole>("refugee");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function selectRole(value: UserRole) {
    setRole(value);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const email = getText(formData, "email").toLowerCase();
    const password = String(formData.get("password") ?? "");

    try {
      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            role,
            full_name: getText(formData, "fullName"),
            country: getText(formData, "country"),
            phone: getText(formData, "phone"),
            ...getRoleMetadata(role, formData),
          },
        },
      });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      setSubmitted(true);
      form.reset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
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

        <Link href="/" className="auth-back">
          ← Back to Home
        </Link>
      </nav>

      <section className="register-container">
        <div className="register-heading">
          <span className="section-label">JOIN OUR COMMUNITY</span>
          <h1>Create your Talent Link account.</h1>
          <p>
            Connect your skills, experience and ambitions with opportunities
            that can transform your future.
          </p>
        </div>

        <div className="register-card">
          {submitted ? (
            <div className="success-message">
              <div className="success-icon">✓</div>
              <h2>Registration successful!</h2>
              <p>
                Your account registration has been received. Please check your
                email for a verification link if email confirmation is enabled.
              </p>
              <p>Once your email is verified, you can sign in to Talent Link.</p>

              <Link href="/login" className="primary-button">
                Continue to Login →
              </Link>

              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setSubmitted(false);
                  setError("");
                }}
              >
                Register another account
              </button>
            </div>
          ) : (
            <>
              <h2>Who are you joining as?</h2>
              <p className="form-description">
                Select your account type to continue.
              </p>

              <div className="role-selector">
                {ROLES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`role-option ${
                      role === option.value ? "active" : ""
                    }`}
                    onClick={() => selectRole(option.value)}
                    aria-pressed={role === option.value}
                  >
                    <span>{option.icon}</span>
                    <strong>{option.title}</strong>
                    <small>{option.hint}</small>
                  </button>
                ))}
              </div>

              <form className="register-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <Field id="fullName" label="Full name">
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      autoComplete="name"
                      required
                    />
                  </Field>

                  <Field id="email" label="Email address">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </Field>

                  <Field id="country" label="Country of residence">
                    <input
                      id="country"
                      name="country"
                      type="text"
                      placeholder="Enter your country"
                      autoComplete="country-name"
                      required
                    />
                  </Field>

                  <Field id="phone" label="Phone number">
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+254..."
                      autoComplete="tel"
                      required
                    />
                  </Field>
                </div>

                {role === "refugee" && (
                  <div className="role-fields">
                    <h3>Professional information</h3>

                    <SelectField
                      id="qualification"
                      label="Highest qualification"
                      placeholder="Select qualification"
                      options={QUALIFICATIONS}
                    />

                    <Field id="skills" label="Professional skills">
                      <textarea
                        id="skills"
                        name="skills"
                        placeholder="e.g. Software development, accounting, teaching..."
                        rows={3}
                        required
                      />
                    </Field>

                    <SelectField
                      id="employment"
                      label="Employment interest"
                      placeholder="Select an opportunity"
                      options={EMPLOYMENT_TYPES}
                    />
                  </div>
                )}

                {role === "employer" && (
                  <div className="role-fields">
                    <h3>Organization information</h3>

                    <Field id="organization" label="Organization name">
                      <input
                        id="organization"
                        name="organization"
                        type="text"
                        placeholder="Enter organization name"
                        required
                      />
                    </Field>

                    <Field id="industry" label="Industry">
                      <input
                        id="industry"
                        name="industry"
                        type="text"
                        placeholder="e.g. Technology, Healthcare, Finance"
                        required
                      />
                    </Field>

                    <Field id="website" label="Organization website (optional)">
                      <input
                        id="website"
                        name="website"
                        type="url"
                        placeholder="https://example.com"
                      />
                    </Field>
                  </div>
                )}

                {role === "mentor" && (
                  <div className="role-fields">
                    <h3>Mentorship information</h3>

                    <Field id="expertise" label="Area of expertise">
                      <input
                        id="expertise"
                        name="expertise"
                        type="text"
                        placeholder="e.g. Engineering, Business, Education"
                        required
                      />
                    </Field>

                    <SelectField
                      id="experience"
                      label="Years of professional experience"
                      placeholder="Select experience"
                      options={EXPERIENCE_LEVELS}
                    />

                    <Field id="mentorship" label="How would you like to contribute?">
                      <textarea
                        id="mentorship"
                        name="mentorship"
                        rows={3}
                        placeholder="Describe the mentorship support you can offer..."
                        required
                      />
                    </Field>
                  </div>
                )}

                <Field id="password" label="Create password">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="At least 8 characters"
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                </Field>

                <label className="terms-label">
                  <input type="checkbox" name="terms" required />
                  <span>
                    I agree to the platform&apos;s Terms of Service and Privacy
                    Policy.
                  </span>
                </label>

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
                  {loading ? "Creating Account..." : "Create My Account →"}
                </button>
              </form>
            </>
          )}
        </div>

        {!submitted && (
          <p className="register-footer">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        )}
      </section>

      <footer className="auth-footer">
        Talent Link © 2026 · Connecting talent. Unlocking opportunity.
      </footer>
    </main>
  );
}