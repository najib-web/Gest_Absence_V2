// Quick test: run the three parsers against the generated template files
import { readFileSync } from "fs";
import { parseStudentExcel, parseTeachersExcel, parseServiceFile } from "../src/lib/excel";

const dir = "/home/z/my-project/public/templates";

const st = parseStudentExcel(readFileSync(`${dir}/ListEleve_20260905.xlsx`).buffer as ArrayBuffer);
console.log("=== ÉLÈVES ===", st.totalRows, "lignes | en-têtes:", st.detectedHeaders.join(" | "));
console.log("1ère ligne:", JSON.stringify(st.rows[0]));
console.log("dernière:", JSON.stringify(st.rows[st.rows.length - 1]));

const tc = parseTeachersExcel(readFileSync(`${dir}/Liste enseignants.xlsx`).buffer as ArrayBuffer);
console.log("\n=== ENSEIGNANTS ===", tc.totalRows, "lignes | en-têtes:", tc.detectedHeaders.join(" | "));
console.log("1ère ligne:", JSON.stringify(tc.rows[0]));
console.log("ligne sans email:", JSON.stringify(tc.rows[1]));

const sv = parseServiceFile(readFileSync(`${dir}/tableaux de services.csv`).buffer as ArrayBuffer);
console.log("\n=== TABLEAUX DE SERVICES ===", sv.totalRows, "lignes | en-têtes:", sv.detectedHeaders.join(" | "));
console.log("1ère ligne:", JSON.stringify(sv.rows[0]));
console.log("ligne 1h:", JSON.stringify(sv.rows.find((r) => r.endMin! - r.startMin! === 60)));

// Edge cases
const bad = parseServiceFile(new TextEncoder().encode(
  "Jour;Heure debut;Heure fin;Classe;Groupe;Enseignant;Matière\n" +
  "Lundi;08:00;10:00;TCSF-1;;Bennani Ahmed;Maths\n" +
  "Dimanche;08:00;10:00;TCSF-1;;Bennani Ahmed;Maths\n" +
  "Mardi;08:00;12:00;TCSF-1;;Bennani Ahmed;Maths\n"
).buffer as ArrayBuffer);
console.log("\n=== CSV point-virgule ===", bad.totalRows, "lignes");
bad.rows.forEach((r, i) => console.log(`  ligne ${i}: day=${r.day} ${r.startMin}-${r.endMin}`));
