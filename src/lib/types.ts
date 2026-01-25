import type { GenerationMode, ProjectStatus } from "@/lib/constants";

export type BrandVoice = {
  tone?: string;
  audience?: string;
  do?: string;
  dont?: string;
  style_guidelines?: string;
  banned_words?: string;
};

export type Client = {
  id: string;
  user_id: string;
  name: string;
  industry: string | null;
  notes: string | null;
  brand_voice: BrandVoice | null;
  created_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  client_id: string;
  name: string;
  status: ProjectStatus;
  created_at: string;
};

export type Brief = {
  id: string;
  user_id: string;
  project_id: string;
  raw_text: string;
  parsed_summary: Record<string, string | string[]> | null;
  created_at: string;
};

export type Idea = {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  seed_text: string;
  created_at: string;
};

export type Output = {
  id: string;
  user_id: string;
  project_id: string;
  idea_id: string | null;
  mode: GenerationMode;
  version: number;
  content_md: string;
  is_primary: boolean;
  created_at: string;
};

export type Feedback = {
  id: string;
  user_id: string;
  project_id: string;
  output_id: string | null;
  text: string;
  created_at: string;
};

export type Reference = {
  id: string;
  user_id: string;
  project_id: string;
  type: "url" | "image";
  url: string | null;
  storage_path: string | null;
  notes: string | null;
  created_at: string;
};

export type ProjectWithClient = Project & { client: Pick<Client, "name"> | null };
