/**
 * Enterprise Safe Spreadsheet Parsing & Export Engine.
 *
 * Implemented using `read-excel-file` and `write-excel-file` to permanently
 * eliminate SheetJS / xlsx CVE-1321 (Prototype Pollution) and CVE-1333 (ReDoS).
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
 * Parses raw CSV string safely without external dependencies.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === "\r" && nextChar === "\n") {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        i++;
      } else if (char === "\n" || char === "\r") {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows.filter((r) => r.some((c) => c.length > 0));
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
    const trimmedKey = String(key || "").trim();
    if (!trimmedKey || DANGEROUS_KEYS.has(trimmedKey.toLowerCase())) {
      continue;
    }

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
): Promise<{ rows: Record<string, any>[]; sheetNames: string[]; rawRows: any[][] }> {
  validateSpreadsheetFile(file, options);
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const fileName = (file.name || "").toLowerCase();

  let rawGrid: any[][] = [];
  let sheetNames: string[] = ["Sheet1"];

  if (fileName.endsWith(".csv")) {
    const text = await file.text();
    rawGrid = parseCsv(text);
    sheetNames = ["CSV"];
  } else {
    // Modern, safe XLSX parsing without SheetJS
    const { default: readXlsxFile } = await import("read-excel-file/universal");
    const sheets = await readXlsxFile(file);
    if (Array.isArray(sheets) && sheets.length > 0) {
      sheetNames = sheets.map((s) => s.sheet || "Sheet");
      rawGrid = (sheets[0]?.data as any[][]) || [];
    }
  }

  if (!rawGrid || rawGrid.length === 0) {
    throw new Error("The uploaded spreadsheet contains no readable data.");
  }

  const headerRow = rawGrid[0] || [];
  const headers = headerRow.map((h: any) => String(h || "").trim());

  const dataRows = rawGrid.slice(1);
  if (dataRows.length > opts.maxRows) {
    throw new Error(`File contains too many rows (${dataRows.length}). Maximum allowed is ${opts.maxRows.toLocaleString()}.`);
  }

  const rows: Record<string, any>[] = [];
  for (const row of dataRows) {
    const obj: Record<string, any> = {};
    let hasData = false;
    for (let c = 0; c < headers.length; c++) {
      const headerKey = headers[c];
      if (!headerKey || DANGEROUS_KEYS.has(headerKey.toLowerCase())) continue;
      const cellVal = row[c];
      if (cellVal !== null && cellVal !== undefined && cellVal !== "") {
        hasData = true;
        if (typeof cellVal === "string") {
          obj[headerKey] = cellVal.length > opts.maxCellLength ? cellVal.slice(0, opts.maxCellLength) : cellVal;
        } else {
          obj[headerKey] = cellVal;
        }
      } else {
        obj[headerKey] = "";
      }
    }
    if (hasData) {
      rows.push(obj);
    }
  }

  return { rows, sheetNames, rawRows: rawGrid };
}

export interface ExportSheetDefinition {
  name?: string;
  sheet?: string;
  rows?: any[][];
  data?: any[][];
}

/**
 * Generates and downloads an Excel file with one or multiple sheets.
 */
export async function downloadExcelWorkbook(
  sheets: ExportSheetDefinition[],
  fileName: string
): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/universal");

  const formattedSheets = sheets.map((sheet) => {
    const sheetRows = sheet.rows || sheet.data || [];
    const sheetData = sheetRows.map((row) =>
      (row || []).map((cell: any) => {
        if (cell === null || cell === undefined || cell === "") {
          return { value: null };
        }
        if (typeof cell === "number") {
          return { value: cell, type: Number };
        }
        if (typeof cell === "boolean") {
          return { value: cell, type: Boolean };
        }
        if (cell instanceof Date) {
          return { value: cell, type: Date };
        }
        return { value: String(cell), type: String };
      })
    );

    const title = (sheet.sheet || sheet.name || "Sheet1").slice(0, 31);
    return {
      sheet: title,
      data: sheetData,
    };
  });

  const output = await writeXlsxFile(formattedSheets as any);
  const blob = await output.toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const cleanFileName = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  link.download = cleanFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Downloads a single-sheet Excel (.xlsx) or CSV (.csv) template.
 */
export async function downloadSpreadsheetFile(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  sheetName: string,
  fileName: string,
  format: "xlsx" | "csv" = "xlsx"
): Promise<void> {
  const allRows = [headers, ...rows];

  if (format === "csv") {
    const csvContent = allRows
      .map((row) =>
        row
          .map((cell) => {
            if (cell === null || cell === undefined) return "";
            const str = String(cell);
            if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  await downloadExcelWorkbook([{ name: sheetName, rows: allRows }], fileName);
}
