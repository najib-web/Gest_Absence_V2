// End-to-end test of the 3 imports using the generated template files
const BASE = "http://localhost:3000";
const TPL = "/home/z/my-project/public/templates";

let cookie = "";

async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Login failed: " + JSON.stringify(data));
  const setCookie = res.headers.get("set-cookie") || "";
  cookie = setCookie.split(";")[0];
  console.log("✓ Login", email, "role:", data.user?.role);
}

async function importFile(path: string, mode: string) {
  const fs = await import("fs");
  const buf = fs.readFileSync(path);
  const blob = new Blob([buf]);
  const fileName = path.split("/").pop()!;
  const fd = new FormData();
  fd.append("file", blob, fileName);
  fd.append("mode", mode);
  const res = await fetch(`${BASE}/api/${path.includes("ListEleve") ? "students" : path.includes("enseignants") ? "teachers" : "service-slots"}/import`, {
    method: "POST",
    headers: { cookie },
    body: fd,
  });
  return { status: res.status, data: await res.json() };
}

async function main() {
  await login("surveillant@edu.ma", "surveillant123");

  // 1) Students
  let r = await importFile(`${TPL}/ListEleve_20260905.xlsx`, "preview");
  console.log("\n=== ÉLÈVES preview ===", r.status);
  console.log("lignes:", r.data.totalRows, "| classes à créer:", r.data.classesToCreate?.map((c: any) => `${c.code}(${c.niveauCode})`).join(", "));
  console.log("1ère ligne:", JSON.stringify(r.data.rows?.[0]));

  r = await importFile(`${TPL}/ListEleve_20260905.xlsx`, "commit");
  console.log("=== ÉLÈVES commit ===", r.status, JSON.stringify(r.data));

  // 2) Teachers
  r = await importFile(`${TPL}/Liste enseignants.xlsx`, "preview");
  console.log("\n=== ENSEIGNANTS preview ===", r.status);
  console.log("lignes:", r.data.totalRows);
  console.log("1ère:", JSON.stringify(r.data.rows?.[0]));
  console.log("sans email (généré):", JSON.stringify(r.data.rows?.[1]));

  r = await importFile(`${TPL}/Liste enseignants.xlsx`, "commit");
  console.log("=== ENSEIGNANTS commit ===", r.status, JSON.stringify(r.data));

  // 3) Service tables (CSV)
  r = await importFile(`${TPL}/tableaux de services.csv`, "preview");
  console.log("\n=== SERVICES preview ===", r.status);
  console.log("summary:", JSON.stringify(r.data.summary));
  const errs = (r.data.rows || []).filter((x: any) => x.status === "error");
  console.log("erreurs:", errs.length, errs.map((e: any) => `${e.dayLabel} ${e.timeLabel}: ${e.errorCode}`).join(" | "));

  r = await importFile(`${TPL}/tableaux de services.csv`, "commit");
  console.log("=== SERVICES commit ===", r.status, JSON.stringify(r.data));

  // 4) Re-import: everything should be "update" (idempotent), no duplicates
  r = await importFile(`${TPL}/tableaux de services.csv`, "preview");
  console.log("\n=== SERVICES re-preview (idempotence) ===", "summary:", JSON.stringify(r.data.summary));

  // 5) Verify data: teachers list + slots
  const tRes = await fetch(`${BASE}/api/teachers`, { headers: { cookie } });
  const tData = await tRes.json();
  console.log("\nEnseignants en base:", tData.teachers?.length, "->", tData.teachers?.map((x: any) => `${x.lastName} (${x.matiere}, ${x.user.email})`).join(" | "));

  const sRes = await fetch(`${BASE}/api/service-slots`, { headers: { cookie } });
  const sData = await sRes.json();
  console.log("Créneaux en base:", sData.slots?.length);

  const cRes = await fetch(`${BASE}/api/classes`, { headers: { cookie } });
  const cData = await cRes.json();
  console.log("Classes en base:", cData.classes?.length, "->", cData.classes?.map((c: any) => c.code).join(", "));

  const stRes = await fetch(`${BASE}/api/students`, { headers: { cookie } });
  const stData = await stRes.json();
  console.log("Élèves en base:", stData.students?.length);
}

main().catch((e) => {
  console.error("TEST FAILED:", e);
  process.exit(1);
});
