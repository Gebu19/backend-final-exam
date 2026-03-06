import { getClientPromise } from "@/lib/mongodb";
import corsHeaders from "@/lib/cors";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAuth, authErrorResponse } from "@/lib/auth";

export async function OPTIONS() {
    return new Response(null, { status: 200, headers: corsHeaders });
}

export async function PATCH(req, { params }) {
    const auth = await verifyAuth(req);
    if (auth.error) return authErrorResponse(auth.status, auth.error);

    try {
        const { id } = await params;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid request id" }, { status: 400, headers: corsHeaders });
        }

        const body = await req.json();
        const statusMap = {
            accepted: "accept",
            "cancel-admin": "cancel",
            "cancel-user": "cancel",
        };
        const rawStatus = body.requestStatus;
        const requestStatus = statusMap[rawStatus] || rawStatus;

        if (!["accept", "cancel"].includes(requestStatus)) {
            return NextResponse.json({ error: "Invalid status. Use 'accept' or 'cancel'" }, { status: 400, headers: corsHeaders });
        }

        const client = await getClientPromise();
        const db = client.db("library_db");

        const existingRequest = await db.collection("borrows").findOne({ _id: new ObjectId(id) });
        if (!existingRequest) {
            return NextResponse.json({ error: "Borrow request not found" }, { status: 404, headers: corsHeaders });
        }

        if (existingRequest.requestStatus !== "init") {
            return NextResponse.json({ error: "Only pending requests can be updated" }, { status: 409, headers: corsHeaders });
        }

        if (auth.user.role === "ADMIN") {
            // Admin can accept or cancel any pending request.
        } else {
            if (requestStatus !== "cancel") {
                return authErrorResponse(403, "Forbidden: Users can only cancel requests");
            }

            if (String(existingRequest.userId) !== String(auth.user.id)) {
                return authErrorResponse(403, "Forbidden: You can only cancel your own request");
            }
        }

        if (requestStatus === "accept") {
            const rawBookId = typeof existingRequest.bookId === "string"
                ? existingRequest.bookId
                : existingRequest.bookId?.toString?.();

            if (!rawBookId || !ObjectId.isValid(rawBookId)) {
                return NextResponse.json({ error: "Invalid book id on request" }, { status: 400, headers: corsHeaders });
            }

            const bookObjectId = new ObjectId(rawBookId);

            const bookUpdateResult = await db.collection("books").updateOne(
                { _id: bookObjectId, deleted: { $ne: true }, quantity: { $gt: 0 } },
                { $inc: { quantity: -1 }, $set: { updatedAt: new Date() } }
            );

            if (bookUpdateResult.modifiedCount === 0) {
                return NextResponse.json({ error: "Cannot accept: book is not available" }, { status: 409, headers: corsHeaders });
            }

            const borrowUpdateResult = await db.collection("borrows").updateOne(
                { _id: new ObjectId(id), requestStatus: "init" },
                { $set: { requestStatus, updatedAt: new Date() } }
            );

            if (borrowUpdateResult.modifiedCount === 0) {
                await db.collection("books").updateOne(
                    { _id: bookObjectId },
                    { $inc: { quantity: 1 }, $set: { updatedAt: new Date() } }
                );
                return NextResponse.json({ error: "Request is no longer pending" }, { status: 409, headers: corsHeaders });
            }
        } else {
            const borrowUpdateResult = await db.collection("borrows").updateOne(
                { _id: new ObjectId(id), requestStatus: "init" },
                { $set: { requestStatus, updatedAt: new Date() } }
            );

            if (borrowUpdateResult.modifiedCount === 0) {
                return NextResponse.json({ error: "Request is no longer pending" }, { status: 409, headers: corsHeaders });
            }
        }

        return NextResponse.json({ message: "Status updated successfully" }, { status: 200, headers: corsHeaders });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
}
