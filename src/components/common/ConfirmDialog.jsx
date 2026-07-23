const TONE_CLASSES = {
  danger: 'bg-red-600 hover:bg-red-700',
  violet: 'bg-violet-600 hover:bg-violet-700',
  sky: 'bg-sky-600 hover:bg-sky-700',
  indigo: 'bg-indigo-600 hover:bg-indigo-700',
  emerald: 'bg-emerald-600 hover:bg-emerald-700',
  slate: 'bg-slate-600 hover:bg-slate-700',
};

const ConfirmDialog = ({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
  tone = 'danger',
}) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
    <button
      type="button"
      aria-label="Cancel"
      onClick={onCancel}
      className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
    />
    <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
            TONE_CLASSES[tone] || TONE_CLASSES.indigo
          }`}
        >
          {loading ? 'Working…' : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmDialog;
