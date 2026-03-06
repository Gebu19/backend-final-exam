// TODO: Students must implement CRUD for Book here, similar to Item.
// Example: GET (list all books), POST (create book)

// import necessary modules and setup as in Item

import { getClientPromise } from "@/lib/mongodb";
import corsHeaders from "@/lib/cors";
import { NextResponse } from "next/server";
import { verifyAuth, requireRole, authErrorResponse } from "@/lib/auth";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(req) {
  const auth = await verifyAuth(req);
  if (auth.error) return authErrorResponse(auth.status, auth.error);

  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const author = searchParams.get("author");

  let query = {};
  if (title) query.title = { $regex: title, $options: "i" };
  if (author) query.author = { $regex: author, $options: "i" };

  // SOFT DELETE LOGIC: Normal users cannot see deleted books
  if (auth.user.role !== "ADMIN") {
    query.deleted = { $ne: true };
  }

  try {
    const client = await getClientPromise();
    const db = client.db("library_db");
    const books = await db.collection("books").find(query).toArray();
    return NextResponse.json(books, { status: 200, headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req) {
  const auth = await verifyAuth(req);
  if (auth.error) return authErrorResponse(auth.status, auth.error);

  const roleCheck = requireRole(auth.user, ["ADMIN"]);
  if (roleCheck.error) return authErrorResponse(roleCheck.status, roleCheck.error);

  try {
    const body = await req.json();
    const { title, author, quantity, location, status } = body;

    const client = await getClientPromise();
    const db = client.db("library_db");

    const newBook = {
      title, author, quantity, location, status,
      deleted: false, // Core soft delete flag setup
      createdAt: new Date()
    };

    const result = await db.collection("books").insertOne(newBook);
    return NextResponse.json({ id: result.insertedId, ...newBook }, { status: 201, headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
