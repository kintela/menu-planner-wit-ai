import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Middleware deshabilitado temporalmente para detener el bucle infinito
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [], // No aplica a ninguna ruta
};
