import { createClient } from "@/lib/supabase/server";
import type { Client, Project, Brief, Output, Feedback, Reference } from "@/lib/types";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getClients(options?: { query?: string }) {
  const supabase = await createClient();
  let query = supabase.from("clients").select("*");
  if (options?.query) {
    const q = options.query.trim();
    if (q.length > 0) {
      query = query.or(`name.ilike.%${q}%,industry.ilike.%${q}%`);
    }
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function getClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;
  return data as Client | null;
}

export async function getProjects(options?: { query?: string; status?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select("*, client:clients(name)");
  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  const projects = (data ?? []) as Array<Project & { client: { name: string } | null }>;
  if (options?.query) {
    const q = options.query.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(q) ||
        project.client?.name?.toLowerCase().includes(q)
    );
  }
  return projects;
}

export async function getProjectsForClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function getProject(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data as Project | null;
}

export async function getLatestBrief(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("briefs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Brief | null;
}

export async function getOutputs(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outputs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Output[];
}

export async function getFeedback(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Feedback[];
}

export async function getReferences(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("references")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Reference[];
}

export async function getClientProjectCounts() {
  const supabase = await createClient();
  const { count: clientCount, error: clientError } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true });
  if (clientError) throw clientError;

  const { count: projectCount, error: projectError } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true });
  if (projectError) throw projectError;

  return {
    clientCount: clientCount ?? 0,
    projectCount: projectCount ?? 0,
  };
}
