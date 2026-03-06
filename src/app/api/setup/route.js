import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function GET() {
    try {
        const client = await getClientPromise();
        const db = client.db("library_db");

        // Hash the exact passwords requested
        const adminPassword = await bcrypt.hash("admin123", 10);
        const userPassword = await bcrypt.hash("user123", 10);

        // Insert the exact users requested
        await db.collection("users").insertMany([
            { email: "admin@test.com", password: adminPassword, role: "ADMIN", status: "ACTIVE" },
            { email: "user@test.com", password: userPassword, role: "USER", status: "ACTIVE" }
        ]);

        return NextResponse.json({ message: "Test users created successfully!" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}