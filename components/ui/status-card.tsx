type StatusCardProps = {
  title: string;
  value: string;
  detail: string;
};

export function StatusCard({ title, value, detail }: StatusCardProps) {
  return (
    <article className="glass-panel p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">{title}</p>
      <p className="mt-4 font-[family-name:var(--font-display)] text-5xl font-semibold text-ink">
        {value}
      </p>
      <p className="mt-4 text-sm leading-6 text-ink/70">{detail}</p>
    </article>
  );
}
