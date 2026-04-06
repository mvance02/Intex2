interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeClass = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
};

export default function LoadingSpinner({ size = 'md', label = 'Loading…' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8" role="status" aria-label={label}>
      <div
        className={`${sizeClass[size]} rounded-full border-teal-600 border-t-transparent animate-spin`}
      />
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  );
}
