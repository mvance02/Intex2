import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  Icon?: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  colorClass?: string;
}

export default function KpiCard({
  label,
  value,
  Icon,
  iconColor = 'text-teal-600',
  trend,
  trendLabel,
  colorClass = 'bg-white',
}: KpiCardProps) {
  const trendColor =
    trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={`${colorClass} border border-gray-200 p-5 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-[0.08em]">{label}</span>
        {Icon && (
          <div className={`p-2 bg-gray-50 ${iconColor}`}>
            <Icon size={18} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-800 tabular-nums">{value}</div>
      {trendLabel && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
          <TrendIcon size={12} aria-hidden="true" />
          {trendLabel}
        </div>
      )}
    </div>
  );
}
