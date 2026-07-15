import { FiX } from 'react-icons/fi';

const VARIANTS = {
  error: 'bg-red-50 text-red-700 ring-red-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
};

const Banner = ({ variant = 'info', children, onDismiss }) => (
  <div className={`flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-sm ring-1 ring-inset ${VARIANTS[variant]}`}>
    <div>{children}</div>
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-md p-0.5 leading-none opacity-60 transition hover:opacity-100"
        aria-label="Dismiss"
      >
        <FiX className="h-4 w-4" />
      </button>
    )}
  </div>
);

export default Banner;
