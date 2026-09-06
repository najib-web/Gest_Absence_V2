// Seed script: creates demo accounts, niveaux, classes, groups, teachers, students
// Run with: bun run scripts/seed.ts

import { db } from "../src/lib/db";

async function main() {
  console.log("Seeding database...");

  // Clean
  await db.absence.deleteMany();
  await db.session.deleteMany();
  await db.serviceSlot.deleteMany();
  await db.serviceTable.deleteMany();
  await db.teacher.deleteMany();
  await db.student.deleteMany();
  await db.groupe.deleteMany();
  await db.classe.deleteMany();
  await db.niveau.deleteMany();
  await db.user.deleteMany();

  // === Users ===
  const surveillantUser = await db.user.create({
    data: {
      email: "surveillant@edu.ma",
      name: "M. Karim Idrissi",
      password: "surveillant123",
      role: "SURVEILLANT",
    },
  });

  const teacherUser = await db.user.create({
    data: {
      email: "enseignant@edu.ma",
      name: "Mme. Fatima Zahra",
      password: "enseignant123",
      role: "ENSEIGNANT",
    },
  });

  const teacher2User = await db.user.create({
    data: {
      email: "prof.saidi@edu.ma",
      name: "M. Rachid Saidi",
      password: "enseignant123",
      role: "ENSEIGNANT",
    },
  });

  // === Niveaux ===
  const tc = await db.niveau.create({
    data: {
      code: "TC",
      labelFr: "Tronc Commun",
      labelAr: "الجذع المشترك",
      order: 1,
    },
  });
  const bac1 = await db.niveau.create({
    data: {
      code: "1BAC",
      labelFr: "1ère Année Bac",
      labelAr: "السنة الأولى باكالوريا",
      order: 2,
    },
  });
  const bac2 = await db.niveau.create({
    data: {
      code: "2BAC",
      labelFr: "2ème Année Bac",
      labelAr: "السنة الثانية باكالوريا",
      order: 3,
    },
  });

  // === Classes ===
  const tcsf1 = await db.classe.create({
    data: {
      code: "TCSF-1",
      labelFr: "Tronc Commun Sciences 1",
      labelAr: "الجذع المشترك علمي 1",
      niveauId: tc.id,
      capacity: 40,
    },
  });
  const tcsf2 = await db.classe.create({
    data: {
      code: "TCSF-2",
      labelFr: "Tronc Commun Sciences 2",
      labelAr: "الجذع المشترك علمي 2",
      niveauId: tc.id,
      capacity: 40,
    },
  });
  const tcsl1 = await db.classe.create({
    data: {
      code: "TCSL-1",
      labelFr: "Tronc Commun Lettres 1",
      labelAr: "الجذع المشترك آداب 1",
      niveauId: tc.id,
      capacity: 40,
    },
  });
  const pcsf1 = await db.classe.create({
    data: {
      code: "1BAC-PC-1",
      labelFr: "1ère Bac Sciences Expérimentales 1",
      labelAr: "الأولى باك علوم تجريبية 1",
      niveauId: bac1.id,
      capacity: 40,
    },
  });

  // === Groups (within TCSF-1) ===
  const g1 = await db.groupe.create({
    data: { code: "G1", labelFr: "Groupe 1", labelAr: "المجموعة 1", classeId: tcsf1.id },
  });
  const g2 = await db.groupe.create({
    data: { code: "G2", labelFr: "Groupe 2", labelAr: "المجموعة 2", classeId: tcsf1.id },
  });
  const g3 = await db.groupe.create({
    data: { code: "G3", labelFr: "Groupe 3", labelAr: "المجموعة 3", classeId: tcsf1.id },
  });

  // === Teachers ===
  const teacher1 = await db.teacher.create({
    data: {
      userId: teacherUser.id,
      firstName: "Fatima Zahra",
      lastName: "Bennani",
      matiere: "Mathématiques",
      matiereAr: "الرياضيات",
    },
  });
  const teacher2 = await db.teacher.create({
    data: {
      userId: teacher2User.id,
      firstName: "Rachid",
      lastName: "Saidi",
      matiere: "Physique",
      matiereAr: "الفيزياء",
    },
  });

  // === Service Tables (tables de service) ===
  await db.serviceTable.create({
    data: {
      teacherId: teacher1.id,
      classeId: tcsf1.id,
      subject: "Mathématiques",
      subjectAr: "الرياضيات",
      hoursPerWeek: 4,
    },
  });
  await db.serviceTable.create({
    data: {
      teacherId: teacher1.id,
      classeId: tcsf1.id,
      groupId: g1.id,
      subject: "Mathématiques (TP)",
      subjectAr: "الرياضيات (أعمال تطبيقية)",
      hoursPerWeek: 1,
    },
  });
  await db.serviceTable.create({
    data: {
      teacherId: teacher1.id,
      classeId: tcsf2.id,
      subject: "Mathématiques",
      subjectAr: "الرياضيات",
      hoursPerWeek: 4,
    },
  });
  await db.serviceTable.create({
    data: {
      teacherId: teacher2.id,
      classeId: tcsf1.id,
      subject: "Physique-Chimie",
      subjectAr: "الفيزياء والكيمياء",
      hoursPerWeek: 3,
    },
  });
  await db.serviceTable.create({
    data: {
      teacherId: teacher2.id,
      classeId: tcsf1.id,
      groupId: g2.id,
      subject: "Physique (TP)",
      subjectAr: "الفيزياء (أعمال تطبيقية)",
      hoursPerWeek: 1,
    },
  });

  // === Grille horaire hebdomadaire (Lundi→Samedi, 8h→18h) ===
  // dayOfWeek: 1=Lundi ... 6=Samedi ; startMin/endMin in minutes since midnight
  const S = (dow: number, h1: number, h2: number) => ({ dayOfWeek: dow, startMin: h1 * 60, endMin: h2 * 60 });
  const slotDefs: {
    teacherId: string; dayOfWeek: number; startMin: number; endMin: number;
    classeId: string; groupId?: string; subject: string; subjectAr: string;
  }[] = [
    // --- Mme Bennani (Mathématiques) ---
    { teacherId: teacher1.id, classeId: tcsf1.id, subject: "Mathématiques", subjectAr: "الرياضيات", ...S(1, 8, 10) },
    { teacherId: teacher1.id, classeId: tcsf2.id, subject: "Mathématiques", subjectAr: "الرياضيات", ...S(1, 10, 12) },
    { teacherId: teacher1.id, classeId: tcsf2.id, subject: "Mathématiques", subjectAr: "الرياضيات", ...S(2, 8, 10) },
    { teacherId: teacher1.id, classeId: tcsf1.id, groupId: g1.id, subject: "Mathématiques (TP)", subjectAr: "الرياضيات (أعمال تطبيقية)", ...S(2, 10, 12) },
    { teacherId: teacher1.id, classeId: tcsf1.id, subject: "Mathématiques", subjectAr: "الرياضيات", ...S(3, 8, 10) },
    { teacherId: teacher1.id, classeId: tcsf2.id, subject: "Mathématiques", subjectAr: "الرياضيات", ...S(3, 14, 16) },
    { teacherId: teacher1.id, classeId: tcsf1.id, subject: "Mathématiques", subjectAr: "الرياضيات", ...S(4, 10, 12) },
    { teacherId: teacher1.id, classeId: tcsf2.id, subject: "Mathématiques", subjectAr: "الرياضيات", ...S(4, 14, 16) },
    { teacherId: teacher1.id, classeId: tcsf1.id, subject: "Mathématiques", subjectAr: "الرياضيات", ...S(5, 8, 10) },
    { teacherId: teacher1.id, classeId: tcsf1.id, groupId: g2.id, subject: "Mathématiques (TP)", subjectAr: "الرياضيات (أعمال تطبيقية)", ...S(5, 10, 12) },
    { teacherId: teacher1.id, classeId: tcsf1.id, subject: "Mathématiques", subjectAr: "الرياضيات", ...S(6, 10, 12) },
    // --- M. Saidi (Physique-Chimie) ---
    { teacherId: teacher2.id, classeId: tcsf1.id, subject: "Physique-Chimie", subjectAr: "الفيزياء والكيمياء", ...S(1, 10, 12) },
    { teacherId: teacher2.id, classeId: tcsf1.id, subject: "Physique-Chimie", subjectAr: "الفيزياء والكيمياء", ...S(2, 14, 16) },
    { teacherId: teacher2.id, classeId: tcsf1.id, groupId: g2.id, subject: "Physique (TP)", subjectAr: "الفيزياء (أعمال تطبيقية)", ...S(3, 10, 12) },
    { teacherId: teacher2.id, classeId: tcsf1.id, subject: "Physique-Chimie", subjectAr: "الفيزياء والكيمياء", ...S(3, 16, 18) },
    { teacherId: teacher2.id, classeId: tcsf1.id, subject: "Physique-Chimie", subjectAr: "الفيزياء والكيمياء", ...S(4, 8, 10) },
    { teacherId: teacher2.id, classeId: tcsf1.id, subject: "Physique-Chimie", subjectAr: "الفيزياء والكيمياء", ...S(5, 14, 16) },
    { teacherId: teacher2.id, classeId: tcsf1.id, groupId: g3.id, subject: "Physique (TP)", subjectAr: "الفيزياء (أعمال تطبيقية)", ...S(6, 8, 10) },
    { teacherId: teacher2.id, classeId: tcsf1.id, subject: "Physique-Chimie", subjectAr: "الفيزياء والكيمياء", ...S(6, 14, 16) },
  ];
  for (const def of slotDefs) {
    await db.serviceSlot.create({ data: def });
  }

  // === Students (sample for TCSF-1) ===
  const sampleFirstNames = [
    "Youssef", "Aya", "Mehdi", "Salma", "Anas", "Lina", "Omar", "Sara",
    "Hamza", "Imane", "Ayoub", "Nada", "Reda", "Malak", "Bilal", "Hiba",
    "Walid", "Rim", "Khalid", "Asmaa", "Ilias", "Ghita", "Soufiane", "Yasmine",
    "Mouad", "Chaimae", "Abdellah", "Oumaima", "Sami", "Loubna",
  ];
  const sampleLastNames = [
    "Alaoui", "Benjelloun", "El Amrani", "Bennani", "Tazi", "El Fassi",
    "Berrada", "Cherkaoui", "El Ghazali", "Kabbaj", "Lahlou", "El Mansouri",
    "Sebti", "Bennis", "El Idrissi", "Bouzidi", "El Khattabi", "Chraibi",
    "El Hassani", "Bouhdid", "El Andaloussi", "Rachidi", "El Mokri", "Bouhdid",
    "Saidi", "El Ouali", "Bouallam", "El Fihri", "Ould Sidi", "Belkadi",
  ];

  const massarPrefix = "R";
  const students: { id: string; groupId: string | null }[] = [];
  for (let i = 0; i < 30; i++) {
    const group = i < 10 ? g1 : i < 20 ? g2 : g3;
    const codeMassar = `${massarPrefix}${13000000 + i + 1}`;
    const firstName = sampleFirstNames[i % sampleFirstNames.length];
    const lastName = sampleLastNames[i % sampleLastNames.length];
    const student = await db.student.create({
      data: {
        codeMassar,
        firstName,
        lastName,
        classeId: tcsf1.id,
        groupId: group.id,
      },
    });
    students.push({ id: student.id, groupId: group.id });
  }

  // Add a few students to TCSF-2
  for (let i = 0; i < 8; i++) {
    await db.student.create({
      data: {
        codeMassar: `R${14000000 + i}`,
        firstName: sampleFirstNames[i + 5],
        lastName: sampleLastNames[i + 8],
        classeId: tcsf2.id,
      },
    });
  }

  // === Create past sessions with absences ===
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);

  const session1 = await db.session.create({
    data: {
      teacherId: teacher1.id,
      classeId: tcsf1.id,
      date: yesterday,
      subject: "Mathématiques",
      subjectAr: "الرياضيات",
    },
  });

  // Mark 5 students absent in that session, 2 of them oriented
  for (let i = 0; i < 5; i++) {
    const s = students[i];
    await db.absence.create({
      data: {
        studentId: s.id,
        sessionId: session1.id,
        status: "ABSENT",
        oriented: i < 2,
        justified: false,
      },
    });
  }

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  threeDaysAgo.setHours(9, 0, 0, 0);

  const session2 = await db.session.create({
    data: {
      teacherId: teacher2.id,
      classeId: tcsf1.id,
      date: threeDaysAgo,
      subject: "Physique-Chimie",
      subjectAr: "الفيزياء والكيمياء",
    },
  });

  for (let i = 5; i < 8; i++) {
    const s = students[i];
    await db.absence.create({
      data: {
        studentId: s.id,
        sessionId: session2.id,
        status: i === 5 ? "RETARD" : "ABSENT",
        oriented: i === 6,
      },
    });
  }

  console.log("✓ Seed completed successfully");
  console.log("Demo accounts:");
  console.log("  Surveillant: surveillant@edu.ma / surveillant123");
  console.log("  Enseignant:  enseignant@edu.ma / enseignant123");
  console.log(`Created: 3 users, 3 niveaux, 4 classes, 3 groups, 2 teachers, 5 service tables, ${slotDefs.length} weekly slots, ${students.length + 8} students, 2 sessions, 8 absences`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
