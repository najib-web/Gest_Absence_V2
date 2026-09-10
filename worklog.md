# Worklog — Application de Gestion des Absences

---
Task ID: 1
Agent: Super Z (main agent)
Task: Ajout de la table de services hebdomadaire (Lundi→Samedi, 8h→18h) avec appel automatique selon la date système + signalement des élèves orientés vers le surveillant.

Work Log:
- Lu les fichiers existants (schéma Prisma, API sessions/service-tables, composants admin/teacher, i18n, hooks) pour comprendre l'architecture en place.
- Prisma : ajout du modèle `ServiceSlot` (dayOfWeek 1=Lundi..6=Samedi, startMin/endMin en minutes, teacher/classe/groupe/subject) + `groupId`/`groupe` sur `Session` pour l'appel par groupe. Push DB OK (`bun run db:push`).
- API : création `/api/service-slots` (GET liste + filtres, POST surveillant avec validation jour 1-6, créneau parmi les 5 blocs de 2h 8h→18h, détection de conflits enseignant et classe/groupe → 409) et `/api/service-slots/[id]` (DELETE).
- API sessions : POST enrichi avec `groupId` + `dedupeFrom` (réutilise la séance déjà créée le même jour pour le même créneau) ; GET /[id] filtre les élèves par groupe quand la séance cible un groupe.
- Bibliothèque partagée `src/lib/schedule.ts` : TIME_SLOTS (5 blocs 2h), DAY_NAMES bilingues, findCurrentSlot / findNextSlot, helpers minutes↔labels.
- Hook `useNow` dans hooks.ts : horloge live (30s) compatible lint (pas de setState synchrone dans useEffect).
- Composant `WeeklyGrid` partagé : tableau Lundi→Samedi × créneaux 8h→18h, colonne créneaux sticky, code couleur par enseignant, badges classe/groupe/matière, surbrillance jour courant ("Maintenant") + créneau courant ("● En cours"), suppression inline, cellules vides cliquables (+).
- Page Admin `AdminSchedule` : filtre par enseignant, dialog d'ajout (enseignant/jour/créneau/classe/groupe/matière), pré-remplissage depuis une cellule vide. Ajoutée à la navigation admin.
- Côté Enseignant : carte "Séance en cours / Prochaine séance" sur la vue d'ensemble (détection selon date système + table de service), bouton "Faire l'Appel" → crée la session (avec dédoublonnage) et ouvre la feuille d'appel filtrée par groupe. Nouvelle page "Mon Emploi du Temps" (grille personnelle en lecture seule).
- i18n : ~20 nouvelles clés FR/AR (jours, créneaux, séance en cours, prochaine séance, etc.).
- Seed : 19 créneaux hebdomadaires de démonstration pour les 2 enseignants sur les 6 jours.
- Corrections : champ `slots` superflu retiré de ServiceTable (erreur P1012), redémarrage du serveur dev (client Prisma régénéré) via le script d'init officiel.
- Vérification navigateur (agent-browser) : grille admin rendue + ajout de séance via dialog OK ; détection "Séance en cours" validée en simulant la date système (lundi 09:30 → TCSF-1 Maths ; mardi 10:30 → TCSF-1 G1 Maths TP) ; appel complet : 30 élèves (classe) puis 10 élèves (groupe G1), marquage 2 absents + 1 orienté, sauvegarde OK ; supervision surveillant affiche l'élève orienté ; grille personnelle enseignant avec "Mardi ● Maintenant" + "● En cours" ; version arabe RTL vérifiée (grille miroir, libellés AR) ; validations de conflits API (créneau invalide, chevauchement enseignant) → 400/409 ; lint final sans erreur.

