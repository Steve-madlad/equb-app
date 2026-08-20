"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { HomeNavbar } from "@/components/layout/HomeNavbar";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HomeNavbar />

      <main>
        <section className="mx-auto max-w-7xl px-4 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900">
            Modern Equb for{" "}
            <span className="text-emerald-600">Ethiopia</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Manage your rotating savings group with transparency, fairness, and
            security. Random payout selection, full audit trails, and clear
            financial records - built for real Equb communities.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/register" >
              <Button size="lg" className="bg-emerald-600">Create account</Button>
            </Link>
            <Link href="/how-it-works">
              <Button size="lg" variant="secondary">
                How it works
              </Button>
            </Link>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-3">
            {[
              {
                title: "Fair Random Draws",
                desc: "Payout recipients are selected server-side with cryptographic randomness. Results are permanent and auditable.",
              },
              {
                title: "Full Financial Ledger",
                desc: "Every contribution, penalty, and payout is recorded as an immutable ledger entry. No hidden fees.",
              },
              {
                title: "Transparent Rules",
                desc: "Clear eligibility rules, overdue tracking, and lifecycle management. No administrator commissions.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-gray-500">
        Equb Platform - Built for Ethiopian savings communities
      </footer>
    </div>
  );
}
