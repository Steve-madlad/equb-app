import { fetchSupportedBanks } from "@/lib/services/chapaTransferService";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const banks = await fetchSupportedBanks();
    return NextResponse.json({ banks });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch supported banks" },
      { status: 500 }
    );
  }
}
