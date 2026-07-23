import { useState } from 'react';
import { requestCancelOtp, verifyCancelOtp } from '../../lib/api';

// Gates any "Cancel" action behind an OTP for a whitelisted number:
// 1. Enter a phone number -> "Send OTP" (rejected with a warning if the
//    number isn't on the whitelist — see the Admin page). There's no
//    SMS/email provider — the code is delivered purely in-app, so the
//    whitelisted person has to open their own "My OTP" inbox to read it.
// 2. Enter the OTP -> "Verify & Cancel", which calls onVerified() to
//    actually perform the cancel (parent owns that mutation; this dialog
//    only owns the phone/OTP step).
const CancelOtpDialog = ({ title, description, onVerified, onClose }) => {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await requestCancelOtp(phone);
      setOtp('');
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await requestCancelOtp(phone);
      setOtp('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await verifyCancelOtp(phone, otp);
      await onVerified();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Your mobile number</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="e.g. 9876543210"
                autoFocus
                required
                disabled={submitting}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:bg-slate-50"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting || !phone.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Send OTP'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="mt-4 space-y-3">
            <p className="text-xs text-slate-500">
              An OTP was generated for{' '}
              <span className="font-medium text-slate-700">{phone}</span>.
            </p>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              Ask an admin to check the OTP Console for this number&rsquo;s code, then enter it
              below.
            </p>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">OTP</span>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="6-digit code"
                autoFocus
                required
                disabled={submitting}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tracking-widest text-slate-800 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:bg-slate-50"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  disabled={submitting}
                  className="font-medium text-slate-500 hover:underline disabled:opacity-50"
                >
                  Change number
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={submitting}
                  className="font-medium text-indigo-600 hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting || otp.trim().length !== 6}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Verifying…' : 'Verify & Cancel'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CancelOtpDialog;
