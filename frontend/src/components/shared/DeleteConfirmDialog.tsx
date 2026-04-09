interface DeleteConfirmDialogProps {
  isOpen: boolean;
  itemLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function DeleteConfirmDialog({
  isOpen,
  itemLabel,
  onConfirm,
  onCancel,
  loading = false,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-desc"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative bg-white shadow-xl border border-gray-200 w-full max-w-sm p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">🗑️</span>
          <h2 id="delete-dialog-title" className="text-base font-semibold text-gray-800">
            Confirm Delete
          </h2>
        </div>

        <p id="delete-dialog-desc" className="text-sm text-gray-600">
          Are you sure you want to delete <span className="font-medium">{itemLabel}</span>? This action
          cannot be undone.
        </p>

        <div className="flex gap-3 justify-end mt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-2"
          >
            {loading && (
              <span className="h-4 w-4 border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
