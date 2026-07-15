import { useState } from 'react';
import FileDropzone from '../common/FileDropzone';
import Banner from '../common/Banner';
import { parseImportFile } from '../../lib/parseImportFile';
import { formatDate, formatValue } from '../../lib/formatters';

const REQUIRED_FIELDS = ['style_number', 'order_id', 'size', 'channel', 'order_date', 'employee_id', 'employee_name'];

const BulkImportDialog = ({ onImport, onClose }) => {
  const [fileName, setFileName] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  const handleFile = async (file) => {
    setFileName(file.name);
    setParsed(null);
    setParseError(null);
    setImportError(null);

    try {
      const result = await parseImportFile(file);
      if (result.records.length === 0) {
        setParseError('The file has no data rows.');
        return;
      }
      const missingFields = REQUIRED_FIELDS.filter((field) => !Object.keys(result.records[0]).includes(field));
      setParsed({ ...result, missingFields });
    } catch (err) {
      setParseError(err.message);
    }
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setImportError(null);
    try {
      await onImport(parsed.records);
      onClose();
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
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
      <div className="relative w-full max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <h3 className="font-display text-base font-semibold text-slate-900">Bulk Import Pending Orders</h3>
        <p className="text-sm text-slate-500">
          Upload a CSV/Excel file with columns for style number, order ID, size, channel, order date, employee ID, and
          employee name. New rows are added — existing orders are not affected.
        </p>

        {parseError && (
          <Banner variant="error" onDismiss={() => setParseError(null)}>
            {parseError}
          </Banner>
        )}
        {importError && (
          <Banner variant="error" onDismiss={() => setImportError(null)}>
            {importError}
          </Banner>
        )}

        <FileDropzone onFile={handleFile} fileName={fileName} />

        {parsed && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              <strong>{parsed.records.length}</strong> row{parsed.records.length > 1 ? 's' : ''} ready to import
              {parsed.unrecognizedColumns.length > 0 && (
                <>
                  {' '}
                  · ignoring column{parsed.unrecognizedColumns.length > 1 ? 's' : ''}:{' '}
                  {parsed.unrecognizedColumns.join(', ')}
                </>
              )}
            </p>

            {parsed.missingFields.length > 0 && (
              <Banner variant="warning">
                Missing column{parsed.missingFields.length > 1 ? 's' : ''} for:{' '}
                {parsed.missingFields.join(', ')}. Those fields will be blank and may be rejected by the server.
              </Banner>
            )}

            <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    {REQUIRED_FIELDS.map((field) => (
                      <th key={field} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-500">
                        {field}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsed.records.slice(0, 8).map((record, index) => (
                    <tr key={index}>
                      {REQUIRED_FIELDS.map((field) => (
                        <td key={field} className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {field === 'order_date' ? formatDate(record[field]) : formatValue(record[field])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsed.records.length > 8 && (
              <p className="text-xs text-slate-400">+{parsed.records.length - 8} more rows</p>
            )}
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
            type="button"
            onClick={handleImport}
            disabled={!parsed || importing}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? 'Importing…' : `Import ${parsed?.records.length || ''} order${parsed?.records.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkImportDialog;
