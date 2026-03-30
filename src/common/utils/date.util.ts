export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  return new Date(date)
    .toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .replace(/ /g, '-'); // e.g. 04-Mar-2024
}
