/**
 * Date formatting for the explorer views.
 *
 * - "short": month as a short name, 12-hour clock, e.g. "Nov 20, 2026, 02:05:03 PM" (metadata sidebar).
 * - "numeric": numeric month, 24-hour clock, no comma, e.g. "11/20/2026 14:05:03" (main view details).
 */
export type DateStyle = 'short' | 'numeric';

export function formatDate(value: string | number | null | undefined, style: DateStyle = 'short'): string {
if (!value) return 'N/A';
const date = new Date(value);

if (style === 'numeric') {
return date.toLocaleDateString('en-US', {
hour12: false,
year: 'numeric',
month: 'numeric',
day: '2-digit',
hour: '2-digit',
minute: '2-digit',
second: '2-digit',
}).replace(',', '');
}

return date.toLocaleDateString('en-US', {
year: 'numeric',
month: 'short',
day: 'numeric',
hour: '2-digit',
minute: '2-digit',
second: '2-digit',
});
}