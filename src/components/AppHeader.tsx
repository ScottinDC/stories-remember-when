type AppHeaderProps = {
  title: string;
  answeredCount: number;
  pendingCount: number;
  processingCount: number;
};

function StatCell({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div className={`stat-value ${accent ? "text-navy-light" : ""}`}>{String(value).padStart(2, "0")}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function AppHeader({ title, answeredCount, pendingCount, processingCount }: AppHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6 border-b-[1.5px] border-ink-body pb-[26px]">
      <div className="max-w-[620px]">
        <p className="mono-eyebrow mb-5">
          Family Oral History &nbsp;/&nbsp; Archive
        </p>
        <h1 className="font-serif text-[clamp(2.5rem,5vw,3.75rem)] font-medium leading-none tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-4 max-w-[500px] text-[15.5px] leading-relaxed text-ink-muted">
          Record one memory at a time. Each response is saved, transcribed, and followed by a thoughtful next question.
        </p>
      </div>

      <div className="flex items-end gap-7 font-mono">
        <StatCell label="Saved" value={answeredCount} />
        <div className="h-12 w-px bg-line-hair" />
        <StatCell accent label="Ready" value={pendingCount} />
        <div className="h-12 w-px bg-line-hair" />
        <StatCell label="Working" value={processingCount} />
      </div>
    </header>
  );
}
