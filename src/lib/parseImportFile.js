const normalizeHeader = (header) => String(header ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const FIELD_ALIASES = {
  style_number: ['style number', 'styleno', 'style'],
  order_id: ['orderid', 'order no', 'order number'],
  size: ['size'],
  channel: ['channel', 'sales channel'],
  order_date: ['order date', 'orderdate'],
  employee_id: ['employee id', 'emp id', 'employeeid'],
  employee_name: ['employee name', 'emp name', 'employeename'],
};

const HEADER_TO_FIELD = new Map();
Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
  HEADER_TO_FIELD.set(normalizeHeader(field), field);
  aliases.forEach((alias) => HEADER_TO_FIELD.set(normalizeHeader(alias), field));
});

const NUMBER_FIELDS = new Set(['style_number', 'order_id', 'employee_id']);

// Excel's day-zero, adjusted for the well-known 1900 leap-year bug.
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const excelSerialToDate = (serial) => new Date(EXCEL_EPOCH_MS + serial * 86400000);

const parseFlexibleDate = (value) => {
  if (value instanceof Date) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return excelSerialToDate(value);

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (dmy) {
      const [, day, month, year, hour = '0', minute = '0'] = dmy;
      const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const native = new Date(trimmed);
    if (!Number.isNaN(native.getTime())) return native;
  }

  return null;
};

const coerceValue = (field, rawValue) => {
  if (rawValue === undefined || rawValue === null) return '';

  if (field === 'order_date') {
    const parsed = parseFlexibleDate(rawValue);
    return parsed ? parsed.toISOString() : '';
  }

  if (NUMBER_FIELDS.has(field)) {
    if (typeof rawValue === 'number') return rawValue;
    const cleaned = String(rawValue).trim().replace(/,/g, '');
    if (cleaned === '') return '';
    const num = Number(cleaned);
    return Number.isNaN(num) ? '' : num;
  }

  return typeof rawValue === 'string' ? rawValue.trim() : String(rawValue).trim();
};

export async function parseImportFile(file) {
  // Loaded lazily since xlsx is a large dependency only needed on the import flow.
  const XLSX = await import('xlsx');

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });

  if (rows.length === 0) {
    return { records: [], recognizedColumns: [], unrecognizedColumns: [] };
  }

  const headers = Object.keys(rows[0]);
  const fieldByHeader = new Map();
  const recognizedColumns = [];
  const unrecognizedColumns = [];

  headers.forEach((header) => {
    const field = HEADER_TO_FIELD.get(normalizeHeader(header));
    if (field) {
      fieldByHeader.set(header, field);
      recognizedColumns.push(header);
    } else {
      unrecognizedColumns.push(header);
    }
  });

  const records = rows.map((row) => {
    const record = {};
    fieldByHeader.forEach((field, header) => {
      record[field] = coerceValue(field, row[header]);
    });
    return record;
  });

  return { records, recognizedColumns, unrecognizedColumns };
}
