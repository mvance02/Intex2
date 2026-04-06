import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  Icon?: LucideIcon;
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  Icon = Inbox,
  title = 'Nothing here yet',
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="p-4 rounded-full bg-gray-100" aria-hidden="true">
        <Icon size={32} className="text-gray-400" />
      </div>
      <p className="text-base font-semibold text-gray-600">{title}</p>
      {message && <p className="text-sm text-gray-400 max-w-xs">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
