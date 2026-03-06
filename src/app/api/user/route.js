
// REFERENCE: This file is provided as a user registration example.
// Students must implement authentication and role-based logic as required in the exam.
import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

// ✅ Add OPTIONS to prevent CORS preflight crashes!
export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST(req) {
  const data = await req.json();
  const username = data.username;
  const email = data.email;
  const password = data.password;
  const firstname = data.firstname;
  const lastname = data.lastname;

  // ✅ Extract role from the payload, default to "USER" for safety
  const role = data.role || "USER";

  if (!username || !email || !password) {
    return NextResponse.json({
      message: "Missing mandatory data"
    }, {
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    const client = await getClientPromise();

    // ✅ Updated to use the correct database and collection names!
    const db = client.db("library_db");
    const result = await db.collection("users").insertOne({
      username: username,
      email: email,
      password: await bcrypt.hash(password, 10),
      firstname: firstname,
      lastname: lastname,
      status: "ACTIVE",
      role: role // ✅ Injected the role directly into the document
    });

    return NextResponse.json({
      id: result.insertedId
    }, {
      status: 200,
      headers: corsHeaders
    });
  }
  catch (exception) {
    const errorMsg = exception.toString();
    let displayErrorMsg = "";
    if (errorMsg.includes("duplicate")) {
      if (errorMsg.includes("username")) {
        displayErrorMsg = "Duplicate Username!!";
      }
      else if (errorMsg.includes("email")) {
        displayErrorMsg = "Duplicate Email!!";
      }
    }
    return NextResponse.json({
      message: displayErrorMsg
    }, {
      status: 400,
      headers: corsHeaders
    });
  }
}