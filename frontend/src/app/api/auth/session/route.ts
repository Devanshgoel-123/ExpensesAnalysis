import { NextResponse } from "next/server";

/** Stops Next dev 404s for clients probing /api/auth/session. Auth uses JWT in localStorage. */
export async function GET() {
  return NextResponse.json({ user: null, authenticated: false });
}
