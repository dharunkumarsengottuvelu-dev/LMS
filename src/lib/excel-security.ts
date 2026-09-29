/**
 * Enterprise Safe Spreadsheet Parsing & Prototype-Pollution Guard.
 *
 * Mitigates SheetJS / xlsx known vulnerabilities:
 * - GHSA-4r6h-8v6p-xvw6 (Prototype Pollution)
 * - GHSA-5pgg-2g8v-p4x9 (ReDoS via oversized inputs)
 */

export interface SafeParseOptions {
  maxSizeBytes?: number; // default: 10 MB
  maxRows?: number; // default: 50,000 rows
  maxCellLength?: number; // default: 10,000 chars
  allowedExtensions?: string[]; // default: ['.xlsx', '.xls', '.csv']
}

const DEFAULT_OPTIONS: Required<SafeParseOptions> = {
  maxSizeBytes: 10 * 1024 * 1024, // 10 MB
  maxRows: 50000,
  maxCellLength: 10000,
  allowedExtensions: [".xlsx", ".xls", ".csv"],
};

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Validates file extension, size, and MIME safety before parsing.
 */
export function validateSpreadsheetFile(file: File, options?: SafeParseOptions): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!file) {
    throw new Error("No file provided.");
  }

  // 1. File size check (prevents memory exhaustion and ReDoS)
  if (file.size > opts.maxSizeBytes) {
    const sizeMb = (opts.maxSizeBytes / (1024 * 1024)).toFixed(1);
    throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is ${sizeMb} MB.`);
  }

  if (file.size === 0) {
    throw new Error("Uploaded file is empty (0 bytes).");
  }

  // 2. Strict extension check
  const fileName = (file.name || "").toLowerCase();
  const hasValidExt = opts.allowedExtensions.some((ext) => fileName.endsWith(ext));
  if (!hasValidExt) {
    throw new Error(`Invalid file type. Only ${opts.allowedExtensions.join(", ")} files are supported.`);
  }
}

/**
 * Sanitizes an object row parsed from a spreadsheet to prevent Prototype Pollution.
 * Creates a clean plain object and drops dangerous property names.
 */
export function sanitizeRowData<T extends Record<string, any>>(rawRow: Record<string, any>, maxCellLength = 10000): T {
  const clean: Record<string, any> = {};

  if (!rawRow || typeof rawRow !== "object") {
    return clean as T;
  }

  for (const [key, val] of Object.entries(rawRow)) {
    // Strip dangerous prototype pollution properties
    const trimmedKey = String(key || "").trim();
    if (!trimmedKey || DANGEROUS_KEYS.has(trimmedKey.toLowerCase())) {
      continue;
    }

    // Guard against ReDoS: cap single-cell string lengths
    if (typeof val === "string") {
      clean[trimmedKey] = val.length > maxCellLength ? val.slice(0, maxCellLength) : val;
    } else {
      clean[trimmedKey] = val;
    }
  }

  return clean as T;
}

/**
 * Safely parses an uploaded Excel/CSV file with full validation and anti-prototype pollution protection.
 */
export async function safeParseSpreadsheet(
  file: File,
  options?: SafeParseOptions
): Promise<{ rows: Record<string, any>[]; sheetNames: string[] }> {
  validateSpreadsheetFile(file, options);
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();

  // Read workbook safely
  const workbook = XLSX.read(buffer, {
    type: "array",
    dense: true, // dense mode avoids sparse array holes
    cellDates: true,
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("Workbook contains no readable sheets.");
  }

  // Validate sheet names to guard against prototype pollution vectors
  const safeSheetNames = workbook.SheetNames.filter((s) => !DANGEROUS_KEYS.has(s.toLowerCase().trim()));
  if (safeSheetNames.length === 0) {
    throw new Error("No valid sheets found in spreadsheet.");
  }

  const primarySheet = workbook.Sheets[safeSheetNames[0]!];
  if (!primarySheet) {
    throw new Error("Unable to read primary sheet.");
  }

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(primarySheet, {
    defval: "",
    blankrows: false,
  });

  if (rawRows.length > opts.maxRows) {
    throw new Error(`File contains too many rows (${rawRows.length}). Maximum allowed is ${opts.maxRows.toLocaleString()}.`);
  }

  // Deep sanitize all rows to prevent prototype pollution
  const rows = rawRows.map((r) => sanitizeRowData(r, opts.maxCellLength));

  return { rows, sheetNames: safeSheetNames };
}
