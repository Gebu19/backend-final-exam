// TODO: Students must implement authentication and role-based access control here.
// Remove this stub and implement JWT verification and role checking as required in the exam.


import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import corsHeaders from "./cors";

// Helper to verify if the user is logged in
export async function verifyAuth(req) {
    try {
        // Check for token in cookies OR Authorization header
        const token = req.cookies.get("token")?.value || req.headers.get("Authorization")?.split(" ")[1];

        if (!token) {
            return { error: "Unauthorized: Please log in", status: 401 };
        }

        // Decode token using your exact JWT_SECRET
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return { user: decoded, status: 200 };
    } catch (error) {
        return { error: "Unauthorized: Invalid or expired session", status: 401 };
    }
}

// Helper to enforce Role-Based Access Control (RBAC)
export function requireRole(user, allowedRoles) {
    if (!user || !user.role || !allowedRoles.includes(user.role)) {
        return { error: "Forbidden: You do not have permission", status: 403 };
    }
    return { status: 200 };
}

// Helper for standardized error responses
export function authErrorResponse(status, message) {
    return NextResponse.json({ error: message }, { status, headers: corsHeaders });
}