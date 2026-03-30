import { NextResponse } from "next/server";
import { seedDatabase } from "@/scripts/seed";
export async function POST() {
    const result = await seedDatabase();
    return NextResponse.json(result);
}
