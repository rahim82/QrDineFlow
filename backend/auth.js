import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "./env.js";

export function signToken(payload) {
    return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function createSessionPayload(user) {
    return {
        id: String(user._id),
        role: user.role,
        restaurantId: user.restaurantId ? String(user.restaurantId) : undefined,
        name: user.name,
        email: user.email
    };
}

export function applySessionCookie(response, token) {
    response.cookies.set("qr_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7
    });
    return response;
}

export function createLoginResponse(user) {
    const token = signToken(createSessionPayload(user));
    const response = NextResponse.json({
        user: {
            id: String(user._id),
            role: user.role,
            name: user.name,
            email: user.email
        }
    });
    return applySessionCookie(response, token);
}

export function createRedirectLoginResponse(user, destination) {
    const token = signToken(createSessionPayload(user));
    const response = NextResponse.redirect(new URL(destination, env.appUrl));
    return applySessionCookie(response, token);
}

export async function getSession() {
    const store = await cookies();
    const token = store.get("qr_session")?.value;
    if (!token)
        return null;
    try {
        return jwt.verify(token, env.jwtSecret);
    }
    catch {
        return null;
    }
}
