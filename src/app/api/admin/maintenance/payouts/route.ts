import { runAutomatedPayouts } from "@/lib/services/payoutService";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

async function handler(request: Request) {
  let currentDateIso: string | undefined;
  try {
    const body = (await request.json().catch(() => null)) as {
      currentDateIso?: string;
    } | null;
    if (body && typeof body.currentDateIso === "string") {
      currentDateIso = body.currentDateIso;
    }
  } catch {
    // Ignore JSON parse errors, defaults to current time
  }

  const result = await runAutomatedPayouts(currentDateIso);
  return Response.json(result);
}

export const POST = verifySignatureAppRouter(handler);

