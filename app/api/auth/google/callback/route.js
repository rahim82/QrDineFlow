import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { createRedirectLoginResponse } from "@/lib/auth";
import { env } from "@/lib/env";
import { slugify } from "@/lib/slugify";
import { Restaurant } from "@/models/Restaurant";
import { User } from "@/models/User";

async function exchangeCodeForProfile(code) {
    const redirectUri = `${env.appUrl}/api/auth/google/callback`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: env.googleClientId,
            client_secret: env.googleClientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code"
        })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
        throw new Error("Google token exchange failed");
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
            Authorization: `Bearer ${tokenData.access_token}`
        }
    });

    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.email) {
        throw new Error("Google profile fetch failed");
    }

    return profile;
}

async function createStarterWorkspace(profile) {
    const displayName = profile.name?.trim() || profile.email.split("@")[0];
    const baseRestaurantName = `${displayName.split(" ")[0]}'s Restaurant`;
    const baseSlug = slugify(baseRestaurantName);
    const duplicateCount = await Restaurant.countDocuments({ slug: new RegExp(`^${baseSlug}`) });
    const slug = duplicateCount ? `${baseSlug}-${duplicateCount + 1}` : baseSlug;

    const restaurant = await Restaurant.create({
        name: baseRestaurantName,
        slug,
        tagline: "Set up your tables and menu to start taking QR orders.",
        gstRate: 0
    });

    const user = await User.create({
        name: displayName,
        email: profile.email,
        role: "manager",
        restaurantId: restaurant._id
    });

    restaurant.managerIds = [user._id];
    await restaurant.save();

    return user;
}

export async function GET(request) {
    if (!env.googleClientId || !env.googleClientSecret) {
        return NextResponse.redirect(new URL("/login?error=google_not_configured", env.appUrl));
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const cookieStore = await cookies();
    const storedState = cookieStore.get("google_oauth_state")?.value;

    if (error) {
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, env.appUrl));
    }

    if (!code || !state || !storedState || state !== storedState) {
        return NextResponse.redirect(new URL("/login?error=google_state_invalid", env.appUrl));
    }

    try {
        const profile = await exchangeCodeForProfile(code);
        await connectToDatabase();

        let user = await User.findOne({ email: profile.email });
        if (!user) {
            user = await createStarterWorkspace(profile);
        }

        const destination = user.role === "admin" ? "/admin/dashboard" : "/manager/dashboard";
        const response = createRedirectLoginResponse(user, destination);
        response.cookies.set("google_oauth_state", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0
        });
        return response;
    }
    catch (callbackError) {
        console.error("Google login callback failed", callbackError);
        return NextResponse.redirect(new URL("/login?error=google_login_failed", env.appUrl));
    }
}
