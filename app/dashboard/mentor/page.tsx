"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile, type UserProfile } from "@/lib/getUserProfile";

interface MentorshipRequestRecord {
  id: string;
  mentor_id: string;
  mentee_id: string;
  message: string;
  session_notes?: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  mentee?: {
    full_name: string | null;
    email: string;
    country: string | null;
    qualification: string | null;
    skills: string | null;
    employment_interest: string | null;
  } | null;
}

export default function MentorDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [fullName, setFullName] = useState("");
  const [expertise, setExpertise] = useState("");
  const [experience, setExperience] = useState("");
  const [mentorship, setMentorship] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");

  // Mentees & session notes state
  const [requests, setRequests] = useState<MentorshipRequestRecord[]>([]);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  async function loadMentorRequests(mentorId: string) {
    const { data: reqRows } = await supabase
      .from("mentorship_requests")
      .select("*")
      .eq("mentor_id", mentorId)
      .order("created_at", { ascending: false });

    const list = (reqRows as MentorshipRequestRecord[] | null) ?? [];
    const menteeIds = Array.from(new Set(list.map((r) => r.mentee_id)));

    let menteeMap = new Map<
      string,
      {
        full_name: string | null;
        email: string;
        country: string | null;
        qualification: string | null;
        skills: string | null;
        employment_interest: string | null;
      }
    >();

    if (menteeIds.length > 0) {
      const { data: menteeProfiles } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, country, qualification, skills, employment_interest"
        )
        .in("id", menteeIds);

      if (menteeProfiles) {
        menteeMap = new Map(
          menteeProfiles.map((m) => [
            m.id,
            {
              full_name: m.full_name,
              email: m.email,
              country: m.country,
              qualification: m.qualification,
              skills: m.skills,
              employment_interest: m.employment_interest,
            },
          ])
        );
      }
    }

    const hydrated = list.map((req) => ({
      ...req,
      mentee: menteeMap.get(req.mentee_id) || null,
    }));

    setRequests(hydrated);
    setNotesDraft((prev) => {
      const next = { ...prev };
      for (const item of hydrated) {
        if (next[item.id] === undefined) {
          next[item.id] = item.session_notes || "";
        }
      }
      return next;
    });
  }

  useEffect(() => {
    let active = true;

    async function init() {
      const { profile: userProfile, error } = await getOrCreateProfile();

      if (!active) return;

      if (error || !userProfile || userProfile.role !== "mentor") {
        router.replace("/login");
        return;
      }

      setProfile(userProfile);
      setFullName(userProfile.full_name || "");
      setExpertise(userProfile.expertise || "");
      setExperience(userProfile.experience || "");
      setMentorship(userProfile.mentorship || "");
      setCountry(userProfile.country || "");
      setPhone(userProfile.phone || "");

      await loadMentorRequests(userProfile.id);
      if (active) setLoading(false);
    }

    init();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSaveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;

    setSavingProfile(true);
    setProfileMsg("");

    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        expertise: expertise.trim() || null,
        experience: experience.trim() || null,
        mentorship: mentorship.trim() || null,
        country: country.trim() || null,
        phone: phone.trim() || null,
      })
      .eq("id", profile.id)
      .select("*")
      .single();

    setSavingProfile(false);

    if (error) {
      setProfileMsg(`Error: ${error.message}`);
      return;
    }

    setProfile(data as UserProfile);
    setEditingProfile(false);
    setProfileMsg("Mentor profile updated.");
  }

  async function handleUpdateRequestStatus(
    requestId: string,
    status: "accepted" | "declined"
  ) {
    if (!profile) return;
    setActionMsg("");

    const { error } = await supabase
      .from("mentorship_requests")
      .update({ status })
      .eq("id", requestId)
      .eq("mentor_id", profile.id);

    if (error) {
      setActionMsg(`Error: ${error.message}`);
      return;
    }

    setActionMsg(
      status === "accepted"
        ? "Mentee accepted into your active roster."
        : "Mentorship request declined."
    );
    await loadMentorRequests(profile.id);
  }

  async function handleSaveSessionNote(requestId: string) {
    if (!profile) return;
    setSavingNoteId(requestId);
    setActionMsg("");

    const noteText = (notesDraft[requestId] || "").trim() || null;

    const { error } = await supabase
      .from("mentorship_requests")
      .update({ session_notes: noteText })
      .eq("id", requestId)
      .eq("mentor_id", profile.id);

    setSavingNoteId(null);

    if (error) {
      setActionMsg(
        `Error: ${error.message} (Make sure session_notes column exists on mentorship_requests.)`
      );
      return;
    }

    setActionMsg("Guidance session notes saved.");
    await loadMentorRequests(profile.id);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading || !profile) {
    return (
      <main className="mentor-loading">
        <div className="loading-mark">T</div>
        <h2>Loading Mentor Dashboard...</h2>
        <p>Preparing your mentorship workspace.</p>
      </main>
    );
  }

  const initial = (profile.full_name || profile.email || "M")[0].toUpperCase();
  const completedFields = [
    profile.full_name,
    profile.email,
    profile.country,
    profile.phone,
    profile.expertise,
    profile.experience,
    profile.mentorship,
  ].filter(Boolean).length;
  const completionPct = Math.round((completedFields / 7) * 100);

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const activeMentees = requests.filter((r) => r.status === "accepted");

  return (
    <div className="mentor-dashboard">
      <aside className="mentor-sidebar">
        <Link href="/" className="mentor-brand">
          <span className="mentor-brand-icon">T</span>
          <span>
            Talent<span className="brand-green">Link</span>
          </span>
        </Link>

        <div className="sidebar-section">
          <div className="sidebar-label">MENTOR MENU</div>
          <nav className="mentor-navigation">
            <a href="#overview" className="mentor-nav-active">
              <span className="nav-icon">◈</span> Overview
            </a>
            <a href="#profile">
              <span className="nav-icon">👤</span> Mentor Profile
            </a>
            <a href="#requests">
              <span className="nav-icon">📩</span> Requests ({pendingRequests.length})
            </a>
            <a href="#mentees">
              <span className="nav-icon">🤝</span> Active Mentees ({activeMentees.length})
            </a>
          </nav>
        </div>

        <div className="sidebar-help">
          <span>✦</span>
          <h4>Career Guidance Impact</h4>
          <p>
            Your industry knowledge helps displaced professionals build
            confidence and career readiness.
          </p>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initial}</div>
            <div className="sidebar-user-info">
              <strong>{profile.full_name || "Talent Link Mentor"}</strong>
              <span>{profile.email}</span>
            </div>
          </div>

          <button
            type="button"
            className="mentor-logout"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing Out..." : "Sign Out"}
          </button>
        </div>
      </aside>

      <main className="mentor-main" id="overview">
        <header className="mentor-header">
          <div>
            <div className="mentor-eyebrow">MENTOR WORKSPACE</div>
            <h1>Welcome, {profile.full_name || "Mentor"}</h1>
            <p className="mentor-subtitle">
              Guide emerging professionals and support inclusive career growth.
            </p>
          </div>
          <div className="header-profile">
            <div className="header-avatar">{initial}</div>
            <div>
              <strong>{profile.full_name || profile.email}</strong>
              <span>Verified Mentor</span>
            </div>
          </div>
        </header>

        <section className="mentor-hero">
          <div className="hero-content">
            <span className="hero-label">MENTORSHIP PORTAL</span>
            <h2>Empower displaced talent through structured mentorship.</h2>
            <p>
              Share practical guidance in{" "}
              {profile.expertise || "your field of expertise"} and help job
              seekers prepare for meaningful global opportunities.
            </p>
            <a href="#mentees" className="hero-button">
              Manage Active Mentees →
            </a>
          </div>
          <div className="hero-decoration">✦</div>
          <div className="hero-circle hero-circle-one" />
          <div className="hero-circle hero-circle-two" />
        </section>

        <section className="mentor-section">
          <div className="section-heading">
            <div>
              <h2>Mentorship Overview</h2>
              <p>Live activity summary for your mentor account</p>
            </div>
            <div className="data-status">
              <span className="status-dot" /> Active Mentor
            </div>
          </div>

          <div className="mentor-stats">
            <div className="mentor-stat-card">
              <div className="stat-icon stat-teal">🤝</div>
              <div className="stat-number">{activeMentees.length}</div>
              <h3>Active Mentees</h3>
              <p>Accepted mentees currently in guidance</p>
            </div>

            <div className="mentor-stat-card">
              <div className="stat-icon stat-blue">📩</div>
              <div className="stat-number">{pendingRequests.length}</div>
              <h3>Pending Requests</h3>
              <p>Awaiting your response</p>
            </div>

            <div className="mentor-stat-card">
              <div className="stat-icon stat-purple">✓</div>
              <div className="stat-number">{completionPct}%</div>
              <h3>Profile Readiness</h3>
              <p>Completeness of mentor details</p>
            </div>
          </div>
        </section>

        {actionMsg && (
          <div
            className={`feedback-banner ${
              actionMsg.startsWith("Error") ? "feedback-error" : ""
            }`}
            style={{ marginBottom: 20 }}
          >
            {actionMsg}
          </div>
        )}

        {/* PROFILE + EDIT */}
        <section className="mentor-profile-card" id="profile">
          <div className="profile-card-heading">
            <div>
              <span className="section-kicker">MENTOR CREDENTIALS</span>
              <h2>Registered Profile Information</h2>
              <p>
                Details visible when matching you with job seekers on Talent
                Link.
              </p>
            </div>
            <div className="workflow-actions">
              <span className="account-badge">MENTOR ACCOUNT</span>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setEditingProfile((prev) => !prev);
                  setProfileMsg("");
                }}
              >
                {editingProfile ? "Cancel Edit" : "Edit Profile"}
              </button>
            </div>
          </div>

          {profileMsg && (
            <div
              className={`feedback-banner ${
                profileMsg.startsWith("Error") ? "feedback-error" : ""
              }`}
              style={{ marginBottom: 16 }}
            >
              {profileMsg}
            </div>
          )}

          <div className="completion-container">
            <div className="completion-heading">
              <strong>Profile Completion</strong>
              <span>{completionPct}% Complete</span>
            </div>
            <div className="completion-track">
              <div
                className="completion-fill"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          {editingProfile ? (
            <form className="workflow-form" onSubmit={handleSaveProfile}>
              <div className="workflow-grid">
                <div className="workflow-field">
                  <label htmlFor="men-name">Full Name</label>
                  <input
                    id="men-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="workflow-field">
                  <label htmlFor="men-exp">Area of Expertise</label>
                  <input
                    id="men-exp"
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                  />
                </div>
                <div className="workflow-field">
                  <label htmlFor="men-years">Years of Experience</label>
                  <input
                    id="men-years"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                  />
                </div>
                <div className="workflow-field">
                  <label htmlFor="men-country">Country / Location</label>
                  <input
                    id="men-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                <div className="workflow-field">
                  <label htmlFor="men-phone">Phone Number</label>
                  <input
                    id="men-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="workflow-field">
                <label htmlFor="men-focus">Mentorship Focus</label>
                <textarea
                  id="men-focus"
                  rows={2}
                  value={mentorship}
                  onChange={(e) => setMentorship(e.target.value)}
                />
              </div>
              <div className="workflow-actions">
                <button
                  type="submit"
                  className="btn-teal"
                  disabled={savingProfile}
                >
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          ) : (
            <div className="mentor-profile-grid">
              <div className="profile-information">
                <span>FULL NAME</span>
                <strong>{profile.full_name || "Not specified"}</strong>
              </div>
              <div className="profile-information">
                <span>EMAIL ADDRESS</span>
                <strong>{profile.email}</strong>
              </div>
              <div className="profile-information">
                <span>AREA OF EXPERTISE</span>
                <strong>{profile.expertise || "Not specified"}</strong>
              </div>
              <div className="profile-information">
                <span>YEARS OF EXPERIENCE</span>
                <strong>{profile.experience || "Not specified"}</strong>
              </div>
              <div className="profile-information">
                <span>MENTORSHIP FOCUS</span>
                <strong>{profile.mentorship || "Not specified"}</strong>
              </div>
              <div className="profile-information">
                <span>COUNTRY / LOCATION</span>
                <strong>{profile.country || "Not specified"}</strong>
              </div>
            </div>
          )}

          <div className="profile-footer">
            Talent Link Mentor ID: {profile.id}
          </div>
        </section>

        {/* PENDING REQUESTS */}
        <section className="mentor-content-panel" id="requests">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">INCOMING REQUESTS</span>
              <h2>Pending Mentorship Requests</h2>
              <p>Accept or decline guidance requests from job seekers.</p>
            </div>
            <div className="panel-symbol">📩</div>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="mentor-empty-state">
              <div className="empty-icon">✦</div>
              <h3>No pending mentorship requests</h3>
              <p>
                New requests from job seekers interested in{" "}
                {profile.expertise || "your specialty"} will appear here.
              </p>
            </div>
          ) : (
            <div className="items-stack">
              {pendingRequests.map((req) => (
                <div className="item-card" key={req.id}>
                  <div className="item-card-top">
                    <div>
                      <h3>
                        {req.mentee?.full_name ||
                          req.mentee?.email ||
                          "Job Seeker"}
                      </h3>
                      <p className="item-meta">
                        {req.mentee?.email} ·{" "}
                        {req.mentee?.country || "Location N/A"} · Interest:{" "}
                        {req.mentee?.employment_interest || "N/A"}
                      </p>
                    </div>
                    <span className="status-pill status-pending">pending</span>
                  </div>
                  <p>
                    <strong>Skills:</strong>{" "}
                    {req.mentee?.skills || "Not specified"}
                  </p>
                  <p>
                    <strong>Message:</strong> {req.message}
                  </p>
                  <div className="workflow-actions">
                    <button
                      type="button"
                      className="btn-teal"
                      onClick={() =>
                        handleUpdateRequestStatus(req.id, "accepted")
                      }
                    >
                      Accept Mentee
                    </button>
                    <button
                      type="button"
                      className="btn-danger-soft"
                      onClick={() =>
                        handleUpdateRequestStatus(req.id, "declined")
                      }
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ACTIVE MENTEES & SESSION NOTES */}
        <section className="mentor-content-panel" id="mentees">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">ACTIVE ROSTER</span>
              <h2>Active Mentees & Session Notes</h2>
              <p>Track mentees you have accepted and record coaching notes.</p>
            </div>
            <div className="panel-symbol">🤝</div>
          </div>

          {activeMentees.length === 0 ? (
            <div className="mentor-empty-state">
              <div className="empty-icon">🤝</div>
              <h3>No active mentees yet</h3>
              <p>
                Accept a pending mentorship request above to add a mentee to
                your active roster.
              </p>
            </div>
          ) : (
            <div className="items-stack">
              {activeMentees.map((menteeReq) => (
                <div className="item-card" key={menteeReq.id}>
                  <div className="item-card-top">
                    <div>
                      <h3>
                        {menteeReq.mentee?.full_name ||
                          menteeReq.mentee?.email ||
                          "Mentee"}
                      </h3>
                      <p className="item-meta">
                        {menteeReq.mentee?.email} ·{" "}
                        {menteeReq.mentee?.country || "Location N/A"} · Goal:{" "}
                        {menteeReq.mentee?.employment_interest || "N/A"}
                      </p>
                    </div>
                    <span className="status-pill status-accepted">active</span>
                  </div>

                  <p>
                    <strong>Skills:</strong>{" "}
                    {menteeReq.mentee?.skills || "Not specified"}
                  </p>
                  <p>
                    <strong>Initial Goal Note:</strong> {menteeReq.message}
                  </p>

                  <div className="workflow-field" style={{ marginTop: 4 }}>
                    <label htmlFor={`notes-${menteeReq.id}`}>
                      Guidance & Session Notes
                    </label>
                    <textarea
                      id={`notes-${menteeReq.id}`}
                      rows={2}
                      placeholder="Add action items, interview prep notes, or session dates..."
                      value={notesDraft[menteeReq.id] ?? ""}
                      onChange={(e) =>
                        setNotesDraft((prev) => ({
                          ...prev,
                          [menteeReq.id]: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="workflow-actions">
                    <button
                      type="button"
                      className="btn-teal"
                      disabled={savingNoteId === menteeReq.id}
                      onClick={() => handleSaveSessionNote(menteeReq.id)}
                    >
                      {savingNoteId === menteeReq.id
                        ? "Saving Notes..."
                        : "Save Session Notes"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="mentor-footer">
          <div>
            <strong>Talent Link</strong>
            <p>Connecting talent. Unlocking opportunity.</p>
          </div>
          <span>© 2026 Talent Link · Mentor Portal</span>
        </footer>
      </main>
    </div>
  );
}