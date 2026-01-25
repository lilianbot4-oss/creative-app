import type { SupabaseClient } from "@supabase/supabase-js";

const DAILY_REQUEST_LIMIT = 50;

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export async function enforceUsageLimit(
  supabase: SupabaseClient,
  userId: string,
  tokensEstimate: number
) {
  const usageDate = todayDateString();
  const { data, error } = await supabase
    .from("usage")
    .select("id, requests_count, tokens_estimate")
    .eq("user_id", userId)
    .eq("usage_date", usageDate)
    .maybeSingle();

  if (error) {
    console.error("Usage lookup failed", error);
  }

  const currentRequests = data?.requests_count ?? 0;
  const currentTokens = data?.tokens_estimate ?? 0;

  if (currentRequests >= DAILY_REQUEST_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  const nextRequests = currentRequests + 1;
  const nextTokens = currentTokens + tokensEstimate;

  const { error: upsertError } = await supabase.from("usage").upsert(
    {
      user_id: userId,
      usage_date: usageDate,
      requests_count: nextRequests,
      tokens_estimate: nextTokens,
    },
    { onConflict: "user_id,usage_date" }
  );

  if (upsertError) {
    console.error("Usage upsert failed", upsertError);
  }

  return { allowed: true, remaining: DAILY_REQUEST_LIMIT - nextRequests };
}

export function estimateTokensFromText(text: string) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function getDailyRequestLimit() {
  return DAILY_REQUEST_LIMIT;
}
