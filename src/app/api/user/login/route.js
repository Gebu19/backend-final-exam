import { getClientPromise } from "@/lib/mongodb";
import corsHeaders from "@/lib/cors";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// ✅ FIX: Use a standard Response with status 200 to satisfy Next.js CORS preflight rules
export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST(req) {
  try {
    // 🛑 NOTICE: We ONLY expect email and password from the frontend
    const { email, password } = await req.json();

    const client = await getClientPromise();
    const db = client.db("library_db");

    const user = await db.collection("users").findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401, headers: corsHeaders });
    }

    // ✅ The ROLE comes directly from your MongoDB document, NOT the user input!
    // If user.role is undefined here, your user in MongoDB is missing the "role" field.
    const tokenPayload = { id: user._id, email: user.email, role: user.role };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1d' });

    const response = NextResponse.json({
      message: "Success",
      user: { id: user._id, email: user.email, role: user.role }
    }, { status: 200, headers: corsHeaders });

    // Set secure HTTP-Only cookie for the frontend
    response.cookies.set("token", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 86400,
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}