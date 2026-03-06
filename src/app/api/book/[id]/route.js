// TODO: Students must implement CRUD for Book here, similar to Item.
// Example: GET (get book by id), PATCH (update), DELETE (remove)

// import necessary modules and setup as in Item
import { getClientPromise } from "@/lib/mongodb";
import corsHeaders from "@/lib/cors";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAuth, requireRole, authErrorResponse } from "@/lib/auth";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(req, { params }) {
  const auth = await verifyAuth(req);
  if (auth.error) return authErrorResponse(auth.status, auth.error);

  try {
    const { id } = await params;
    const client = await getClientPromise();
    const db = client.db("library_db");
    const book = await db.collection("books").findOne({ _id: new ObjectId(id) });

    if (!book) return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders });

    // Enforce soft-delete view restriction on single fetch
    if (book.deleted && auth.user.role !== "ADMIN") {
      return authErrorResponse(403, "Forbidden: Book is no longer available");
    }

    return NextResponse.json(book, { status: 200, headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 500, headers: corsHeaders });
  }
}

export async function PATCH(req, { params }) {
  const auth = await verifyAuth(req);
  if (auth.error) return authErrorResponse(auth.status, auth.error);

  const roleCheck = requireRole(auth.user, ["ADMIN"]);
  if (roleCheck.error) return authErrorResponse(roleCheck.status, roleCheck.error);

  try {
    const { id } = await params;
    const body = await req.json();
    const client = await getClientPromise();
    const db = client.db("library_db");

    await db.collection("books").updateOne(
      { _id: new ObjectId(id) },
      { $set: body }
    );

    return NextResponse.json({ message: "Updated" }, { status: 200, headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(req, { params }) {
  const auth = await verifyAuth(req);
  if (auth.error) return authErrorResponse(auth.status, auth.error);

  const roleCheck = requireRole(auth.user, ["ADMIN"]);
  if (roleCheck.error) return authErrorResponse(roleCheck.status, roleCheck.error);

  try {
    const { id } = await params;
    const client = await getClientPromise();
    const db = client.db("library_db");

    // EXAM REQUIREMENT: Soft delete only
    await db.collection("books").updateOne(
      { _id: new ObjectId(id) },
      { $set: { deleted: true, deletedAt: new Date() } }
    );

    return NextResponse.json({ message: "Book softly deleted" }, { status: 200, headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
