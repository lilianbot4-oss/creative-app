import { z } from "zod";
import { GENERATION_MODES, PROJECT_STATUSES, SCRIPT_FORMATS } from "@/lib/constants";

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
  feedbackText: z.string().optional().nullable(),
  rewriteGoal: z.string().optional().nullable(),
});

export const parseBriefSchema = z.object({
  briefId: z.string().uuid(),
  rawText: z.string().min(1),
});

export const creativeSpecSchema = z.object({
  project_id: z.string().uuid(),
  raw_brief_text: z.string().min(1, "Brief text is required"),
  parsed_json: z.record(z.string(), z.any()).optional().nullable(),
  must_do: z.array(z.string()).optional().nullable(),
  must_avoid: z.array(z.string()).optional().nullable(),
  tone_tags: z.array(z.string()).optional().nullable(),
  deliverables: z
    .array(z.object({ type: z.string(), notes: z.string().optional().nullable() }))
    .optional()
    .nullable(),
  key_message: z.string().optional().nullable(),
  audience: z.string().optional().nullable(),
});

export const parseCreativeSpecSchema = z.object({
  projectId: z.string().uuid(),
  rawText: z.string().optional().nullable(),
});

export const conceptSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1, "Concept title is required"),
  one_liner: z.string().optional().nullable(),
  thesis: z.string().optional().nullable(),
  product_integration: z.string().optional().nullable(),
  scalability: z.string().optional().nullable(),
  origin_type: z.enum(["human", "ai_assisted", "ai_generated"]).optional(),
  seed_text: z.string().optional().nullable(),
  parent_concept_id: z.string().uuid().optional().nullable(),
});

export const conceptVariantSchema = z.object({
  concept_id: z.string().uuid(),
  angle: z.string().min(1, "Variant angle is required"),
  summary: z.string().optional().nullable(),
});

export const generateConceptsSchema = z.object({
  projectId: z.string().uuid(),
  seedText: z.string().optional().nullable(),
  count: z.number().int().min(1).max(10).optional(),
  parentConceptId: z.string().uuid().optional().nullable(),
});

export const parseImportIdeasSchema = z.object({
  projectId: z.string().uuid(),
  rawText: z.string().min(1, "Text is required"),
});

export const batchCreateConceptsSchema = z.object({
  project_id: z.string().uuid(),
  concepts: z
    .array(
      z.object({
        title: z.string().min(1),
        thesis: z.string().optional().nullable(),
        seed_text: z.string().optional().nullable(),
        origin_type: z.enum(["human", "ai_assisted", "ai_generated"]).optional(),
        parent_concept_id: z.string().uuid().optional().nullable(),
      })
    )
    .min(1)
    .max(50),
});

export const generateVariantsSchema = z.object({
  conceptId: z.string().uuid(),
});

export const generateScriptSchema = z.object({
  projectId: z.string().uuid(),
  conceptId: z.string().uuid().optional().nullable(),
  variantId: z.string().uuid().optional().nullable(),
  format: z.enum(SCRIPT_FORMATS),
});

export const rewriteScriptSchema = z.object({
  projectId: z.string().uuid(),
  scriptId: z.string().uuid(),
  rewriteGoal: z.string().optional().nullable(),
  feedbackText: z.string().optional().nullable(),
});

export const generateStoryboardSchema = z.object({
  projectId: z.string().uuid(),
  scriptId: z.string().uuid(),
});
