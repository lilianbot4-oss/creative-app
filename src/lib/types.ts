import type { GenerationMode, ProjectStatus, ScriptFormat } from "@/lib/constants";

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

export type CreativeSpec = {
  id: string;
  user_id: string;
  project_id: string;
  raw_brief_text: string;
  active_brief_upload_id?: string | null;
  parsed_json: Record<string, unknown> | null;
  must_do: string[] | null;
  must_avoid: string[] | null;
  tone_tags: string[] | null;
  deliverables: Array<{ type: string; notes?: string | null }> | null;
  key_message: string | null;
  audience: string | null;
  created_at: string;
  updated_at: string;
};

export type Concept = {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  one_liner: string | null;
  thesis: string | null;
  share_triggers: string[] | null;
  product_integration: string | null;
  cast_archetypes: string[] | null;
  beats: Array<Record<string, unknown>> | null;
  risks: Array<{ risk: string; mitigation?: string | null }> | null;
  scalability: string | null;
  origin_type?: "human" | "ai_assisted" | "ai_generated";
  ai_generation_id?: string | null;
  seed_text?: string | null;
  parent_concept_id?: string | null;
  last_edited_by_user_id?: string | null;
  updated_at?: string;
  created_at: string;
};

export type ConceptVariant = {
  id: string;
  user_id: string;
  concept_id: string;
  angle: string;
  summary: string | null;
  tradeoffs: string[] | null;
  created_at: string;
};

export type Script = {
  id: string;
  user_id: string;
  project_id: string;
  concept_id: string | null;
  variant_id: string | null;
  format: ScriptFormat;
  script_md: string;
  meta: Record<string, unknown> | null;
  version: number;
  is_primary: boolean;
  origin_type?: "human" | "ai_assisted" | "ai_generated";
  ai_generation_id?: string | null;
  seed_text?: string | null;
  updated_at?: string;
  created_at: string;
};

export type ProjectBriefUpload = {
  id: string;
  user_id: string;
  project_id: string;
  filename: string;
  file_type: "pdf" | "pptx" | string;
  file_size: number | null;
  extracted_text: string;
  extracted_meta: Record<string, unknown> | null;
  created_at: string;
};

export type ConceptAsset = {
  id: string;
  user_id: string;
  project_id: string;
  concept_id: string | null;
  variant_id: string | null;
  script_id: string | null;
  asset_type: "key_visual" | "moodboard" | "storyboard_frame" | string;
  prompt_text: string | null;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  is_primary: boolean;
  created_at: string;
};

export type Storyboard = {
  id: string;
  user_id: string;
  project_id: string;
  script_id: string;
  frames: Array<{
    frame: number;
    shot: string;
    setting: string;
    action: string;
    os_text?: string | null;
    audio?: string | null;
    props?: string[] | null;
  }>;
  shotlist: Record<string, unknown> | null;
  created_at: string;
};

export type ShareLink = {
  id: string;
  user_id: string;
  project_id: string;
  token: string;
  label: string | null;
  view_type: "pitch" | "export";
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type ActivityEvent = {
  id: string;
  user_id: string | null;
  project_id: string | null;
  client_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};
