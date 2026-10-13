// Textes du rapport de due diligence. Les titres et catégories des tâches
// viennent de l'appelant, déjà traduits.
import { defineWording } from './wording';

export const DUE_DILIGENCE_WORDING = defineWording({
  kind: {
    fr: "Rapport d'audit et due diligence",
    en: 'Due diligence audit report',
    es: 'Informe de auditoría y due diligence',
    it: 'Rapporto di audit e due diligence',
    pt: 'Relatório de auditoria e due diligence',
    de: 'Prüfbericht zur Due Diligence',
  },
  // sous-titre de la couverture et titre de la section
  progressTitle: {
    fr: "État d'avancement des tâches",
    en: 'Task Progress Status',
    es: 'Estado de avance de las tareas',
    it: 'Stato di avanzamento delle attività',
    pt: 'Estado de progresso das tarefas',
    de: 'Bearbeitungsstand der Aufgaben',
  },
  projectFile: {
    fr: 'Projet / Dossier',
    en: 'Project / File',
    es: 'Proyecto / Expediente',
    it: 'Progetto / Fascicolo',
    pt: 'Projeto / Dossiê',
    de: 'Projekt / Dossier',
  },
  date: { fr: 'Date', en: 'Date', es: 'Fecha', it: 'Data', pt: 'Data', de: 'Datum' },
  tasks: { fr: 'Tâches', en: 'Tasks', es: 'Tareas', it: 'Attività', pt: 'Tarefas', de: 'Aufgaben' },
  progress: { fr: 'Avancement', en: 'Progress', es: 'Avance', it: 'Avanzamento', pt: 'Progresso', de: 'Fortschritt' },

  // statuts d'une tâche
  statusCompleted: { fr: 'Validé', en: 'Completed', es: 'Validada', it: 'Convalidata', pt: 'Validada', de: 'Erledigt' },
  statusInProgress: { fr: 'En cours', en: 'In Progress', es: 'En curso', it: 'In corso', pt: 'Em curso', de: 'In Arbeit' },
  statusPending: { fr: 'En attente', en: 'Pending', es: 'Pendiente', it: 'In attesa', pt: 'Pendente', de: 'Ausstehend' },

  // en-têtes du tableau
  category: { fr: 'Catégorie', en: 'Category', es: 'Categoría', it: 'Categoria', pt: 'Categoria', de: 'Kategorie' },
  task: { fr: 'Tâche', en: 'Task', es: 'Tarea', it: 'Attività', pt: 'Tarefa', de: 'Aufgabe' },
  createdOn: { fr: 'Créée le', en: 'Created At', es: 'Creada el', it: 'Creata il', pt: 'Criada em', de: 'Erstellt am' },
  status: { fr: 'Statut', en: 'Status', es: 'Estado', it: 'Stato', pt: 'Estado', de: 'Status' },
  completedOn: {
    fr: 'Terminée le',
    en: 'Completed At',
    es: 'Finalizada el',
    it: 'Completata il',
    pt: 'Concluída em',
    de: 'Erledigt am',
  },

  note: {
    fr: "Ce document est un extrait horodaté du suivi d'audit réalisé sur la plateforme Globly.",
    en: 'This document is a timestamped extract of the audit tracking performed on the Globly platform.',
    es: 'Este documento es un extracto con marca de tiempo del seguimiento de auditoría realizado en la plataforma Globly.',
    it: "Il presente documento è un estratto con marca temporale del monitoraggio dell'audit svolto sulla piattaforma Globly.",
    pt: 'Este documento é um extrato com carimbo temporal do acompanhamento de auditoria realizado na plataforma Globly.',
    de: 'Dieses Dokument ist ein mit Zeitstempel versehener Auszug aus der auf der Plattform Globly durchgeführten Prüfungsverfolgung.',
  },

  // nom du fichier : terme international, identique dans toutes les langues
  filePrefix: {
    fr: 'Due-Diligence-Report',
    en: 'Due-Diligence-Report',
    es: 'Due-Diligence-Report',
    it: 'Due-Diligence-Report',
    pt: 'Due-Diligence-Report',
    de: 'Due-Diligence-Report',
  },
});
