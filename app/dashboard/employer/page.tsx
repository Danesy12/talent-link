"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile, type UserProfile } from "@/lib/getUserProfile";

interface JobRecord {
  id: string;
  employer_id: string;
  organization: string;
  title: string;
  location: string;
  employment_type: string;
  skills_required: string;
  description: string;
  status: "open" | "closed";
  created_at: string;
}

interface ApplicationRecord {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_note: string | null;
  status: "pending" | "shortlisted" | "accepted" | "rejected";
  created_at: string;
  job_title?: string;
  applicant?: {
    full_name: string | null;
    email: string;
    country: string | null;
    qualification: string | null;
    skills: string | null;
  } | null;
}

export default function EmployerDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");

  // Create job state
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time employment");
  const [skillsRequired, setSkillsRequired] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [creatingJob, setCreatingJob] = useState(false);
  const [jobMsg, setJobMsg] = useState("");

  // Edit existing job state
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editEmploymentType, setEditEmploymentType] = useState("Full-time employment");
  const [editSkillsRequired, setEditSkillsRequired] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingJobEdit, setSavingJobEdit] = useState(false);

  // Applicant filter state
  const [selectedJobFilter, setSelectedJobFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  async function loadEmployerData(userId: string) {
    const { data: jobRows } = await supabase
      .from("jobs")
      .select("*")
      .eq("employer_id", userId)
      .order("created_at", { ascending: false });

    const employerJobs = (jobRows as JobRecord[] | null) ?? [];
    setJobs(employerJobs);

    if (employerJobs.length === 0) {
      setApplications([]);
      return;
    }

    const jobIds = employerJobs.map((j) => j.id);
    const jobTitleMap = new Map(employerJobs.map((j) => [j.id, j.title]));

    const { data: appRows } = await supabase
      .from("applications")
      .select("*")
      .in("job_id", jobIds)
      .order("created_at", { ascending: false });

    const rawApps = (appRows as ApplicationRecord[] | null) ?? [];
    const applicantIds = Array.from(new Set(rawApps.map((a) => a.applicant_id)));

    let profileMap = new Map<
      string,
      {
        full_name: string | null;
        email: string;
        country: string | null;
        qualification: string | null;
        skills: string | null;
      }
    >();

    if (applicantIds.length > 0) {
      const { data: applicantProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, country, qualification, skills")
        .in("id", applicantIds);

      if (applicantProfiles) {
        profileMap = new Map(
          applicantProfiles.map((p) => [
            p.id,
            {
              full_name: p.full_name,
              email: p.email,
              country: p.country,
              qualification: p.qualification,
              skills: p.skills,
            },
          ])
        );
      }
    }

    setApplications(
      rawApps.map((app) => ({
        ...app,
        job_title: jobTitleMap.get(app.job_id) || "Job Role",
        applicant: profileMap.get(app.applicant_id) || null,
      }))
    );
  }

  useEffect(() => {
    let active = true;

    async function init() {
      const { profile: userProfile, error } = await getOrCreateProfile();

      if (!active) return;

      if (error || !userProfile || userProfile.role !== "employer") {
        router.replace("/login");
        return;
      }

      setProfile(userProfile);
      setFullName(userProfile.full_name || "");
      setOrganization(userProfile.organization || "");
      setIndustry(userProfile.industry || "");
      setWebsite(userProfile.website || "");
      setCountry(userProfile.country || "");
      setPhone(userProfile.phone || "");
      setJobLocation(userProfile.country || "");

      await loadEmployerData(userProfile.id);
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
        organization: organization.trim() || null,
        industry: industry.trim() || null,
        website: website.trim() || null,
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
    setProfileMsg("Organization profile updated.");
  }

  async function handleCreateJob(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;

    setCreatingJob(true);
    setJobMsg("");

    const orgToUse =
      profile.organization?.trim() ||
      organization.trim() ||
      profile.full_name ||
      "Talent Link Employer";

    const { error } = await supabase.from("jobs").insert({
      employer_id: profile.id,
      organization: orgToUse,
      title: jobTitle.trim(),
      location: jobLocation.trim(),
      employment_type: employmentType,
      skills_required: skillsRequired.trim(),
      description: jobDescription.trim(),
      status: "open",
    });

    setCreatingJob(false);

    if (error) {
      setJobMsg(`Error: ${error.message}`);
      return;
    }

    setJobTitle("");
    setSkillsRequired("");
    setJobDescription("");
    setJobMsg("Job posting published.");
    await loadEmployerData(profile.id);
  }

  function startEditingJob(job: JobRecord) {
    setEditingJobId(job.id);
    setEditTitle(job.title);
    setEditLocation(job.location);
    setEditEmploymentType(job.employment_type);
    setEditSkillsRequired(job.skills_required);
    setEditDescription(job.description);
    setJobMsg("");
  }

  async function handleSaveJobEdit(e: FormEvent<HTMLFormElement>, jobId: string) {
    e.preventDefault();
    if (!profile) return;

    setSavingJobEdit(true);
    setJobMsg("");

    const { error } = await supabase
      .from("jobs")
      .update({
        title: editTitle.trim(),
        location: editLocation.trim(),
        employment_type: editEmploymentType,
        skills_required: editSkillsRequired.trim(),
        description: editDescription.trim(),
      })
      .eq("id", jobId)
      .eq("employer_id", profile.id);

    setSavingJobEdit(false);

    if (error) {
      setJobMsg(`Error: ${error.message}`);
      return;
    }

    setEditingJobId(null);
    setJobMsg("Job posting updated.");
    await loadEmployerData(profile.id);
  }

  async function handleToggleJobStatus(job: JobRecord) {
    if (!profile) return;
    const nextStatus = job.status === "open" ? "closed" : "open";
    await supabase
      .from("jobs")
      .update({ status: nextStatus })
      .eq("id", job.id)
      .eq("employer_id", profile.id);
    await loadEmployerData(profile.id);
  }

  async function handleDeleteJob(jobId: string) {
    if (!profile) return;
    if (editingJobId === jobId) {
      setEditingJobId(null);
    }
    if (selectedJobFilter === jobId) {
      setSelectedJobFilter("all");
    }
    await supabase
      .from("jobs")
      .delete()
      .eq("id", jobId)
      .eq("employer_id", profile.id);
    await loadEmployerData(profile.id);
  }

  async function handleUpdateApplicationStatus(
    appId: string,
    status: "pending" | "shortlisted" | "accepted" | "rejected"
  ) {
    if (!profile) return;
    await supabase
      .from("applications")
      .update({ status })
      .eq("id", appId);
    await loadEmployerData(profile.id);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading || !profile) {
    return (
      <main className="emp-loading">
        <div className="loading-mark">T</div>
        <h2>Loading Employer Dashboard...</h2>
        <p>Preparing your hiring and organization workspace.</p>
      </main>
    );
  }

  const orgName = profile.organization || profile.full_name || "Employer";
  const initial = (orgName[0] || "E").toUpperCase();
  const activeJobsCount = jobs.filter((j) => j.status === "open").length;
  const shortlistedCount = applications.filter(
    (a) => a.status === "shortlisted" || a.status === "accepted"
  ).length;

  const filteredApplications = applications.filter((app) => {
    const matchesJob =
      selectedJobFilter === "all" || app.job_id === selectedJobFilter;
    const matchesStatus =
      selectedStatusFilter === "all" || app.status === selectedStatusFilter;
    return matchesJob && matchesStatus;
  });

  return (
    <div className="emp-dashboard">
      <aside className="emp-sidebar">
        <Link href="/" className="emp-brand">
          <span className="emp-brand-icon">T</span>
          Talent<span>Link</span>
        </Link>

        <div className="emp-sidebar-label">EMPLOYER MENU</div>
        <nav className="emp-nav">
          <a href="#overview" className="emp-nav-active">
            ◈ Overview
          </a>
          <a href="#organization">🏢 Organization Profile</a>
          <a href="#postings">💼 Job Postings ({jobs.length})</a>
          <a href="#applicants">
            👥 Applicants ({filteredApplications.length})
          </a>
        </nav>

        <button
          type="button"
          className="emp-logout"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? "Signing Out..." : "Sign Out"}
        </button>
      </aside>

      <main className="emp-main" id="overview">
        <header className="emp-header">
          <div>
            <p className="emp-eyebrow">EMPLOYER WORKSPACE</p>
            <h1>Welcome, {orgName}</h1>
            <p>
              Discover skilled, resilient talent and manage your open roles.
            </p>
          </div>
          <div className="emp-avatar">{initial}</div>
        </header>

        <section className="emp-banner">
          <div>
            <span>INCLUSIVE HIRING PORTAL</span>
            <h2>Build diverse, high-performing teams with Talent Link.</h2>
            <p>
              Connect directly with qualified candidates across{" "}
              {profile.industry || "your industry"} and review verified skills
              and credentials.
            </p>
            <a href="#postings" className="emp-banner-button">
              Manage Job Postings →
            </a>
          </div>
          <div className="emp-banner-icon">✦</div>
        </section>

        <section className="emp-stats">
          <div className="emp-stat">
            <span>💼</span>
            <h3>{activeJobsCount}</h3>
            <p>Active Job Postings</p>
          </div>

          <div className="emp-stat">
            <span>📄</span>
            <h3>{applications.length}</h3>
            <p>Total Applications</p>
          </div>

          <div className="emp-stat">
            <span>⭐</span>
            <h3>{shortlistedCount}</h3>
            <p>Shortlisted Candidates</p>
          </div>

          <div className="emp-stat">
            <span>✓</span>
            <h3>Active</h3>
            <p>Employer Account Status</p>
          </div>
        </section>

        {/* ORGANIZATION PROFILE + EDIT */}
        <section className="emp-panel" id="organization">
          <div className="emp-panel-heading">
            <div>
              <h2>Organization Profile</h2>
              <p>Your registered employer details on Talent Link</p>
            </div>
            <div className="workflow-actions">
              <span className="emp-status">VERIFIED EMPLOYER</span>
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
            >
              {profileMsg}
            </div>
          )}

          {editingProfile ? (
            <form className="workflow-form" onSubmit={handleSaveProfile}>
              <div className="workflow-grid">
                <div className="workflow-field">
                  <label htmlFor="emp-org">Organization Name</label>
                  <input
                    id="emp-org"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    required
                  />
                </div>
                <div className="workflow-field">
                  <label htmlFor="emp-contact">Contact Person</label>
                  <input
                    id="emp-contact"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="workflow-field">
                  <label htmlFor="emp-industry">Industry / Sector</label>
                  <input
                    id="emp-industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>
                <div className="workflow-field">
                  <label htmlFor="emp-website">Company Website</label>
                  <input
                    id="emp-website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
                <div className="workflow-field">
                  <label htmlFor="emp-country">Country / Location</label>
                  <input
                    id="emp-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                <div className="workflow-field">
                  <label htmlFor="emp-phone">Phone Number</label>
                  <input
                    id="emp-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
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
            <div className="emp-profile-grid">
              <div>
                <span>ORGANIZATION NAME</span>
                <strong>{profile.organization || "Not specified"}</strong>
              </div>
              <div>
                <span>CONTACT PERSON</span>
                <strong>{profile.full_name || "Not specified"}</strong>
              </div>
              <div>
                <span>EMAIL ADDRESS</span>
                <strong>{profile.email}</strong>
              </div>
              <div>
                <span>INDUSTRY / SECTOR</span>
                <strong>{profile.industry || "Not specified"}</strong>
              </div>
              <div>
                <span>COMPANY WEBSITE</span>
                <strong>{profile.website || "Not specified"}</strong>
              </div>
              <div>
                <span>COUNTRY / LOCATION</span>
                <strong>{profile.country || "Not specified"}</strong>
              </div>
            </div>
          )}
        </section>

        {/* JOB POSTINGS */}
        <section className="emp-panel" id="postings">
          <h2>Job Postings</h2>
          <p>Publish new roles, edit existing postings, and manage vacancies.</p>

          <form className="workflow-form" onSubmit={handleCreateJob}>
            <div className="workflow-grid">
              <div className="workflow-field">
                <label htmlFor="job-title">Job Title</label>
                <input
                  id="job-title"
                  placeholder="e.g. Junior Full-Stack Developer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                />
              </div>
              <div className="workflow-field">
                <label htmlFor="job-location">Location</label>
                <input
                  id="job-location"
                  placeholder="e.g. Remote / Kenya"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  required
                />
              </div>
              <div className="workflow-field">
                <label htmlFor="job-type">Employment Type</label>
                <select
                  id="job-type"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                >
                  <option>Full-time employment</option>
                  <option>Part-time employment</option>
                  <option>Remote work</option>
                  <option>Internship</option>
                  <option>Fellowship</option>
                  <option>Freelancing</option>
                </select>
              </div>
              <div className="workflow-field">
                <label htmlFor="job-skills">Key Skills Required</label>
                <input
                  id="job-skills"
                  placeholder="e.g. React, TypeScript, Python, SQL"
                  value={skillsRequired}
                  onChange={(e) => setSkillsRequired(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="workflow-field">
              <label htmlFor="job-desc">Role Description</label>
              <textarea
                id="job-desc"
                rows={3}
                placeholder="Describe responsibilities, expectations, and how to apply..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                required
              />
            </div>

            <div className="workflow-actions">
              <button
                type="submit"
                className="btn-teal"
                disabled={creatingJob}
              >
                {creatingJob ? "Publishing..." : "Publish Job Posting"}
              </button>
            </div>
          </form>

          {jobMsg && (
            <div
              className={`feedback-banner ${
                jobMsg.startsWith("Error") ? "feedback-error" : ""
              }`}
            >
              {jobMsg}
            </div>
          )}

          {jobs.length === 0 ? (
            <div className="emp-empty">
              <span>💼</span>
              <h3>No active job postings yet</h3>
              <p>Use the form above to publish your first role.</p>
            </div>
          ) : (
            <div className="items-stack">
              {jobs.map((job) => {
                const isEditingThisJob = editingJobId === job.id;

                return (
                  <div className="item-card" key={job.id}>
                    <div className="item-card-top">
                      <div>
                        <h3>{job.title}</h3>
                        <p className="item-meta">
                          {job.employment_type} · {job.location} · Skills:{" "}
                          {job.skills_required}
                        </p>
                      </div>
                      <span className={`status-pill status-${job.status}`}>
                        {job.status}
                      </span>
                    </div>

                    {isEditingThisJob ? (
                      <form
                        className="workflow-form"
                        onSubmit={(e) => handleSaveJobEdit(e, job.id)}
                      >
                        <div className="workflow-grid">
                          <div className="workflow-field">
                            <label htmlFor={`edit-title-${job.id}`}>
                              Job Title
                            </label>
                            <input
                              id={`edit-title-${job.id}`}
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              required
                            />
                          </div>
                          <div className="workflow-field">
                            <label htmlFor={`edit-loc-${job.id}`}>
                              Location
                            </label>
                            <input
                              id={`edit-loc-${job.id}`}
                              value={editLocation}
                              onChange={(e) => setEditLocation(e.target.value)}
                              required
                            />
                          </div>
                          <div className="workflow-field">
                            <label htmlFor={`edit-type-${job.id}`}>
                              Employment Type
                            </label>
                            <select
                              id={`edit-type-${job.id}`}
                              value={editEmploymentType}
                              onChange={(e) =>
                                setEditEmploymentType(e.target.value)
                              }
                            >
                              <option>Full-time employment</option>
                              <option>Part-time employment</option>
                              <option>Remote work</option>
                              <option>Internship</option>
                              <option>Fellowship</option>
                              <option>Freelancing</option>
                            </select>
                          </div>
                          <div className="workflow-field">
                            <label htmlFor={`edit-skills-${job.id}`}>
                              Key Skills Required
                            </label>
                            <input
                              id={`edit-skills-${job.id}`}
                              value={editSkillsRequired}
                              onChange={(e) =>
                                setEditSkillsRequired(e.target.value)
                              }
                              required
                            />
                          </div>
                        </div>

                        <div className="workflow-field">
                          <label htmlFor={`edit-desc-${job.id}`}>
                            Role Description
                          </label>
                          <textarea
                            id={`edit-desc-${job.id}`}
                            rows={3}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            required
                          />
                        </div>

                        <div className="workflow-actions">
                          <button
                            type="submit"
                            className="btn-teal"
                            disabled={savingJobEdit}
                          >
                            {savingJobEdit ? "Saving..." : "Save Changes"}
                          </button>
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => setEditingJobId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <p>{job.description}</p>
                        <div className="workflow-actions">
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => startEditingJob(job)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => handleToggleJobStatus(job)}
                          >
                            {job.status === "open" ? "Close Role" : "Reopen Role"}
                          </button>
                          <button
                            type="button"
                            className="btn-danger-soft"
                            onClick={() => handleDeleteJob(job.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* APPLICANTS */}
        <section className="emp-panel" id="applicants">
          <h2>Applicants</h2>
          <p>Filter and review candidates who applied to your job postings.</p>

          {applications.length > 0 && (
            <div className="filter-row">
              <select
                aria-label="Filter applicants by job"
                value={selectedJobFilter}
                onChange={(e) => setSelectedJobFilter(e.target.value)}
              >
                <option value="all">All Job Postings ({applications.length})</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter applicants by status"
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>

              {(selectedJobFilter !== "all" || selectedStatusFilter !== "all") && (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setSelectedJobFilter("all");
                    setSelectedStatusFilter("all");
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}

          {applications.length === 0 ? (
            <div className="emp-empty">
              <span>👥</span>
              <h3>No applications received yet</h3>
              <p>
                Once job seekers apply to your open roles, their profiles and
                cover notes will appear here.
              </p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="emp-empty">
              <span>🔍</span>
              <h3>No applicants match these filters</h3>
              <p>Try selecting another job role or status filter.</p>
            </div>
          ) : (
            <div className="items-stack">
              {filteredApplications.map((app) => (
                <div className="item-card" key={app.id}>
                  <div className="item-card-top">
                    <div>
                      <h3>
                        {app.applicant?.full_name ||
                          app.applicant?.email ||
                          "Candidate"}{" "}
                        — <span className="item-meta">({app.job_title})</span>
                      </h3>
                      <p className="item-meta">
                        {app.applicant?.email} ·{" "}
                        {app.applicant?.country || "Location N/A"} ·{" "}
                        {app.applicant?.qualification || "Qualification N/A"}
                      </p>
                    </div>
                    <span className={`status-pill status-${app.status}`}>
                      {app.status}
                    </span>
                  </div>

                  <p>
                    <strong>Skills:</strong>{" "}
                    {app.applicant?.skills || "Not specified"}
                  </p>
                  {app.cover_note && (
                    <p>
                      <strong>Cover Note:</strong> {app.cover_note}
                    </p>
                  )}

                  <div className="workflow-actions">
                    <button
                      type="button"
                      className="btn-teal"
                      onClick={() =>
                        handleUpdateApplicationStatus(app.id, "shortlisted")
                      }
                    >
                      Shortlist
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() =>
                        handleUpdateApplicationStatus(app.id, "accepted")
                      }
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn-danger-soft"
                      onClick={() =>
                        handleUpdateApplicationStatus(app.id, "rejected")
                      }
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="emp-footer">
          Talent Link © 2026 · Connecting talent. Unlocking opportunity.
        </footer>
      </main>
    </div>
  );
}