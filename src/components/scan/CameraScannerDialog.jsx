import { useEffect, useRef, useState } from 'react';
import { FiX, FiCamera } from 'react-icons/fi';
import Banner from '../common/Banner';

const READER_ID = 'camera-scanner-reader';

const CameraScannerDialog = ({ onDetected, onClose }) => {
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(true);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  useEffect(() => {
    let stopped = false;
    let scanner = null;
    const stopScanner = () =>
      scanner
        ? scanner
            .stop()
            .then(() => scanner.clear())
            .catch(() => {})
        : Promise.resolve();

    // Loaded lazily since html5-qrcode (and its zxing dependency) is a large
    // library only needed once someone actually opens the camera scanner.
    import('html5-qrcode').then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      if (stopped) return;

      scanner = new Html5Qrcode(READER_ID, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      });

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (decodedText) => {
            if (stopped) return;
            stopped = true;
            stopScanner().finally(() => onDetectedRef.current(decodedText.trim()));
          },
          () => {
            // per-frame "nothing decoded yet" callback — expected, ignore.
          }
        )
        .then(() => {
          if (!stopped) setStarting(false);
        })
        .catch((err) => {
          if (stopped) return;
          setStarting(false);
          setError(err?.message || 'Could not access the camera. Check permissions and try again.');
        });
    });

    return () => {
      stopped = true;
      stopScanner();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
            <FiCamera className="h-4 w-4" />
            Scan Order Barcode
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        {error && <Banner variant="error">{error}</Banner>}
        {starting && !error && <p className="mb-2 text-center text-sm text-slate-500">Starting camera…</p>}

        <div id={READER_ID} className="overflow-hidden rounded-lg bg-slate-900" />

        <p className="mt-3 text-center text-xs text-slate-400">Point the camera at the order barcode or QR code.</p>
      </div>
    </div>
  );
};

export default CameraScannerDialog;
