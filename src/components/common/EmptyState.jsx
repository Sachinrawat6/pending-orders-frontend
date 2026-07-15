const EmptyState = ({ title, description, icon: Icon }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center">
    {Icon && (
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </span>
    )}
    <p className="font-display mt-3 text-sm font-semibold text-slate-700">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
  </div>
);

export default EmptyState;
