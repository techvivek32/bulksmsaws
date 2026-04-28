interface ProgressBarProps {
  sent: number;
  failed: number;
  total: number;
}

export default function ProgressBar({ sent, failed, total }: ProgressBarProps) {
  if (!total) return null;
  const sentPct = Math.round((sent / total) * 100);
  const failedPct = Math.round((failed / total) * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{sent + failed} / {total} processed</span>
        <span>{sentPct}% sent</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden flex">
        <div
          className="bg-green-500 h-3 transition-all duration-300"
          style={{ width: `${sentPct}%` }}
        />
        <div
          className="bg-red-400 h-3 transition-all duration-300"
          style={{ width: `${failedPct}%` }}
        />
      </div>
      <div className="flex gap-4 mt-1 text-xs">
        <span className="text-green-600">✓ {sent} sent</span>
        <span className="text-red-500">✗ {failed} failed</span>
        <span className="text-gray-400">{total - sent - failed} pending</span>
      </div>
    </div>
  );
}
