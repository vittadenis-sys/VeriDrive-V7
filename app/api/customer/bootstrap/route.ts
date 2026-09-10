import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCloudflareContext } from "@opennextjs/cloudflare";

function summarizeUrl(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    return {
      present: true,
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      length: value.length,
    };
  } catch {
    return { present: true, invalid: true, length: value.length };
  }
}

function envSummary() {
  const { env } = getCloudflareContext();
  const runtimeEnv = env as unknown as Record<string, unknown>;
  const processEnv = process.env as Record<string, unknown>;

  const workerUrl = runtimeEnv.SUPABASE_URL ?? runtimeEnv.NEXT_PUBLIC_SUPABASE_URL;
  const processUrl = processEnv.SUPABASE_URL ?? processEnv.NEXT_PUBLIC_SUPABASE_URL;

  return {
    worker: {
      supabaseUrl: summarizeUrl(workerUrl),
      serviceRolePresent: Boolean(runtimeEnv.SUPABASE_SERVICE_ROLE_KEY),
    },
    process: {
      supabaseUrl: summarizeUrl(processUrl),
      serviceRolePresent: Boolean(processEnv.SUPABASE_SERVICE_ROLE_KEY),
    },
    bindingNames: Object.keys(runtimeEnv).filter((name) => name.includes("SUPABASE")).sort(),
  };
}

async function runBootstrap() {
  let step = "start";

  try {
    step = "auth";
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, step, error: authError?.message ?? "Accesso richiesto.", env: envSummary() },
        { status: 401 }
      );
    }

    step = "service-client";
    const db = createServiceClient();

    step = "customer-lookup";
    const lookupStarted = Date.now();
    const { data: existing, error: lookupError } = await db
      .from("customers")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json(
        {
          ok: false,
          step,
          error: lookupError.message,
          code: lookupError.code,
          details: lookupError.details,
          hint: lookupError.hint,
          lookupMs: Date.now() - lookupStarted,
          env: envSummary(),
          user: { id: user.id, email: user.email },
        },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json({
        ok: true,
        step: "customer-found",
        customerId: existing.id,
        env: envSummary(),
        user: { id: user.id, email: user.email },
      });
    }

    step = "customer-insert";
    const fullName = String(
      user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Cliente"
    ).trim() || "Cliente";

    const { data: customer, error } = await db
      .from("customers")
      .insert({ auth_id: user.id, full_name: fullName })
      .select("id")
      .single();

    if (error || !customer) {
      return NextResponse.json(
        {
          ok: false,
          step,
          error: error?.message ?? "No customer returned",
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          env: envSummary(),
          user: { id: user.id, email: user.email },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      step: "customer-created",
      customerId: customer.id,
      env: envSummary(),
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        step,
        error: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : typeof err,
        env: (() => {
          try { return envSummary(); } catch { return null; }
        })(),
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return runBootstrap();
}

export async function GET() {
  return runBootstrap();
}
