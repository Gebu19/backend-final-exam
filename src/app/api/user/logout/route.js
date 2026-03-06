
// REFERENCE: This file is provided as a user logout example.
// Students must implement authentication and role-based logic as required in the exam.
import corsHeaders from "@/lib/cors";
import { NextResponse } from "next/server";

// In api/user/logout/route.js
export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders }); // Must be Response, not NextResponse.json
}

export async function POST() {
  const response = NextResponse.json({ message: "Logout successful" }, { status: 200, headers: corsHeaders });

  // Clear the cookie by setting maxAge to 0
  response.cookies.set("token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return response;
}