Stage Summary:
- Livré : table de services hebdomadaire éditable (6 jours × 5 créneaux 8h-18h), appel automatique selon la date système avec support des groupes, signalement des orientés vers le surveillant, RTL/AR complet.
- Fichiers clés : prisma/schema.prisma, src/lib/schedule.ts, src/lib/hooks.ts (useNow), src/app/api/service-slots/*, src/components/schedule/weekly-grid.tsx, src/components/admin/admin-schedule.tsx, src/components/teacher/teacher-overview.tsx, src/components/teacher/teacher-schedule.tsx.
- Comptes démo inchangés : surveillant@edu.ma / surveillant123, enseignant@edu.ma / enseignant123.
- Données de démo créées durant les tests conservées (séance lundi avec 2 absences dont 1 orientée, séance TP G1 mardi, créneau Vendredi 16-18 Informatique).

---
Task ID: 2
Agent: Super Z (main agent)
Task: Créneaux 1h/2h, seuil d'absences avec orientation par le surveillant, rapports d'orientation des enseignants imprimables en PDF, historique des absences (par code Massar / par classe + période) exportable en Excel.

Work Log:
- Prisma : ajout des modèles `Setting` (clé/valeur, seuil d'absences) et `Orientation` (source TEACHER/SEUIL/MANUEL, statut PENDING/RESOLVED, contenu du rapport, lien optionnel enseignant/séance) + relations inverses. Push DB OK.
- Créneaux 1h/2h : `src/lib/schedule.ts` enrichi (SCHOOL_START/END, SLOT_DURATIONS_H=[1,2], HOUR_SLOTS 10 lignes horaires, isValidTimeSlot, slotDurationHours, buildSlotOptions). API service-slots : validation durée 1h/2h alignée sur l'heure entre 08:00 et 18:00 (tests : 1h ✓, 3h ✗400, non-aligné ✗400, 17-18h ✓, conflits enseignant/classe 409 ✓).
- WeeklyGrid entièrement redessinée : grille horaire absolue (10 h × 6 jours), cartes de séance dimensionnées selon la durée réelle (2h=130px, 1h=62px), ligne rouge "maintenant" sur la colonne du jour, clic sur cellule vide → pré-remplissage, RTL miroir vérifié en arabe.
- Dialog admin "Ajouter une séance" : nouveau select Durée (1 heure(s)/2 heure(s)) + Heure de début dynamique (options filtrées pour fin ≤ 18h).
- Nouvelles APIs : `/api/settings` (GET/PUT seuil, défaut 3), `/api/orientations` (GET filtres status/source/teacherId/studentId + comptes d'absences non justifiées par élève, POST avec règles par rôle), `/api/orientations/[id]` (PATCH résoudre/réouvrir, DELETE), `/api/students/absence-counts` (stats par élève vs seuil : total, non justifiées, retards, exceeded/atLimit), `/api/absences` GET enrichi du filtre `codeMassar` + `to` inclusif 23:59.
- Page admin `AdminOrientations` (4 onglets) : Seuil (édition + règle courante), Dépassements (table des élèves avec progression seuil, filtre classe, bouton Orienter → dialog contenu pré-généré {count}/{threshold}), Rapports des enseignants (Voir / Imprimer / Traité / Réouvrir), Toutes les orientations (origines colorées, suppression). Ajoutée à la nav admin.
- Côté enseignant : le bouton "Orienter" de la feuille d'appel ouvre un dialog de rédaction de rapport (POST /api/orientations source=TEACHER, marque l'absence oriented=true via absenceId). Page Élèves Orientés réécrite : "Mes rapports envoyés" (statut En attente/Traité + Voir + Imprimer) au-dessus des absences orientées.
- Impression PDF : composant `report-print.tsx` (document formel : en-tête établissement, cadre RAPPORT D'ORIENTATION, réf, infos élève/classe/groupe/enseignant/séance, encadré situation (non justifiées vs seuil), contenu, zones signature, imprimé le) + CSS @media print isolant `.print-area` (globals.css). Fonctionne en FR et AR.
- Historique des absences : composant partagé `absence-history.tsx` (onglets Par Élève — recherche code Massar + carte résumé stats, Par Classe — classe + période Du/Au) avec export Excel bilingue (xlsx, 11 colonnes) côté admin ET enseignant (nav + AbsenceHistory).
- i18n : ~70 nouvelles clés FR/AR (durée, seuil, orientations, rapports, historique…).
- Corrections : redémarrage dev + suppression cache .next (client Prisma périmé après ajout des modèles — "db.setting undefined"), bug d'hydratation i18n corrigé (locale lue du localStorage après montage, setState différé via setTimeout pour la règle lint).
- Vérification navigateur : grille 1h/2h rendue (hauteurs mesurées 130/62px) + AR miroir ; seuil modifié à 1 via UI ; 8 élèves en dépassement détectés ; orientation Alaoui Youssef créée (badge "Seuil dépassé") ; rapport enseignant envoyé depuis la feuille d'appel (G1, 1 absent/9 présents enregistrés) ; visible côté admin (Rapports, marqué Traité) ; aperçu PDF vérifié visuellement ; historique par Massar (R13000001 → 3 absences, stats 3/3/0) + export Excel sans erreur console ; filtres classe/période API validés ; supervision régression OK ; RTL arabe complet sans badge d'erreur ; lint final 0 erreur.

Stage Summary:
- Livré : créneaux de séance 1h ou 2h au choix dans la grille hebdomadaire ; seuil d'absences non justifiées défini par le surveillant avec liste des élèves en dépassement et orientation en un clic ; rapports d'orientation rédigés par les enseignants, transmis au surveillant (statut En attente/Traité) et imprimables en PDF (aperçu formel bilingue) ; historique des absences par élève (code Massar) ou par classe sur période, exportable en Excel — accessible aux deux rôles ; correction d'un bug d'hydratation i18n.
- Fichiers clés : prisma/schema.prisma (Setting, Orientation), src/lib/schedule.ts, src/app/api/settings|orientations|students/absence-counts/*, src/app/api/absences|service-slots (enrichis), src/components/schedule/weekly-grid.tsx (refonte), src/components/admin/admin-orientations.tsx, src/components/report-print.tsx, src/components/absence-history.tsx, src/components/teacher/teacher-attendance.tsx (dialog rapport), src/components/teacher/teacher-oriented.tsx (refonte), src/lib/i18n.ts, src/lib/i18n-context.tsx (fix hydration), globals.css (print).
- Comptes démo inchangés : surveillant@edu.ma / surveillant123, enseignant@edu.ma / enseignant123.
- État démo : seuil=1 (démonstration des dépassements), 1 orientation "Seuil dépassé" (Alaoui), 1 rapport enseignant (Alaoui, Traité), 2 nouveaux créneaux 1h (Lundi 14-15 EPS, Mercredi 17-18 EPS).

---
Task ID: 3
Agent: Super Z (main agent)
Task: Ajout des imports par fichiers modèles côté surveillant : liste des élèves + classes (ListEleve_20260905.xlsx), liste des enseignants + matière (Liste enseignants.xlsx), tableaux de services (tableaux de services.csv).

Work Log:
- src/lib/excel.ts enrichi : helpers partagés deaccent, detectColumns (scoring exact/startsWith/includes pour mapper les colonnes FR/AR sans confusion Nom/Prénom), parseTimeToMinutes ("08:00","8h","8h30","8"), parseDayOfWeek (FR/EN/AR/1-6), readSheetRows (XLSX binaire + CSV texte avec BOM et séparateur ";" FR) ; nouveaux parseurs parseTeachersExcel et parseServiceFile (colonne combinée "Créneau" 08:00-10:00 supportée).
- src/lib/subjects.ts créé : SUBJECTS partagé FR/AR (14 matières) + subjectArFromFr() ; refactor admin-teachers/admin-schedule pour importer la liste commune (suppression des doublons locaux).
- API /api/students/import améliorée : création automatique des Niveaux (normalisation TC / 1BAC / 2BAC depuis le libellé ou le code classe) et des Classes manquantes au commit ; preview renvoie classesToCreate + flag classeWillBeCreated par ligne ; réponse commit inclut classesCreated.
- API /api/teachers/import créée : preview/commit ; upsert par email ; email auto-généré prenom.nom@edu.ma (slug sans accents, anti-collision avec suffixe) si vide ; mot de passe par défaut "enseignant123" ; matiereAr déduite ; compte User (rôle ENSEIGNANT) + profil Teacher ; mise à jour si le compte existe déjà.
- API /api/service-slots/import créée : preview/commit ; résolution enseignant par nom (insensible casse/accents, "Nom Prénom" et "Prénom Nom"), classe par code, groupe dans la classe ; validation isValidTimeSlot (1h/2h, 08:00→18:00) ; détection des conflits enseignant et classe/groupe contre l'état DB ET les lignes précédentes du fichier (semantics replace sur teacher+jour+début → update) ; commit : créations+mises à jour puis synchronisation des Tables de Service (hoursPerWeek recalculé = somme des durées des créneaux) via findFirst/create (clé composée avec groupId nullable).
- scripts/gen-templates.ts : génération des 3 fichiers modèles dans public/templates (ListEleve_20260905.xlsx 12 élèves, Liste enseignants.xlsx 8 profs dont emails partiellement vides, tableaux de services.csv 14 séances dont une de 1h, BOM UTF-8).
- i18n : ~35 nouvelles clés FR/AR (imports, modèles, erreurs codées MISSING_FIELD/INVALID_DAY/INVALID_SLOT/TEACHER_NOT_FOUND/CLASSE_NOT_FOUND/TEACHER_CONFLICT/CLASS_CONFLICT...) ; doublons french/arabic préexistants supprimés (erreur TS1117) ; cast `as Dict` dans i18n-context (erreur de type préexistante) ; SlotWithPeople.id ajouté.
- UI : AdminTeachers (boutons Modèle + Importer, dialog d'aperçu 4 colonnes avec badge "auto" sur emails générés) ; AdminSchedule (boutons Modèle CSV + Importer, dialog avec badges résumé À créer/À mettre à jour/Erreur) ; AdminStudents (modèle Excel réel remplaçant le CSV généré, bandeau vert "Classes à créer automatiquement", badge "+ Nouvelle" sur les classes créées à l'import).
- BUG CORRIGÉ (bloquant, affectait aussi l'import élèves existant) : le pattern e.target.value="" dans onChange vidait le FileList → le commit ne retrouvait plus le fichier (toast "Aucun fichier sélectionné"). Correction dans les 3 composants : fichier conservé dans lastFileRef (useRef<File|null>).
- Tests : scripts/test-parsers.ts (parseurs + edge cases jour invalide/4h/CSV point-virgule) ; scripts/test-imports.ts end-to-end API (élèves 12 insérés + 3 classes créées ; enseignants 8 créés, emails générés ; services 12 créés, 2 conflits démo détectés, re-import idempotent 0 create/12 update ; 10 tables de service synchronisées).
- Vérification navigateur : dialog enseignants (8 lignes, badge auto) → commit "0 importés, 8 mis à jour" ; dialog services (14 lignes, 0/12/2) → commit "0 importées, 12 mises à jour, 2 lignes ignorées" ; dialog élèves (12 lignes) → "12 élèves importés" ; grille horaire affiche les séances importées (Mardi G1 TP, Jeudi 1BACSC-1, Vendredi, Samedi...) avec conflits démo préservés ; liens modèles HTTP 200 ; RTL arabe complet (boutons et grille miroir traduits) ; lint 0 erreur ; tsc src propre.

Stage Summary:
- Livré : 3 imports par fichiers modèles côté surveillant — élèves (avec création automatique des classes/niveaux manquants), enseignants (matière + compte utilisateur auto), tableaux de services hebdomadaires (CSV/Excel, créneaux 1h/2h validés, conflits détectés, tables de service synchronisées) ; fichiers modèles téléchargeables depuis les 3 pages ; correction d'un bug bloquant du commit d'import (FileList vidée) qui touchait aussi l'import élèves existant.
- Fichiers clés : src/lib/excel.ts, src/lib/subjects.ts, src/app/api/students/import, src/app/api/teachers/import, src/app/api/service-slots/import, public/templates/*, scripts/gen-templates.ts, admin-{students,teachers,schedule}.tsx, src/lib/i18n.ts.
- Comptes démo inchangés : surveillant@edu.ma / surveillant123, enseignant@edu.ma / enseignant123. Enseignants importés : a.bennani@edu.ma etc. (mot de passe enseignant123).
- État démo enrichi : 7 classes, 38 élèves, 10 enseignants, 34 créneaux hebdomadaires, 10 tables de service.
