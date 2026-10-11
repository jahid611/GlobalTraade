// Le film de présentation existe en français et en anglais, en deux formats.
// Toute autre langue du site reçoit la version anglaise.
export function filmSrc(format: 'desktop' | 'mobile', language: string | undefined): string {
  const french = (language || 'fr').toLowerCase().startsWith('fr');
  return `/globly-film-${format}${french ? '' : '-en'}.mp4`;
}
