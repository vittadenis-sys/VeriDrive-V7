import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const { env } = getCloudflareContext();
    const runtimeEnv = env as unknown as Record<string, unknown>;
    const processEnv = process.env as Record<string, unknown>;

    const workerUrl = runtimeEnv.NEXT_PUBLIC_SUPABASE_URL;
    const workerKey = runtimeEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const workerService = runtimeEnv.SUPABASE_SERVICE_ROLE_KEY;

    const processUrl = processEnv.NEXT_PUBLIC_SUPABASE_URL;
    const processKey = processEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const processService = processEnv.SUPABASE_SERVICE_ROLE_KEY;

    return NextResponse.json({
      worker: {
        url: Boolean(workerUrl),
        publishableKey: Boolean(workerKey),
        publishableKeyLength: typeof workerKey === "string" ? workerKey.length : null,
        serviceRole: Boolean(workerService),
      },
      process: {
        url: Boolean(processUrl),
        publishableKey: Boolean(processKey),
        publishableKeyLength: typeof processKey === "string" ? processKey.length : null,
        serviceRole: Boolean(processService),
      },
      cookies: cookieStore.getAll().map(({ name }) => name),
      supabaseBindings: Object.keys(runtimeEnv).filter((name) => name.includes("SUPABASE")).sort(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
