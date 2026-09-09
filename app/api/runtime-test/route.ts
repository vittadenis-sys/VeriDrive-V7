import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  const { env } = getCloudflareContext();
  const runtimeEnv = env as unknown as Record<string, unknown>;
  const processEnv = process.env as Record<string, unknown>;

  return NextResponse.json({
    process: {
      url: !!processEnv.NEXT_PUBLIC_SUPABASE_URL,
      service: !!processEnv.SUPABASE_SERVICE_ROLE_KEY,
      workerName: processEnv.CF_WORKER_NAME ?? null,
      envName: processEnv.CF_ENV ?? null,
    },
    worker: {
      url: !!runtimeEnv.NEXT_PUBLIC_SUPABASE_URL,
      service: !!runtimeEnv.SUPABASE_SERVICE_ROLE_KEY,
      workerName: runtimeEnv.CF_WORKER_NAME ?? null,
      envName: runtimeEnv.CF_ENV ?? null,
    },
    allBindings: Object.keys(runtimeEnv).sort(),
  });
}
