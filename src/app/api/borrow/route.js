import { getClientPromise } from "@/lib/mongodb";
import corsHeaders from "@/lib/cors";
import { NextResponse } from "next/server";
import { verifyAuth, authErrorResponse } from "@/lib/auth";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(req) {
  const auth = await verifyAuth(req);
  if (auth.error) return authErrorResponse(auth.status, auth.error);

  try {
    const client = await getClientPromise();
    const db = client.db("library_db");

    // Admins see all requests; Normal users only see their own
    const query = auth.user.role === "ADMIN" ? {} : { userId: auth.user.id };

    const borrows = await db.collection("borrows").find(query).toArray();
    return NextResponse.json(borrows, { status: 200, headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req) {
  const auth = await verifyAuth(req);
  if (auth.error) return authErrorResponse(auth.status, auth.error);

  try {
    const body = await req.json();
    const { bookId, targetDate } = body;

    if (!bookId || !targetDate) {
      return NextResponse.json({ error: "Missing bookId or targetDate" }, { status: 400, headers: corsHeaders });
    }

    const client = await getClientPromise();
    const db = client.db("library_db");

    const newBorrowRequest = {
      userId: auth.user.id,
      userEmail: auth.user.email, // ✅ ADDED: Save the actual borrower's email!
      bookId: bookId,
      createdAt: new Date(),
      targetDate: new Date(targetDate),
      requestStatus: "init"
    };

    const result = await db.collection("borrows").insertOne(newBorrowRequest);
    return NextResponse.json({ id: result.insertedId, ...newBorrowRequest }, { status: 201, headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}