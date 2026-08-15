import * as XLSX from "xlsx";
import * as fs from "fs";

// Generate a sample Massar-format Excel file matching the expected schema
const data = [
  ["Code Massar", "Nom", "Prénom", "Classe", "Niveau"],
  ["R15000001", "El Amrani", "Sara", "TCSF-2", "Tronc Commun"],
  ["R15000002", "Bennani", "Adam", "TCSF-2", "Tronc Commun"],
  ["R15000003", "Tazi", "Lina", "TCSF-2", "Tronc Commun"],
  ["R15000004", "El Fassi", "Hamza", "TCSF-2", "Tronc Commun"],
  ["R15000005", "Berrada", "Nada", "TCSF-2", "Tronc Commun"],
  ["R15000006", "Cherkaoui", "Ayoub", "1BAC-PC-1", "1ère Année Bac"],
  ["R15000007", "El Ghazali", "Imane", "1BAC-PC-1", "1ère Année Bac"],
  ["R15000008", "Kabbaj", "Reda", "1BAC-PC-1", "1ère Année Bac"],
];

const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Élèves");
XLSX.writeFile(wb, "/tmp/test_students.xlsx");
console.log("Created test_students.xlsx with", data.length - 1, "students");
