import Image from "next/image";
import Link from "next/link";

type AuthShellProps = {
  badge: string;
  title: string;
  description: string;
  alternateHref: string;
  alternateLabel: string;
  children: React.ReactNode;
};

export function AuthShell({
  badge,
  title,
  description,
  alternateHref,
  alternateLabel,
  children
}: AuthShellProps) {
  return (
    <main className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-6 sm:px-6 sm:py-10 md:px-10">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <section className="hidden h-full rounded-[2rem] border border-ink/10 bg-ink px-8 py-8 text-white shadow-panel lg:flex lg:flex-col">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/65">{badge}</p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight md:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/75">{description}</p>

          <div className="mt-6 flex-1 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 p-3">
            <Image
              src="/auth-compliance-illustration.svg"
              alt="Healthcare compliance workspace overview"
              width={880}
              height={640}
              priority
              className="h-full min-h-[180px] w-full rounded-[1.25rem] object-cover"
            />
          </div>
          </section>

          <section className="glass-panel h-full p-6 sm:p-8 md:p-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ocean">
                  Access Control
                </p>
                <p className="mt-2 text-sm text-ink/70">Email/password and passwordless magic link.</p>
              </div>
              <Link
                href={alternateHref}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-ocean/15 bg-ocean/5 px-4 py-2 text-center text-sm font-semibold text-ocean transition hover:bg-ocean/10 sm:w-auto"
              >
                {alternateLabel}
              </Link>
            </div>

            <div className="mt-8">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
