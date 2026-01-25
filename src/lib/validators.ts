import { z } from "zod";
import { GENERATION_MODES, PROJECT_STATUSES } from "@/lib/constants";

export const clientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  industry: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const clientUpdateSchema = clientSchema.extend({
  id: z.string().uuid(),
});

export const brandVoiceSchema = z.object({
  tone: z.string().optional().nullable(),
  audience: z.string().optional().nullable(),
  do: z.string().optional().nullable(),
  dont: z.string().optional().nullable(),
  style_guidelines: z.string().optional().nullable(),
  banned_words: z.string().optional().nullable(),
});

export const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  client_id: z.string().uuid("Client is required"),
  status: z.enum(PROJECT_STATUSES).default("ideation"),
});

export const projectUpdateSchema = projectSchema.extend({
  id: z.string().uuid(),
});

export const briefSchema = z.object({
  project_id: z.string().uuid(),
  raw_text: z.string().min(1, "Brief text is required"),
});

export const ideaSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1),
  seed_text: z.string().min(1),
});

export const feedbackSchema = z.object({
  project_id: z.string().uuid(),
  output_id: z.string().uuid().nullable().optional(),
  text: z.string().min(1, "Feedback is required"),
});

export const outputGenerateSchema = z.object({
  projectId: z.string().uuid(),
  mode: z.enum(GENERATION_MODES),
  seedText: z.string().optional().nullable(),
  includeBrandVoice: z.boolean().optional().default(true),
  includeReferences: z.boolean().optional().default(true),
  regenFromFeedback: z.boolean().optional().default(false),
});

export const parseBriefSchema = z.object({
  briefId: z.string().uuid(),
  rawText: z.string().min(1),
});
