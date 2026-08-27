import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Learn how Ethiopian Equb (እቁብ) rotating savings works: peer-to-peer contributions, fair automated draws, and zero administrator fees.",
  alternates: {
    canonical: "/how-it-works",
  },
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-4 py-4">
        <Link href="/" className="text-xl font-bold text-emerald-700">
          ← Back to Home
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">How Equb Works</h1>
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold">What is an Equb?</h2>
            <p className="mt-2 text-gray-600">
              An Equb (እቁብ) is a traditional Ethiopian rotating savings system.
              A group of members contribute a fixed amount on a recurring schedule.
              Each cycle, one member receives the pooled contributions. The process
              continues until every member has received one payout.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Example</h2>
            <p className="mt-2 text-gray-600">
              10 members × 1,000 ETB/month = 10,000 ETB pool per cycle.
              One randomly selected member receives 10,000 ETB each month
              until all 10 members have received their payout.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Key Rules</h2>
            <ul className="mt-2 list-inside list-disc space-y-2 text-gray-600">
              <li>No interest — this is savings, not lending</li>
              <li>No administrator fees — 100% goes to members</li>
              <li>Random payout selection — fair and auditable</li>
              <li>Members with overdue contributions are not eligible for payout</li>
              <li>Receiving a payout does not cancel future contribution obligations</li>
              <li>Membership is fixed once the Equb starts</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Lifecycle</h2>
            <pre className="mt-2 rounded-lg bg-gray-100 p-4 text-sm">
{`DRAFT → OPEN FOR MEMBERS → LOCKED → ACTIVE → COMPLETED

During ACTIVE:
  Cycle 1 → Random draw → Payout
  Cycle 2 → Random draw → Payout
  ...
  Final cycle → COMPLETED`}
            </pre>
          </section>
        </div>
      </main>
    </div>
  );
}
