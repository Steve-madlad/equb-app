import type { NextRequest } from 'next/server';

export const TEST_DATE_COOKIE = 'equb-test-date';
export const TEST_DATE_STORAGE_KEY = 'equb-test-date';
export const TEST_DATE_HEADER = 'x-equb-test-date';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string | null | undefined): value is string {
  if (!value || !ISO_DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getBrowserTestDate(): string | null {
  if (typeof window === 'undefined') return null;

  const stored = window.localStorage.getItem(TEST_DATE_STORAGE_KEY);
  if (isValidIsoDate(stored)) return stored;

  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${TEST_DATE_COOKIE}=`));
  const cookieValue = match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;

  return isValidIsoDate(cookieValue) ? cookieValue : null;
}

export function setBrowserTestDate(value: string | null): void {
  if (typeof window === 'undefined') return;

  if (isValidIsoDate(value)) {
    window.localStorage.setItem(TEST_DATE_STORAGE_KEY, value);
    document.cookie = `${TEST_DATE_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=31536000`;
    return;
  }

  window.localStorage.removeItem(TEST_DATE_STORAGE_KEY);
  document.cookie = `${TEST_DATE_COOKIE}=; path=/; max-age=0`;
}

export function getRequestTestDate(request: NextRequest): string | null {
  const headerValue = request.headers.get(TEST_DATE_HEADER);
  if (isValidIsoDate(headerValue)) return headerValue;

  const cookieValue = request.cookies.get(TEST_DATE_COOKIE)?.value ?? null;
  return isValidIsoDate(cookieValue) ? cookieValue : null;
}

export function resolveRequestDate(request: NextRequest): string {
  return getRequestTestDate(request) ?? getTodayIsoDate();
}
