import * as XLSX from "xlsx";

export interface ParsedStudentRow {
  codeMassar: string;
  firstName: string;
  lastName: string;
  classeCode: string;
  niveauCode?: string;
}

/**
 * Parse an Excel/CSV file containing the Massar student list.
 * Expected columns (any order, headers can be in FR or AR):
 *  - Code Massar / الرمز المساري
 *  - Nom / النسب
 *  - Prénom / الاسم
 *  - Classe / القسم
 *  - Niveau / المستوى (optional)
 *
 * Returns the rows found and the detected headers.
 */
export function parseStudentExcel(buffer: ArrayBuffer): {
  rows: ParsedStudentRow[];
  detectedHeaders: string[];
  totalRows: number;
} {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { rows: [], detectedHeaders: [], totalRows: 0 };
  const sheet = wb.Sheets[sheetName];

  // Get the data as array of arrays (so we can scan for the header row)
  const raw: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: false,
  });

  if (raw.length === 0) return { rows: [], detectedHeaders: [], totalRows: 0 };

  // Header detection — find the row that contains a Massar-like column
  const headerKeywords = {
    codeMassar: ["code massar", "codemassar", "massar", "الرمز المساري", "الرمز", "massar"],
    firstName: ["prénom", "prenom", "nom de famille", "الاسم", "prenom"],
    lastName: ["nom", "نسب", "النسب", "nom "],
    classe: ["classe", "القسم", "section"],
    niveau: ["niveau", "المستوى", "level"],
  };

  function normalizeHeader(h: string): string {
    return String(h || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function matchHeader(h: string, keys: string[]): boolean {
    const n = normalizeHeader(h);
    return keys.some((k) => n === normalizeHeader(k) || n.includes(normalizeHeader(k)));
  }

  let headerRowIdx = -1;
  let colMap: Record<string, number> = {};
  for (let i = 0; i < Math.min(raw.length, 20); i++) {
    const row = raw[i];
    const map: Record<string, number> = {};
    for (let c = 0; c < row.length; c++) {
      const h = String(row[c] || "");
      if (!h) continue;
      for (const key of Object.keys(headerKeywords)) {
        if (matchHeader(h, headerKeywords[key as keyof typeof headerKeywords])) {
          if (!(key in map)) map[key] = c;
        }
      }
    }
    // We need at least codeMassar + name + classe
    if ("codeMassar" in map && "classe" in map && ("firstName" in map || "lastName" in map)) {
      headerRowIdx = i;
      colMap = map;
      break;
    }
  }

  if (headerRowIdx === -1) {
    // Fallback: assume no header. Use fixed columns:
    // A=Massar, B=Nom, C=Prénom, D=Classe, E=Niveau
    colMap = { codeMassar: 0, lastName: 1, firstName: 2, classe: 3, niveau: 4 };
    headerRowIdx = -1;
  }

  const detectedHeaders = headerRowIdx >= 0
    ? raw[headerRowIdx].map((h) => String(h || ""))
    : ["Code Massar", "Nom", "Prénom", "Classe", "Niveau"];

  const dataRows = headerRowIdx >= 0 ? raw.slice(headerRowIdx + 1) : raw;
  const rows: ParsedStudentRow[] = [];

  for (const r of dataRows) {
    const codeMassar = String(r[colMap.codeMassar] ?? "").trim();
    if (!codeMassar) continue;
    // Skip if it doesn't look like a Massar code (typically contains letters+digits, length>=8)
    if (codeMassar.length < 4) continue;

    let firstName = colMap.firstName !== undefined ? String(r[colMap.firstName] ?? "").trim() : "";
    let lastName = colMap.lastName !== undefined ? String(r[colMap.lastName] ?? "").trim() : "";

    // Handle case where only one combined "Nom Prénom" column exists
    if (!firstName && !lastName) continue;
    if (!lastName && firstName.includes(" ")) {
      const parts = firstName.split(" ");
      lastName = parts[0];
      firstName = parts.slice(1).join(" ");
    }

    const classeCode = String(r[colMap.classe] ?? "").trim();
    const niveauCode = colMap.niveau !== undefined ? String(r[colMap.niveau] ?? "").trim() || undefined : undefined;

    rows.push({
      codeMassar,
      firstName: firstName || "",
      lastName: lastName || "",
      classeCode,
      niveauCode,
    });
  }

  return {
    rows,
    detectedHeaders,
    totalRows: rows.length,
  };
}
