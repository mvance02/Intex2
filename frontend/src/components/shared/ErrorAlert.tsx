interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700"
    >
      <span className="text-lg leading-none mt-0.5" aria-hidden="true">⚠️</span>
      <div className="flex-1">
        <p className="font-medium">Something went wrong</p>
        <p className="text-red-600 mt-0.5">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-red-700 underline underline-offset-2 hover:no-underline text-xs font-medium"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
