import Link from "next/link";

const updatedAt = "April 30, 2026";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-800">
      <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
        Back to GameEdu
      </Link>
      <div className="mt-6 space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Last updated: {updatedAt}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            These starter terms are provided for production readiness and should be reviewed before a
            full commercial launch, especially before selling to schools or processing payments at scale.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950">1. Service</h2>
          <p>
            GameEdu helps teachers manage classrooms, student activities, gamified learning, live games,
            Negamon progression, classroom economy features, and related reports.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950">2. Accounts and Roles</h2>
          <p>
            Users are responsible for keeping account credentials safe. Teachers are responsible for
            inviting or adding students only when they have the appropriate classroom authority.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950">3. Student Data</h2>
          <p>
            Teachers and schools should only enter student information that is needed for classroom use.
            Do not upload sensitive information that is not required for the learning activity.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950">4. Payments and Plans</h2>
          <p>
            Paid plans, billing cycles, limits, renewals, refunds, and local payment terms must match the
            pricing page and payment provider checkout shown at purchase time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950">5. Acceptable Use</h2>
          <p>
            Users must not misuse the service, bypass access controls, attack the system, upload harmful
            content, or use GameEdu in a way that violates applicable school policy or law.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950">6. Availability</h2>
          <p>
            GameEdu may change, pause, or limit features for maintenance, security, reliability, or
            product improvement. Production deployments should use the published health and readiness
            checks.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950">7. Contact</h2>
          <p>
            For account, billing, or data requests, contact the GameEdu operator using the support
            channel published in the production app.
          </p>
        </section>

        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          Launch note: replace this starter text with reviewed legal terms before opening paid school
          contracts.
        </p>
      </div>
    </main>
  );
}
