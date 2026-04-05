import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
    if (!env.googleClientId || !env.googleClientSecret) {
        return NextResponse.json({ error: "Google login is not configured" }, { status: 500 });
    }

    const state = crypto.randomBytes(24).toString("hex");
    const redirectUri = `${env.appUrl}/api/auth/google/callback`;
    const params = new URLSearchParams({
        client_id: env.googleClientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        prompt: "select_account",
        state
    });

    const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    response.cookies.set("google_oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 10
    });
    return response;
}
