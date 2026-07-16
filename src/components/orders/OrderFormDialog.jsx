import { useState } from 'react';
import Banner from '../common/Banner';

const EMPTY_FORM = {
  employee_id: '',
  employee_name: '',
  isProcessed: false,
  isCancelApproval: false,
};

const OrderFormDialog = ({ order, onSubmit, onClose }) => {
  const isEditing = Boolean(order);
  const [form, setForm] = useState(() =>
    order
      ? {
          employee_id: order.employee_id ?? '',
          employee_name: order.employee_name ?? '',
          isProcessed: Boolean(order.isProcessed),
          isCancelApproval: Boolean(order.isCancelApproval),
        }
      : EMPTY_FORM
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        employee_id: Number(form.employee_id),
        employee_name: form.employee_name.trim(),
        isProcessed: form.isProcessed,
        isCancelApproval: form.isCancelApproval,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl"
      >
        <h3 className="font-display text-base font-semibold text-slate-900">
          {isEditing ? 'Edit Pending Order' : 'Add Pending Order'}
        </h3>

        {error && (
          <Banner variant="error" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        {isEditing && (
          <div className="flex flex-wrap gap-5 border-t border-slate-100 pt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.isCancelApproval}
                onChange={(event) => updateField('isCancelApproval', event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Cancel Approval Requested
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderFormDialog;
