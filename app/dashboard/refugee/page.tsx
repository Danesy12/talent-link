"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile, type UserProfile } from "@/lib/getUserProfile";

interface JobItem {
  id: string;
  organization: string;
  title: string;
  location: string;
  employment_type: string;
  skills_required: string;
  description: string;
  status: "open" | "closed";
  created_at: string;
}

interface ApplicationItem {
  id: string;
  job_id: string;
  cover_note: string | null;
  status: "pending" | "shortlisted" | "accepted" | "rejected";
  created_at: string;
}

interface MentorItem {
  id: string;
  full_name: string | null;
  email: string;
  country: string | null;
  expertise: string | null;
  experience: string | null;
  mentorship: string | null;
}

interface MentorshipReqItem {
  id: string;
  mentor_id: string;
  message: string;
  status: "pending" | "accepted" | "declined";
}

export default function RefugeeDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [fullName, setFullName] = useState("");
  const [qualification, setQualification] = useState("");
  const [skills, setSkills] = useState("");
  const [employmentInterest, setEmploymentInterest] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");

  // Jobs & applications
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [coverNote, setCoverNote] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Mentors
  const [mentors, setMentors] = useState<MentorItem[]>([]);
  const [mentorshipReqs, setMentorshipReqs] = useState<MentorshipReqItem[]>([]);
  const [mentorMsgMap, setMentorMsgMap] = useState<Record<string, string>>({});

  async function loadMarketplaceData(userId: string) {
    const [
      { data: openJobs },
      { data: myApps },
      { data: mentorRows },
      { data: myMentorReqs },
    ] = await Promise.all([
      supabase
        .from("jobs")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false }),
      supabase
        .from("applications")
        .select("*")
        .eq("applicant_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, email, country, expertise, experience, mentorship")
        .eq("role", "mentor"),
      supabase
        .from("mentorship_requests")
        .select("*")
        .eq("mentee_id", userId),
    ]);

    setJobs((openJobs as JobItem[] | null) ?? []);
    setApplications((myApps as ApplicationItem[] | null) ?? []);
    setMentors((mentorRows as MentorItem[] | null) ?? []);
    setMentorshipReqs((myMentorReqs as MentorshipReqItem[] | null) ?? []);
  }

  useEffect(() => {
    let active = true;

    async function init() {
      const { profile: userProfile, error } = await getOrCreateProfile();

      if (!active) return;

      if (error || !userProfile || userProfile.role !== "refugee") {
        router.replace("/login");
        return;
      }

      setProfile(userProfile);
      setFullName(userProfile.full_name || "");
      setQualification(userProfile.qualification || "");
      setSkills(userProfile.skills || "");
      setEmploymentInterest(userProfile.employment_interest || "");
      setCountry(userProfile.country || "");
      setPhone(userProfile.phone || "");

      await loadMarketplaceData(userProfile.id);
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
        qualification: qualification.trim() || null,
        skills: skills.trim() || null,
        employment_interest: employmentInterest.trim() || null,
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
    setProfileMsg("Profile updated.");
  }

  async function handleApply(jobId: string) {
    if (!profile) return;
    setActionMsg("");
    setBusyId(jobId);

    const { error } = await supabase.from("applications").insert({
      job_id: jobId,
      applicant_id: profile.id,
      cover_note: coverNote.trim() || null,
      status: "pending",
    });

    setBusyId(null);

    if (error) {
      setActionMsg(`Error: ${error.message}`);
      return;
    }

    setApplyingJobId(null);
    setCoverNote("");
    setActionMsg("Application submitted.");
    await loadMarketplaceData(profile.id);
  }

  async function handleWithdrawApplication(appId: string) {
    if (!profile) return;
    setActionMsg("");
    setBusyId(appId);

    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", appId)
      .eq("applicant_id", profile.id)
      .eq("status", "pending");

    setBusyId(null);

    if (error) {
      setActionMsg(`Error: ${error.message}`);
      return;
    }

    setActionMsg("Pending application withdrawn.");
    await loadMarketplaceData(profile.id);
  }

  async function handleRequestMentor(mentorId: string) {
    if (!profile) return;
    setActionMsg("");
    setBusyId(mentorId);

    const msg =
      (mentorMsgMap[mentorId] || "").trim() ||
      `Hello, I would love mentorship guidance aligned with my goal in ${
        profile.employment_interest || "career growth"
      }.`;

    const { error } = await supabase.from("mentorship_requests").insert({
      mentor_id: mentorId,
      mentee_id: profile.id,
      message: msg,
      status: "pending",
    });

    setBusyId(null);

    if (error) {
      setActionMsg(`Error: ${error.message}`);
      return;
    }

    setActionMsg("Mentorship request sent.");
    await loadMarketplaceData(profile.id);
  }

  async function handleCancelMentorshipRequest(requestId: string) {
    if (!profile) return;
    setActionMsg("");
    setBusyId(requestId);

    const { error } = await supabase
      .from("mentorship_requests")
      .delete()
      .eq("id", requestId)
      .eq("mentee_id", profile.id)
      .eq("status", "pending");

    setBusyId(null);

    if (error) {
      setActionMsg(`Error: ${error.message}`);
      return;
    }

    setActionMsg("Pending mentorship request cancelled.");
    await loadMarketplaceData(profile.id);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading || !profile) {
    return (
      <main className="mentor-loading">
        <div className="refugee-loading-mark">T</div>
        <h2>Loading Job Seeker Dashboard...</h2>
        <p>Preparing your skills and career workspace.</p>
      </main>
    );
  }

  const initial = (profile.full_name || profile.email || "J")[0].toUpperCase();
  const completedFields = [
    profile.full_name,
    profile.email,
    profile.country,
    profile.phone,
    profile.qualification,
    profile.skills,
    profile.employment_interest,
  ].filter(Boolean).length;
  const completionPct = Math.round((completedFields / 7) * 100);

  const appliedJobIds = new Set(applications.map((a) => a.job_id));
  const mentorReqByMentorId = new Map(
    mentorshipReqs.map((m) => [m.mentor_id, m])
  );
  const mentorNameById = new Map(
    mentors.map((m) => [m.id, m.full_name || m.email])
  );
  const jobTitleById = new Map(jobs.map((j) => [j.id, j.title]));

  const filteredJobs = jobs.filter((job) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      job.title.toLowerCase().includes(q) ||
      job.organization.toLowerCase().includes(q) ||
      job.skills_required.toLowerCase().includes(q) ||
      job.location.toLowerCase().includes(q);
    const matchesType =
      typeFilter === "all" || job.employment_type === typeFilter;
    return matchesQuery && matchesType;
  });

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
          <div className="sidebar-label">JOB SEEKER MENU</div>
          <nav className="mentor-navigation">
            <a href="#overview" className="mentor-nav-active">
              <span className="refugee-nav-icon">◈</span> Overview
            </a>
            <a href="#profile">
              <span className="refugee-nav-icon">👤</span> My Profile
            </a>
            <a href="#jobs">
              <span className="refugee-nav-icon">💼</span> Jobs (
              {filteredJobs.length})
            </a>
            <a href="#applications">
              <span className="refugee-nav-icon">📄</span> Applications (
              {applications.length})
            </a>
            <a href="#mentorship">
              <span className="refugee-nav-icon">🤝</span> Mentors (
              {mentors.length})
            </a>
          </nav>
        </div>

        <div className="refugee-sidebar-help">
          <span>✦</span>
          <h4>Skills-First Matching</h4>
          <p>
            Employers review your skills, qualifications, and career goals on
            every application.
          </p>
        </div>

        <div className="refugee-sidebar-user">
          <div className="sidebar-avatar">{initial}</div>
          <div>
            <strong>{profile.full_name || "Job Seeker"}</strong>
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
      </aside>

      <main className="mentor-main" id="overview">
        <header className="refugee-header">
          <div>
            <div className="mentor-eyebrow">JOB SEEKER WORKSPACE</div>
            <h1>Welcome, {profile.full_name || "Job Seeker"}</h1>
            <p className="mentor-subtitle">
              Browse open roles, apply directly, and connect with mentors.
            </p>
          </div>
          <div className="refugee-header-profile">
            <div className="header-avatar">{initial}</div>
            <div>
              <strong>{profile.full_name || profile.email}</strong>
              <span>Verified Talent Profile</span>
            </div>
          </div>
        </header>

        <section className="mentor-hero">
          <div className="hero-content">
            <span className="hero-label">CAREER PATHWAY PORTAL</span>
            <h2>Unlocking opportunities tailored to your skills.</h2>
            <p>
              Highlighting {profile.skills || "your core skills"} and interest
              in {profile.employment_interest || "meaningful employment"}.
            </p>
            <a href="#jobs" className="hero-button">
              Browse Open Jobs →
            </a>
          </div>
          <div className="hero-decoration">✦</div>
          <div className="hero-circle hero-circle-one" />
          <div className="hero-circle hero-circle-two" />
        </section>

        <section className="refugee-section">
          <div className="refugee-section-heading">
            <div>
              <h2>Career Activity</h2>
              <p>Live summary of your job applications and mentorship</p>
            </div>
            <div className="refugee-live-status">
              <i /> Active Profile
            </div>
          </div>

          <div className="mentor-stats">
            <div className="mentor-stat-card">
              <div className="stat-icon stat-teal">📄</div>
              <div className="stat-number">{applications.length}</div>
              <h3>Applications Sent</h3>
              <p>Submitted job applications</p>
            </div>

            <div className="mentor-stat-card">
              <div className="stat-icon stat-blue">🤝</div>
              <div className="stat-number">{mentorshipReqs.length}</div>
              <h3>Mentor Requests</h3>
              <p>Mentorship connections requested</p>
            </div>

            <div className="mentor-stat-card">
              <div className="stat-icon stat-purple">✓</div>
              <div className="stat-number">{completionPct}%</div>
              <h3>Profile Strength</h3>
              <p>Completeness of skills & credentials</p>
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
          <div className="refugee-panel-heading">
            <div>
              <span className="refugee-kicker">TALENT PROFILE</span>
              <h2>Skills & Qualifications</h2>
              <p>Information shared with inclusive employers and mentors.</p>
            </div>
            <div className="workflow-actions">
              <span className="account-badge">JOB SEEKER ACCOUNT</span>
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

          <div className="refugee-completion">
            <div className="refugee-completion-heading">
              <strong>Profile Completion</strong>
              <span>{completionPct}% Complete</span>
            </div>
            <div className="refugee-progress">
              <div
                className="refugee-progress-fill"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          {editingProfile ? (
            <form className="workflow-form" onSubmit={handleSaveProfile}>
              <div className="workflow-grid">
                <div className="workflow-field">
                  <label htmlFor="ref-name">Full Name</label>
                  <input
                    id="ref-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="workflow-field">
                  <label htmlFor="ref-qual">Highest Qualification</label>
                  <input
                    id="ref-qual"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                  />
                </div>
                <div className="workflow-field">
                  <label htmlFor="ref-interest">Employment Interest</label>
                  <input
                    id="ref-interest"
                    value={employmentInterest}
                    onChange={(e) => setEmploymentInterest(e.target.value)}
                  />
                </div>
                <div className="workflow-field">
                  <label htmlFor="ref-country">Country / Location</label>
                  <input
                    id="ref-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                <div className="workflow-field">
                  <label htmlFor="ref-phone">Phone Number</label>
                  <input
                    id="ref-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="workflow-field">
                <label htmlFor="ref-skills">Key Skills</label>
                <textarea
                  id="ref-skills"
                  rows={2}
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
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
                <span>HIGHEST QUALIFICATION</span>
                <strong>{profile.qualification || "Not specified"}</strong>
              </div>
              <div className="profile-information">
                <span>KEY SKILLS</span>
                <strong>{profile.skills || "Not specified"}</strong>
              </div>
              <div className="profile-information">
                <span>EMPLOYMENT INTEREST</span>
                <strong>{profile.employment_interest || "Not specified"}</strong>
              </div>
              <div className="profile-information">
                <span>COUNTRY / LOCATION</span>
                <strong>{profile.country || "Not specified"}</strong>
              </div>
            </div>
          )}
        </section>

        {/* OPEN JOBS */}
        <section className="mentor-content-panel" id="jobs">
          <div className="refugee-panel-heading">
            <div>
              <span className="refugee-kicker">OPPORTUNITIES</span>
              <h2>Open Job Listings</h2>
              <p>Search and apply to roles posted by verified employers.</p>
            </div>
            <div className="refugee-panel-icon">💼</div>
          </div>

          <div className="filter-row">
            <input
              placeholder="Search by job title, organization, skill, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Employment Types</option>
              <option value="Full-time employment">Full-time employment</option>
              <option value="Part-time employment">Part-time employment</option>
              <option value="Remote work">Remote work</option>
              <option value="Internship">Internship</option>
              <option value="Fellowship">Fellowship</option>
              <option value="Freelancing">Freelancing</option>
            </select>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="refugee-empty" style={{ marginTop: 18 }}>
              <span>💼</span>
              <h3>No matching open jobs found</h3>
              <p>Check back soon or adjust your search filter.</p>
            </div>
          ) : (
            <div className="items-stack">
              {filteredJobs.map((job) => {
                const alreadyApplied = appliedJobIds.has(job.id);
                const isFormOpen = applyingJobId === job.id;

                return (
                  <div className="item-card" key={job.id}>
                    <div className="item-card-top">
                      <div>
                        <h3>{job.title}</h3>
                        <p className="item-meta">
                          <strong>{job.organization}</strong> ·{" "}
                          {job.employment_type} · {job.location}
                        </p>
                      </div>
                      <span className="status-pill status-open">Open</span>
                    </div>
                    <p>
                      <strong>Skills Required:</strong> {job.skills_required}
                    </p>
                    <p>{job.description}</p>

                    {alreadyApplied ? (
                      <span className="status-pill status-pending">
                        Applied
                      </span>
                    ) : isFormOpen ? (
                      <div className="workflow-form" style={{ marginTop: 8 }}>
                        <div className="workflow-field">
                          <label>Cover Note (optional)</label>
                          <textarea
                            rows={2}
                            placeholder="Briefly explain why you are a strong fit..."
                            value={coverNote}
                            onChange={(e) => setCoverNote(e.target.value)}
                          />
                        </div>
                        <div className="workflow-actions">
                          <button
                            type="button"
                            className="btn-teal"
                            disabled={busyId === job.id}
                            onClick={() => handleApply(job.id)}
                          >
                            {busyId === job.id
                              ? "Submitting..."
                              : "Submit Application"}
                          </button>
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => {
                              setApplyingJobId(null);
                              setCoverNote("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="workflow-actions">
                        <button
                          type="button"
                          className="btn-teal"
                          onClick={() => {
                            setApplyingJobId(job.id);
                            setCoverNote("");
                          }}
                        >
                          Apply Now
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* MY APPLICATIONS */}
        <section className="mentor-content-panel" id="applications">
          <h2>My Applications</h2>
          <p>
            Track the status of roles you have applied to or withdraw pending
            applications.
          </p>

          {applications.length === 0 ? (
            <div className="refugee-empty" style={{ marginTop: 16 }}>
              <span>📄</span>
              <h3>No applications yet</h3>
              <p>Click &ldquo;Apply Now&rdquo; on any job above to apply.</p>
            </div>
          ) : (
            <div className="items-stack">
              {applications.map((app) => (
                <div className="item-card" key={app.id}>
                  <div className="item-card-top">
                    <div>
                      <h3>{jobTitleById.get(app.job_id) || "Job Role"}</h3>
                      {app.cover_note && (
                        <p className="item-meta">{app.cover_note}</p>
                      )}
                    </div>
                    <span className={`status-pill status-${app.status}`}>
                      {app.status}
                    </span>
                  </div>

                  {app.status === "pending" && (
                    <div className="workflow-actions">
                      <button
                        type="button"
                        className="btn-danger-soft"
                        disabled={busyId === app.id}
                        onClick={() => handleWithdrawApplication(app.id)}
                      >
                        {busyId === app.id
                          ? "Withdrawing..."
                          : "Withdraw Application"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* MENTORSHIP */}
        <section className="mentor-content-panel" id="mentorship">
          <h2>Request Mentorship</h2>
          <p>Connect with mentors offering career guidance.</p>

          {mentorshipReqs.length > 0 && (
            <div className="items-stack" style={{ marginBottom: 20 }}>
              {mentorshipReqs.map((req) => (
                <div className="item-card" key={req.id}>
                  <div className="item-card-top">
                    <div>
                      <h3>
                        Mentor:{" "}
                        {mentorNameById.get(req.mentor_id) || "Talent Link Mentor"}
                      </h3>
                      <p className="item-meta">{req.message}</p>
                    </div>
                    <span className={`status-pill status-${req.status}`}>
                      {req.status}
                    </span>
                  </div>

                  {req.status === "pending" && (
                    <div className="workflow-actions">
                      <button
                        type="button"
                        className="btn-danger-soft"
                        disabled={busyId === req.id}
                        onClick={() => handleCancelMentorshipRequest(req.id)}
                      >
                        {busyId === req.id
                          ? "Cancelling..."
                          : "Cancel Request"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {mentors.length === 0 ? (
            <div className="refugee-empty" style={{ marginTop: 16 }}>
              <span>🤝</span>
              <h3>No mentors registered yet</h3>
            </div>
          ) : (
            <div className="items-stack">
              {mentors.map((mentor) => {
                const existingReq = mentorReqByMentorId.get(mentor.id);
                return (
                  <div className="item-card" key={mentor.id}>
                    <div className="item-card-top">
                      <div>
                        <h3>{mentor.full_name || mentor.email}</h3>
                        <p className="item-meta">
                          {mentor.expertise || "General Mentorship"} ·{" "}
                          {mentor.experience || "Experience N/A"} ·{" "}
                          {mentor.country || "Location N/A"}
                        </p>
                      </div>
                      {existingReq && (
                        <span className={`status-pill status-${existingReq.status}`}>
                          {existingReq.status}
                        </span>
                      )}
                    </div>
                    {mentor.mentorship && <p>{mentor.mentorship}</p>}

                    {!existingReq && (
                      <div className="workflow-actions">
                        <input
                          placeholder="Optional note to mentor..."
                          value={mentorMsgMap[mentor.id] || ""}
                          onChange={(e) =>
                            setMentorMsgMap((prev) => ({
                              ...prev,
                              [mentor.id]: e.target.value,
                            }))
                          }
                          style={{
                            flex: 1,
                            minWidth: 200,
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: "1px solid #dce5eb",
                          }}
                        />
                        <button
                          type="button"
                          className="btn-teal"
                          disabled={busyId === mentor.id}
                          onClick={() => handleRequestMentor(mentor.id)}
                        >
                          {busyId === mentor.id
                            ? "Sending..."
                            : "Request Mentorship"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mentor-footer job-footer">
          <div>
            <strong>Talent Link</strong>
            <span>Connecting talent. Unlocking opportunity.</span>
          </div>
          <span>© 2026 Talent Link · Job Seeker Portal</span>
        </footer>
      </main>
    </div>
  );
}