# Talent Link

**Talent Link** (`talenteye`) is a Next.js and Supabase web application built to connect skilled refugees with meaningful careers, inclusive employers, and professional mentors.

- **Live Site:** https://talent-link-omega.vercel.app/
- **Sign In (All Roles):** https://talent-link-omega.vercel.app/login
- **Create an Account:** https://talent-link-omega.vercel.app/register
- **Password Reset:** https://talent-link-omega.vercel.app/reset-password

---

## Core Pathways & SDG Alignment

Talent Link addresses key employment barriers for displaced talent across three pathways:

1. **Skills & Credentials (SDGs 4 & 8):** Job seekers showcase qualifications, technical skills, preferred work arrangements (full-time, part-time, remote, internship, fellowship, freelancing), and profile readiness.
2. **Employment Readiness (SDGs 8, 10 & 16):** Supports structured onboarding, profile verification steps, and application readiness.
3. **Mentorship & Networks (SDGs 8, 10 & 17):** Connects displaced professionals with experienced mentors and industry networks.

---

## Role-Based Portals & Workflows

After registering at [`/register`](https://talent-link-omega.vercel.app/register) or signing in at [`/login`](https://talent-link-omega.vercel.app/login), users are automatically routed to their role dashboard:

### 1. Job Seeker Dashboard (`/dashboard/refugee`)
- **Profile & Skills:** Add and edit personal details, qualifications, key skills, location, and preferred work type with live profile completion tracking.
- **Job Discovery & Applications:** Browse and filter open jobs posted by employers, submit applications with optional cover notes, monitor status updates (`pending`, `shortlisted`, `accepted`, `rejected`), and withdraw `pending` applications.
- **Mentorship Access:** Explore available mentors, request mentorship with a custom message, track request status, and cancel `pending` requests.

### 2. Employer Dashboard (`/dashboard/employer`)
- **Organization Profile:** Manage organization details, sector, website, and contact information.
- **Job Postings Management:** Create, publish, edit, close/reopen, and delete job opportunities.
- **Applicant Review:** Filter applicants by job and application status, review candidate skills and cover notes, and move candidates to `shortlisted`, `accepted`, or `rejected`.

### 3. Mentor Dashboard (`/dashboard/mentor`)
- **Mentor Profile:** List areas of expertise, years of experience, mentorship focus, and availability.
- **Mentee Requests:** Review incoming mentorship requests alongside mentee skills and goals, then accept or decline requests.
- **Coaching & Session Notes:** Track accepted mentees and save guidance/session notes (`session_notes`).

---

## Authentication & Route Protection

- **Registration (`/register`):** Collects role-specific details (qualification and skills for job seekers, organization details for employers, expertise for mentors) and stores them as signup metadata.
- **Sign-In (`/login`):** Looks up the user's profile and routes them to `/dashboard/refugee`, `/dashboard/employer`, or `/dashboard/mentor` based on their role.
- **Password Recovery (`/reset-password`):** Handles recovery links so users can set a new password and sign back in.
- **Route Guards:** Each dashboard uses the shared `useRoleProfile(expectedRole)` hook (`lib/useRoleProfile.ts`), which:
  - checks the active session and sends unauthenticated visitors to `/login`;
  - sends a signed-in user with a different role to their **own** dashboard instead of `/login`, which avoids redirect loops;
  - reads the profile with `.maybeSingle()` and falls back to the account's signup metadata if the profile row is missing;
  - shows the real error message when a profile cannot be loaded, so problems are easy to diagnose;
  - provides a `signOut()` helper that ends the session and returns to `/login`.

---

## Tech Stack

- **Framework:** Next.js (App Router, TypeScript)
- **Backend & Auth:** Supabase (PostgreSQL, Row-Level Security, Email/Password Auth)
- **Deployment:** Vercel

---

## Database & Row-Level Security

- **Tables:** `profiles`, `jobs`, `applications`, and `mentorship_requests`, all protected with Row-Level Security (RLS).
- **Profiles:** One row per user (`id`, `full_name`, `email`, `role`, `country`, `phone`). The `handle_new_user()` trigger creates the row automatically on signup from the signup metadata.
- **Access rule:** A signed-in user can read only their own `profiles` row (`auth.uid() = id`).
- **Withdraw and cancel:** `DELETE` policies let job seekers withdraw `pending` applications and cancel `pending` mentorship requests. `session_notes` is stored on `mentorship_requests`.
- **Security note:** Any `UPDATE` policy on `profiles` should not let users change their own `role`. If profile editing is enabled, restrict that column (for example with a trigger, or by moving role changes to a server-side function).

---

## Project Structure

```
talent-link/
├── app/
│   ├── dashboard/
│   │   ├── employer/page.tsx     # /dashboard/employer
│   │   ├── mentor/page.tsx       # /dashboard/mentor
│   │   └── refugee/page.tsx      # /dashboard/refugee
│   ├── login/page.tsx            # /login
│   ├── register/page.tsx         # /register
│   ├── reset-password/page.tsx   # /reset-password
│   ├── globals.css               # shared styles
│   └── favicon.ico
├── lib/
│   ├── supabase.ts               # Supabase client
│   └── useRoleProfile.ts         # shared profile loading and role guard hook
└── supabase/
    └── profiles-fix.sql          # profiles table, RLS policy, signup trigger, backfill
```

> Next.js builds URLs from folder names, so each dashboard must live at `app/dashboard/<role>/page.tsx` or it returns a 404. If your project uses a `src/` folder, `app/` and `lib/` live inside it.

---

## Getting Started Locally

1. **Clone the repository and install dependencies:**
   ```bash
   git clone https://github.com/Danesy12/talent-link.git
   cd talent-link
   npm install
   ```

2. **Configure environment variables.** Create a `.env.local` file in the project root:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
   Both values are in the Supabase dashboard under **Project Settings → API**. Make sure the names match what `lib/supabase.ts` reads.

3. **Set up the database.** In the Supabase dashboard, open **SQL Editor → New query**, paste the contents of `supabase/profiles-fix.sql`, and run it. It is safe to run more than once. The script:
   - creates the `profiles` table and any missing columns;
   - enables RLS and adds the policy that lets users read their own row;
   - installs the `handle_new_user()` trigger so new signups get a profile automatically;
   - backfills profiles for users who signed up before the trigger existed;
   - ends with a check query listing each user and their role.

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app** at [http://localhost:3000](http://localhost:3000), then register or sign in. Each role lands on its own dashboard:
   - Job Seeker: http://localhost:3000/dashboard/refugee
   - Employer: http://localhost:3000/dashboard/employer
   - Mentor: http://localhost:3000/dashboard/mentor

---

## Troubleshooting

| Problem | Likely cause and fix |
| --- | --- |
| **404 "This page could not be found"** on a dashboard | The folder is in the wrong place or misnamed. It must be `app/dashboard/<role>/page.tsx` with a lowercase `page.tsx`. After moving files, stop the server, delete the `.next` folder, and run `npm run dev` again. |
| **"Your profile could not be loaded"** or "No profile was found" | The `profiles` row, a column, or the RLS policy is missing. Run `supabase/profiles-fix.sql`. The error text on screen includes the Supabase message. |
| **Redirected to the wrong dashboard or to `/login`** | The `role` stored for the account does not match the page. Check `profiles.role` (`refugee`, `employer`, or `mentor`, lowercase). |
| **Build fails on `react/no-unescaped-entities` or `no-html-link-for-pages`** | Use `&apos;` for apostrophes in JSX text and `next/link`'s `Link` instead of `<a href="/...">` for internal links. |
| **Signup works but no email arrives** | Email confirmation may be enabled in Supabase (**Authentication → Providers → Email**). Confirm the address first, or disable confirmation while testing. |

---

## Deployment

The app is deployed on [Vercel](https://vercel.com). Before deploying:

- Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under **Project Settings → Environment Variables** in Vercel.
- Add the live site URL (`https://talent-link-omega.vercel.app`) to the allowed redirect URLs in Supabase (**Authentication → URL Configuration**) so email verification and password-reset links work in production.

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
