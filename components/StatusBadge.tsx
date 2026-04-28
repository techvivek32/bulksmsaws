type Status = 'pending' | 'sent' | 'failed';

const styles: Record<Status, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}
