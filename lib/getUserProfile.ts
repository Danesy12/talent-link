import { supabase } from "@/lib/supabase";

export type UserRole = "refugee" | "employer" | "mentor";

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string;
  country: string | null;
  phone: string | null;
  qualification: string | null;
  skills: string | null;
  employment_interest: string | null;
  organization: string | null;
  industry: string | null;
  website: string | null;
  expertise: string | null;
  experience: string | null;
  mentorship: string | null;
}

export async function getOrCreateProfile(): Promise<{
  profile: UserProfile | null;
  error: string | null;
}> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return { profile: null, error: sessionError.message };
  }

  const user = session?.user;
  if (!user) {
    return { profile: null, error: null };
  }

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    return { profile: null, error: selectError.message };
  }

  if (existing) {
    return { profile: existing as UserProfile, error: null };
  }

  const meta = user.user_metadata || {};
  const role: UserRole =
    meta.role === "employer" || meta.role === "mentor" ? meta.role : "refugee";

  const newProfile = {
    id: user.id,
    role,
    full_name: meta.full_name || user.email?.split("@")[0] || null,
    email: user.email || "",
    country: meta.country || null,
    phone: meta.phone || null,
    qualification: meta.qualification || null,
    skills: meta.skills || null,
    employment_interest: meta.employment_interest || null,
    organization: meta.organization || null,
    industry: meta.industry || null,
    website: meta.website || null,
    expertise: meta.expertise || null,
    experience: meta.experience || null,
    mentorship: meta.mentorship || null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .upsert(newProfile, { onConflict: "id" })
    .select("*")
    .single();

  if (insertError) {
    return { profile: null, error: insertError.message };
  }

  return { profile: inserted as UserProfile, error: null };
}