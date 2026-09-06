import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const cookies: CookieMethodsServer = {
    getAll: () => request.cookies.getAll(),
    setAll: (items) => {
      response = NextResponse.next({ request });
      for (const { name, value, options } of items) {
        response.cookies.set(name, value, options);
      }
    },
  };

  const supabase = createServerClient(url, key, { cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const protectedArea =
    path.startsWith("/dashboard") ||
    path.startsWith("/officina") ||
    path.startsWith("/admin");

  if (!user && protectedArea) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  return response;
}
