import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  const url = request.nextUrl.pathname

  if (!token && (url.startsWith("/admin") || url.startsWith("/profile"))) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next
     * - static (static files)
     * - favicon.ico
     * - public folder
     */
    "/((?!_next|static|favicon.ico|public).*)",
    "/",
    "/admin/:path*",
    "/profile/:path*",
  ],
}
\`\`\`
