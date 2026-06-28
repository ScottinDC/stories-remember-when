type AppHeaderProps = {
  title: string;
  answeredCount: number;
  pendingCount: number;
  processingCount: number;
};

export function AppHeader({ title, answeredCount, pendingCount, processingCount }: AppHeaderProps) {
  return (
    <header className="panel p-6 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="label">Family oral history</p>
          <h1 className="font-serif text-4xl leading-tight text-ink md:text-5xl">{title}</h1>
          <p className="text-lg leading-relaxed text-ink-muted">
            Record one memory at a time. Each answer is saved, transcribed, and followed by a thoughtful next question.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Saved" value={answeredCount} />
          <StatCard label="Ready" value={pendingCount} />
          <StatCard label="Working" value={processingCount} />
        </div>
      </div>
    </header>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-linen-200 bg-white px-4 py-3 text-center">
      <p className="font-serif text-3xl text-ink">{value}</p>
      <p className="text-sm font-medium text-ink-muted">{label}</p>
    </div>
  );
}
