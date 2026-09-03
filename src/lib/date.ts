export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
