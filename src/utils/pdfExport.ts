// Rapport de due diligence et journal d'accès à la data room, sur le gabarit
// commun des PDF (voir pdfTemplate). Leurs textes existent dans les six langues
// du site : voir pdf/dueDiligence.ts et pdf/dataRoomLog.ts.
import type { TFunction } from 'i18next';
import { createGloblyPdf, pdfFileName, PDF_COLORS, type GloblyPdf, type Rgb } from './pdfTemplate';
import { DUE_DILIGENCE_WORDING } from './pdf/dueDiligence';
import { DATA_ROOM_LOG_WORDING } from './pdf/dataRoomLog';
import { wordsFor } from './pdf/wording';
import { formatDate, localeFor } from '@/lib/markets';

// Lignes exportées : on ne dépend que de ce que le PDF lit réellement.
type DdTask = { title?: string; category?: string; status?: string; created_at?: string | null; completed_at?: string | null };
type AuditLog = { viewed_at?: string | null; created_at?: string | null; viewer?: { full_name?: string | null } | null; document?: { name?: string | null } | null };

// Les dates suivent la langue du document, comme ses textes.
const today = (lang: string) => formatDate(new Date(), lang, 'long');
const shortDay = (value: string | Date, lang: string) => formatDate(value, lang, 'short');
const dayAndTime = (at: Date, lang: string) =>
  `${shortDay(at, lang)} ${at.toLocaleTimeString(localeFor(lang), { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })}`;

/** Construit le rapport de due diligence, sans l'enregistrer. Les tâches arrivent déjà traduites. */
export const buildDueDiligenceReport = async (tasks: DdTask[], listingName: string, _t: TFunction, lang: string): Promise<GloblyPdf> => {
  const w = wordsFor(DUE_DILIGENCE_WORDING, lang);
  const labels = {
    completed: w('statusCompleted'),
    in_progress: w('statusInProgress'),
    pending: w('statusPending'),
  };
  const statusOf = (task: DdTask) =>
    task.status === 'completed' ? labels.completed : task.status === 'in_progress' ? labels.in_progress : labels.pending;

  const done = tasks.filter((task) => task.status === 'completed').length;
  const running = tasks.filter((task) => task.status === 'in_progress').length;
  const waiting = tasks.length - done - running;
  const progress = tasks.length ? `${Math.round((done / tasks.length) * 100)} %` : '0 %';

  const pdf = await createGloblyPdf({
    kind: w('kind'),
    title: listingName,
    subtitle: w('progressTitle'),
    facts: [
      [w('projectFile'), listingName],
      [w('date'), today(lang)],
      [w('tasks'), String(tasks.length)],
      [w('progress'), progress],
    ],
    lang,
  });

  pdf.section(w('progressTitle'));
  pdf.figures([
    { label: w('tasks'), value: String(tasks.length), highlight: true },
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
    [w('category'), w('task'), w('createdOn'), w('status'), w('completedOn')],
    tasks.map((task) => [
      (task.category || '').toUpperCase(),
      task.title || '',
      shortDay(task.created_at || new Date(), lang),
      statusOf(task),
      task.status === 'completed' && task.completed_at ? shortDay(task.completed_at, lang) : '',
    ]),
    { widths: [30, 50, 29, 26, 31], cellColor: (_row, col, value) => (col === 3 ? statusColor[value] : undefined) },
  );

  pdf.callout(w('note'));
  return pdf;
};

export const exportDueDiligenceReport = async (tasks: DdTask[], listingName: string, t: TFunction, lang: string) => {
  const pdf = await buildDueDiligenceReport(tasks, listingName, t, lang);
  pdf.save(pdfFileName(wordsFor(DUE_DILIGENCE_WORDING, lang)('filePrefix'), listingName));
};

/** Construit le journal d'accès à la data room, sans l'enregistrer. */
export const buildVDRAuditTrail = async (logs: AuditLog[], listingName: string, _t: TFunction, lang: string): Promise<GloblyPdf> => {
  const w = wordsFor(DATA_ROOM_LOG_WORDING, lang);
  const unknownUser = w('unknownUser');
  const unknownFile = w('unknownFile');
  const rows = logs.map((log) => ({
    at: new Date(log.viewed_at || log.created_at || new Date()),
    user: log.viewer?.full_name || unknownUser,
    file: log.document?.name || unknownFile,
  }));
  const users = new Set(rows.map((row) => row.user)).size;
  const files = new Set(rows.map((row) => row.file)).size;

  const pdf = await createGloblyPdf({
    kind: w('kind'),
    title: listingName,
    subtitle: w('historyTitle'),
    facts: [
      [w('projectFile'), listingName],
      [w('date'), today(lang)],
      [w('views'), String(rows.length)],
      [w('users'), String(users)],
    ],
    lang,
  });

  pdf.section(w('historyTitle'));
  pdf.figures([
    { label: w('views'), value: String(rows.length), highlight: true },
    { label: w('users'), value: String(users) },
    { label: w('documentsViewed'), value: String(files) },
  ]);
  pdf.grid(
    [w('dateAndTime'), w('user'), w('documentViewed'), w('accessLevel')],
    rows.map((row) => [dayAndTime(row.at, lang), row.user, row.file, w('secureAccess')]),
    { widths: [43, 37, 48, 38] },
  );

  pdf.callout(w('note'));
  return pdf;
};

export const exportVDRAuditTrail = async (logs: AuditLog[], listingName: string, t: TFunction, lang: string) => {
  const pdf = await buildVDRAuditTrail(logs, listingName, t, lang);
  pdf.save(pdfFileName(wordsFor(DATA_ROOM_LOG_WORDING, lang)('filePrefix'), listingName));
};
