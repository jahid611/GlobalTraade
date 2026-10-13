// Rapport de due diligence et journal d'accès à la data room, sur le gabarit
// commun des PDF (voir pdfTemplate).
import { format } from "date-fns";
import type { TFunction } from 'i18next';
import { createGloblyPdf, pdfFileName, PDF_COLORS, type GloblyPdf, type Rgb } from './pdfTemplate';

// Lignes exportées : on ne dépend que de ce que le PDF lit réellement.
type DdTask = { title?: string; category?: string; status?: string; created_at?: string | null; completed_at?: string | null };
type AuditLog = { viewed_at?: string | null; created_at?: string | null; viewer?: { full_name?: string | null } | null; document?: { name?: string | null } | null };

const today = (lang: string) =>
  new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** Construit le rapport de due diligence, sans l'enregistrer. */
export const buildDueDiligenceReport = async (tasks: DdTask[], listingName: string, _t: TFunction, lang: string): Promise<GloblyPdf> => {
  const fr = lang === 'fr';
  const labels = {
    completed: fr ? 'Validé' : 'Completed',
    in_progress: fr ? 'En cours' : 'In Progress',
    pending: fr ? 'En attente' : 'Pending',
  };
  const statusOf = (task: DdTask) =>
    task.status === 'completed' ? labels.completed : task.status === 'in_progress' ? labels.in_progress : labels.pending;

  const done = tasks.filter((task) => task.status === 'completed').length;
  const running = tasks.filter((task) => task.status === 'in_progress').length;
  const waiting = tasks.length - done - running;
  const progress = tasks.length ? `${Math.round((done / tasks.length) * 100)} %` : '0 %';

  const pdf = await createGloblyPdf({
    kind: fr ? "Rapport d'audit et due diligence" : 'Due diligence audit report',
    title: listingName,
    subtitle: fr ? "État d'avancement des tâches" : 'Task Progress Status',
    facts: [
      ['Projet / Dossier', listingName],
      [fr ? 'Date' : 'Date', today(lang)],
      [fr ? 'Tâches' : 'Tasks', String(tasks.length)],
      [fr ? 'Avancement' : 'Progress', progress],
    ],
    footerNote: fr ? 'Document confidentiel' : 'Confidential document',
    lang: fr ? 'fr' : 'en',
  });

  pdf.section(fr ? "État d'avancement des tâches" : 'Task Progress Status');
  pdf.figures([
    { label: fr ? 'Tâches' : 'Tasks', value: String(tasks.length), highlight: true },
    { label: labels.completed, value: String(done) },
    { label: labels.in_progress, value: String(running) },
    { label: labels.pending, value: String(waiting) },
  ], { perRow: 4 });

  const statusColor: Record<string, Rgb> = {
    [labels.completed]: PDF_COLORS.green,
    [labels.in_progress]: PDF_COLORS.amber,
    [labels.pending]: PDF_COLORS.grey,
  };
  pdf.grid(
    [
      fr ? 'Catégorie' : 'Category',
      fr ? 'Tâche' : 'Task',
      fr ? 'Créée le' : 'Created At',
      fr ? 'Statut' : 'Status',
      fr ? 'Terminée le' : 'Completed At',
    ],
    tasks.map((task) => [
      (task.category || '').toUpperCase(),
      task.title || '',
      task.created_at ? format(new Date(task.created_at), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy'),
      statusOf(task),
      task.status === 'completed' && task.completed_at ? format(new Date(task.completed_at), 'dd/MM/yyyy') : '',
    ]),
    { widths: [30, 50, 29, 26, 31], cellColor: (_row, col, value) => (col === 3 ? statusColor[value] : undefined) },
  );

  pdf.callout(fr
    ? "Ce document est un extrait horodaté du suivi d'audit réalisé sur la plateforme Globly."
    : 'This document is a timestamped extract of the audit tracking performed on the Globly platform.');
  return pdf;
};

export const exportDueDiligenceReport = async (tasks: DdTask[], listingName: string, t: TFunction, lang: string) => {
  const pdf = await buildDueDiligenceReport(tasks, listingName, t, lang);
  pdf.save(pdfFileName('Due-Diligence-Report', listingName));
};

/** Construit le journal d'accès à la data room, sans l'enregistrer. */
export const buildVDRAuditTrail = async (logs: AuditLog[], listingName: string, _t: TFunction, lang: string): Promise<GloblyPdf> => {
  const fr = lang === 'fr';
  const unknownUser = fr ? 'Utilisateur inconnu' : 'Unknown user';
  const unknownFile = fr ? 'Fichier inconnu' : 'Unknown file';
  const rows = logs.map((log) => ({
    at: new Date(log.viewed_at || log.created_at || new Date()),
    user: log.viewer?.full_name || unknownUser,
    file: log.document?.name || unknownFile,
  }));
  const users = new Set(rows.map((row) => row.user)).size;
  const files = new Set(rows.map((row) => row.file)).size;

  const pdf = await createGloblyPdf({
    kind: fr ? "Registre d'accès data room (VDR)" : 'Data room access log (VDR)',
    title: listingName,
    subtitle: fr ? 'Historique des consultations (Audit Trail)' : 'Viewing History (Audit Trail)',
    facts: [
      ['Projet / Dossier', listingName],
      [fr ? 'Date' : 'Date', today(lang)],
      [fr ? 'Consultations' : 'Views', String(rows.length)],
      [fr ? 'Utilisateurs' : 'Users', String(users)],
    ],
    footerNote: fr ? 'Document confidentiel' : 'Confidential document',
    lang: fr ? 'fr' : 'en',
  });

  pdf.section(fr ? 'Historique des consultations (Audit Trail)' : 'Viewing History (Audit Trail)');
  pdf.figures([
    { label: fr ? 'Consultations' : 'Views', value: String(rows.length), highlight: true },
    { label: fr ? 'Utilisateurs' : 'Users', value: String(users) },
    { label: fr ? 'Documents consultés' : 'Documents viewed', value: String(files) },
  ]);
  pdf.grid(
    [
      fr ? 'Date & Heure' : 'Date & Time',
      fr ? 'Utilisateur' : 'User',
      fr ? 'Document consulté' : 'Document viewed',
      fr ? "Niveau d'accès" : 'Access level',
    ],
    rows.map((row) => [format(row.at, 'dd/MM/yyyy HH:mm:ss'), row.user, row.file, 'Accès sécurisé (NDA)']),
    { widths: [43, 37, 48, 38] },
  );

  pdf.callout(fr
    ? 'Ce registre (Audit Trail) garantit la traçabilité des accès aux documents confidentiels. Généré par Globly.'
    : 'This Audit Trail guarantees the traceability of access to confidential documents. Generated by Globly.');
  return pdf;
};

export const exportVDRAuditTrail = async (logs: AuditLog[], listingName: string, t: TFunction, lang: string) => {
  const pdf = await buildVDRAuditTrail(logs, listingName, t, lang);
  pdf.save(pdfFileName('VDR-Audit-Trail', listingName));
};
