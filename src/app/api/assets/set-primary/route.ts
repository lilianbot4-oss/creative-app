import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  assetId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: asset } = await supabase
      .from("concept_assets")
      .select("*")
      .eq("id", parsed.data.assetId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    if (!asset.concept_id) {
      return NextResponse.json({ error: "Asset is not linked to a concept" }, { status: 400 });
    }

    const { error: resetError } = await supabase
      .from("concept_assets")
      .update({ is_primary: false })
      .eq("concept_id", asset.concept_id)
      .eq("asset_type", asset.asset_type);

    if (resetError) {
      return NextResponse.json({ error: "Failed to reset primary" }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from("concept_assets")
      .update({ is_primary: true })
      .eq("id", asset.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to set primary" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Set primary asset failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
