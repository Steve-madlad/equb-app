import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/auth";
import { createUserProfile, getUserProfile } from "@/lib/firebase/auth";

export async function POST(request: NextRequest) {
  try {
    const { uid, email } = await verifyAuthToken(request.headers.get("authorization"));
    const body = await request.json();
    const { displayName } = body;

    const existing = await getUserProfile(uid);
    if (existing) {
      return NextResponse.json({ profile: existing });
    }

    const profile = await createUserProfile({
      id: uid,
      email: email ?? "",
      displayName: displayName ?? email ?? "User",
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await verifyAuthToken(request.headers.get("authorization"));
    const profile = await getUserProfile(uid);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}
