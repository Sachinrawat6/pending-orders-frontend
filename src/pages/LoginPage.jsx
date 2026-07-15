import { useState } from 'react';
import { FiPackage, FiLogIn } from 'react-icons/fi';
import { fetchUserByEmployeeId } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Banner from '../components/common/Banner';

const LoginPage = () => {
  const { login } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!employeeId) return;

    setSubmitting(true);
    setError(null);

    try {
      const user = await fetchUserByEmployeeId(employeeId);
      if (!user) {
        setError(`No employee found for ID "${employeeId}".`);
        return;
      }
      login({ id: user.id, name: user.user_name, locations: user.locations || [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-200/50">
            <FiPackage className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-lg font-semibold tracking-tight text-slate-900">Pending Orders</h1>
            <p className="text-sm text-slate-500">Sign in with your Employee ID to continue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && (
            <Banner variant="error" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-600">Employee ID</span>
            <input
              type="number"
              autoFocus
              required
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              placeholder="e.g. 101"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !employeeId}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiLogIn className="h-4 w-4" />
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
