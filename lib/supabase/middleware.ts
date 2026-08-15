import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      const target = request.nextUrl.clone(); target.pathname = "/login"; target.searchParams.set("error", "config");
      return NextResponse.redirect(target);
    }
    return response;
  }
  const supabase = createServerClient(url, key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (items) => { items.forEach(({name,value}) => request.cookies.set(name,value)); response = NextResponse.next({ request }); items.forEach(({name,value,options}) => response.cookies.set(name,value,options)); },
  } });
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user && path.startsWith("/dashboard")) { const target=request.nextUrl.clone(); target.pathname="/login"; target.search=""; return NextResponse.redirect(target); }
  if (user && path === "/login") { const target=request.nextUrl.clone(); target.pathname="/dashboard"; target.search=""; return NextResponse.redirect(target); }
  return response;
}
