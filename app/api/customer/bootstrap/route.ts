import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCloudflareContext } from "@opennextjs/cloudflare";

async function runBootstrap() {
  let step = "start";

  try {
    step = "auth";
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, step, error: authError?.message ?? "Accesso richiesto." },
        { status: 401 }
      );
    }

    step = "service-client";
    const db = createServiceClient();

    step = "customer-lookup";
    const { env } = getCloudflareContext();
    const runtimeEnv = env as unknown as Record<string, string | undefined>;
    const processEnv = process.env as Record<string, string | undefined>;
    const resolvedUrl =
      runtimeEnv.SUPABASE_URL ||
      runtimeEnv.NEXT_PUBLIC_SUPABASE_URL ||
      processEnv.SUPABASE_URL ||
      processEnv.NEXT_PUBLIC_SUPABASE_URL ||
      null;

    const started = Date.now();
    const { data: existing, error: lookupError } = await db
      .from("customers")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    const lookupMs = Date.now() - started;

    if (lookupError) {
      let fetchProbe: Record<string, unknown> = {};
      if (resolvedUrl) {
        try {
          const probe = await fetch(`${resolvedUrl.replace(/\/$/, "")}/rest/v1/`, {
            method: "GET",
            headers: {
              apikey: processEnv.SUPABASE_SERVICE_ROLE_KEY ?? runtimeEnv.SUPABASE_SERVICE_ROLE_KEY ?? "",
              Authorization: `Bearer ${processEnv.SUPABASE_SERVICE_ROLE_KEY ?? runtimeEnv.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
            },
          });
          fetchProbe = {
            ok: probe.ok,
            status: probe.status,
            cfErrorType: probe.headers.get("cf-error-type"),
            cfErrorOrigin: probe.headers.get("cf-error-origin"),
            server: probe.headers.get("server"),
          };
        } catch (error) {
          fetchProbe = {
            thrown: error instanceof Error ? error.message : String(error),
            name: error instanceof Error ? error.name : typeof error,
          };
        }
      }

      return NextResponse.json(
        {
          ok: false,
          step,
          error: lookupError.message,
          code: lookupError.code,
          details: lookupError.details,
          hint: lookupError.hint,
          lookupMs,
          env: {
            worker: {
              supabaseUrl: runtimeEnv.SUPABASE_URL || runtimeEnv.NEXT_PUBLIC_SUPABASE_URL || null,
              serviceRolePresent: Boolean(runtimeEnv.SUPABASE_SERVICE_ROLE_KEY),
            },
            process: {
              supabaseUrl: processEnv.SUPABASE_URL || processEnv.NEXT_PUBLIC_SUPABASE_URL || null,
              serviceRolePresent: Boolean(processEnv.SUPABASE_SERVICE_ROLE_KEY),
            },
            bindingNames: Object.keys(runtimeEnv).filter((name) => name.includes("SUPABASE")).sort(),
          },
          resolvedUrl,
          fetchProbe,
          user: { id: user.id, email: user.email ?? null },
        },
        { status: 500 }
      );
    }

    if (existing) return NextResponse.json({ ok: true, customerId: existing.id });

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
      console.error("CUSTOMER_INSERT_ERROR", {
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        message: error?.message,
        userId: user.id,
      });
      return NextResponse.json(
        {
          ok: false,
          step,
          error: error?.message ?? "No customer returned",
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          env: {
            worker: {
              supabaseUrl: runtimeEnv.SUPABASE_URL || runtimeEnv.NEXT_PUBLIC_SUPABASE_URL || null,
              serviceRolePresent: Boolean(runtimeEnv.SUPABASE_SERVICE_ROLE_KEY),
            },
            process: {
              supabaseUrl: processEnv.SUPABASE_URL || processEnv.NEXT_PUBLIC_SUPABASE_URL || null,
              serviceRolePresent: Boolean(processEnv.SUPABASE_SERVICE_ROLE_KEY),
            },
            bindingNames: Object.keys(runtimeEnv).filter((name) => name.includes("SUPABASE")).sort(),
          },
          resolvedUrl,
          user: { id: user.id, email: user.email ?? null },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, customerId: customer.id });
  } catch (err) {
    console.error("BOOTSTRAP_ERROR", {
      step,
      name: err instanceof Error ? err.name : typeof err,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      {
        ok: false,
        step,
        error: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : typeof err,
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
