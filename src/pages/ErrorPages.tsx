import { ErrorScreen } from "@/components/ErrorScreen";

// Pages d'erreur qui ont leur propre adresse. Les autres écrans (404, panne,
// hors connexion) s'affichent sur place, sans changer d'adresse.
export const AccessDenied = () => <ErrorScreen kind="acces-refuse" />;
export const SessionExpired = () => <ErrorScreen kind="session-expiree" />;
export const Maintenance = () => <ErrorScreen kind="maintenance" />;
export const ListingUnavailable = () => <ErrorScreen kind="annonce-introuvable" />;
