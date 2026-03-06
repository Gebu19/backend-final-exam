import { getClientPromise } from "@/lib/mongodb";
import corsHeaders from "@/lib/cors";
import { NextResponse } from "next/server";
import { verifyAuth, authErrorResponse } from "@/lib/auth";
import { ObjectId } from "mongodb";

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

    let requestStatus = "init";
    if (!ObjectId.isValid(bookId)) {
      requestStatus = "close-no-available-book";
    } else {
      const book = await db.collection("books").findOne({ _id: new ObjectId(bookId) });
      const isAvailable = book && !book.deleted && Number(book.quantity) > 0;
      if (!isAvailable) {
        requestStatus = "close-no-available-book";
      }
    }

    const newBorrowRequest = {
      userId: auth.user.id,
      userEmail: auth.user.email,
      bookId: bookId,
      createdAt: new Date(),
      targetDate: new Date(targetDate),
      requestStatus
    };

    const result = await db.collection("borrows").insertOne(newBorrowRequest);
    return NextResponse.json({ id: result.insertedId, ...newBorrowRequest }, { status: 201, headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
