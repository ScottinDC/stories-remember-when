import { countByStatus } from "../lib/interview";

type AppHeaderProps = {
  title: string;
  answeredCount: number;
  pendingCount: number;
  processingCount: number;
};

export function AppHeader({ title, answeredCount, pendingCount, processingCount }: AppHeaderProps) {
  return (
    <header className="form-card p-6 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm text-ink-faint">Family Oral History</p>
          <h1 className="text-2xl font-normal text-ink">{title}</h1>
          <p className="text-base leading-relaxed text-ink-muted">
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
    <div className="rounded-lg border border-linen-200 bg-linen-50 px-4 py-3 text-center">
      <p className="text-2xl text-ink">{value}</p>
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}
