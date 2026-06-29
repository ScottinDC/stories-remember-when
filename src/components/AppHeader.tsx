type AppHeaderProps = {
  title: string;
  answeredCount: number;
  pendingCount: number;
  processingCount: number;
};

function StatCell({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="text-right">
      <div className={`stat-value ${accent ? "text-navy-light" : ""}`}>{String(value).padStart(2, "0")}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function AppHeader({ title, answeredCount, pendingCount, processingCount }: AppHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-b border-line-hair pb-5">
      <div className="max-w-xl">
        <p className="mono-eyebrow mb-2">Family Oral History / Archive</p>
        <h1 className="font-serif text-[clamp(1.875rem,4vw,2.75rem)] font-medium leading-[1.05] tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
          One memory at a time — saved, transcribed, and followed by the next question.
        </p>
      </div>

      <div className="flex items-end gap-5 font-mono">
        <StatCell label="Saved" value={answeredCount} />
        <div className="mb-1 h-9 w-px bg-line-hair" />
        <StatCell accent label="Ready" value={pendingCount} />
        <div className="mb-1 h-9 w-px bg-line-hair" />
        <StatCell label="Working" value={processingCount} />
      </div>
    </header>
  );
}
