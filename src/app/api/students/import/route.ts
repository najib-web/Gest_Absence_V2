import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseStudentExcel } from "@/lib/excel";

// Step 1: upload + parse, returns preview rows (no DB write yet)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== "SURVEILLANT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || "preview";
    const defaultClasseId = formData.get("classeId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const { rows, detectedHeaders, totalRows } = parseStudentExcel(buffer);

    if (totalRows === 0) {
      return NextResponse.json({
        error: "Aucun élève trouvé dans le fichier. Vérifiez le format (colonnes: Code Massar, Nom, Prénom, Classe).",
        detectedHeaders,
      }, { status: 400 });
    }

    // Resolve classes by code (case-insensitive)
    const classes = await db.classe.findMany({ include: { niveau: true, groups: true } });
    const classByCode = new Map<string, typeof classes[number]>();
    for (const c of classes) {
      classByCode.set(c.code.toUpperCase(), c);
      classByCode.set(c.code.toLowerCase(), c);
    }

    // Build enriched rows
    const enriched = rows.map((r) => {
      const classe = classByCode.get((r.classeCode || "").trim()) || null;
      const fallbackClasse = !classe && defaultClasseId
        ? classes.find((c) => c.id === defaultClasseId) || null
        : null;
      const finalClasse = classe || fallbackClasse;
      return {
        ...r,
        classeId: finalClasse?.id || null,
        classeLabel: finalClasse ? `${finalClasse.code}` : r.classeCode || "—",
        niveauLabel: finalClasse?.niveau?.labelFr || r.niveauCode || "—",
        resolvable: !!finalClasse,
      };
    });

    if (mode === "preview") {
      return NextResponse.json({
        rows: enriched,
        detectedHeaders,
        totalRows,
        classesAvailable: classes.map((c) => ({ id: c.id, code: c.code, label: c.labelFr })),
      });
    }

    // mode === "commit": insert into DB
    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const r of enriched) {
      if (!r.classeId) {
        skipped++;
        errors.push(`Classe introuvable pour ${r.firstName} ${r.lastName} (${r.classeCode})`);
        continue;
      }
      try {
        await db.student.upsert({
          where: { codeMassar: r.codeMassar.toUpperCase() },
          update: {
            firstName: r.firstName,
            lastName: r.lastName,
            classeId: r.classeId,
          },
          create: {
            codeMassar: r.codeMassar.toUpperCase(),
            firstName: r.firstName,
            lastName: r.lastName,
            classeId: r.classeId,
          },
        });
        inserted++;
      } catch (e) {
        skipped++;
        errors.push(`Erreur pour ${r.codeMassar}: ${(e as Error).message}`);
      }
    }

    return NextResponse.json({
      inserted,
      skipped,
      errors: errors.slice(0, 20),
      totalRows,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur lors de l'import: " + (e as Error).message }, { status: 500 });
  }
}
