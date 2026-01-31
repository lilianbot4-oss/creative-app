import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type LogActivityInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  projectId?: string | null;
  clientId?: string | null;
  metadata?: Record<string, unknown> | null;
  supabase?: SupabaseClient;
  userId?: string | null;
};

export async function logActivity({
  action,
  entityType,
  entityId,
  projectId,
  clientId,
  metadata,
  supabase,
  userId,
}: LogActivityInput) {
  try {
    const client = supabase ?? (await createClient());
    let resolvedUserId = userId ?? null;

    if (!resolvedUserId) {
      const {
        data: { user },
      } = await client.auth.getUser();
      resolvedUserId = user?.id ?? null;
    }

    if (!resolvedUserId) return;

    await client.from("activity_log").insert({
      user_id: resolvedUserId,
      project_id: projectId ?? null,
      client_id: clientId ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      metadata: metadata ?? null,
    });
  } catch (error) {
    console.error("Failed to log activity", error);
  }
}
