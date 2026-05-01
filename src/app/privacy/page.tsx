import Link from "next/link";

const updatedAt = "April 30, 2026";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This starter privacy notice documents the core data practices needed before a production
            beta. It should be reviewed before a full commercial or school-wide launch.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950">1. Data We Collect</h2>
          <p>
            GameEdu may collect account information, teacher profile information, classroom names,
            student names or nicknames, login codes, scores, attendance records, activity history,
            game participation, rewards, classroom economy transactions, and billing metadata.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950">2. How We Use Data</h2>
          <p>
            Data is used to provide classroom management, student access, assignments, live games,
            Negamon progression, economy features, analytics, billing, security, and support.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950">3. Student Information</h2>
          <p>
            Student information should be entered by authorized teachers or schools. Student records
            should be limited to what is necessary for classroom learning and progress tracking.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950">4. Service Providers</h2>
          <p>
            GameEdu may rely on infrastructure, database, payment, email, monitoring, analytics, and AI
            providers. Production configuration should keep secrets server-side and avoid sending
            unnecessary student data to third-party tools.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950">5. Security and Audit Logs</h2>
          <p>
            The service uses authentication, role checks, rate limiting, audit logs, health checks, and
            database controls to protect accounts and classroom data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950">6. Data Requests</h2>
          <p>
            Teachers, schools, or account owners may request access, correction, export, or deletion of
            relevant data through the support channel published in the production app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950">7. Retention</h2>
          <p>
            Data is kept while needed to provide the service, satisfy operational requirements, resolve
            billing or support issues, or comply with applicable obligations. Production deployments
            should define a retention schedule before school-wide rollout.
          </p>
        </section>

        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          Launch note: replace this starter notice with reviewed privacy language and a real support
          contact before collecting payment or signing school contracts.
        </p>
      </div>
    </main>
  );
}
