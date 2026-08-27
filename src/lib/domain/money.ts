import Decimal from "decimal.js";

/** All monetary amounts stored as integer minor units (1 ETB = 100 minor units). */
export type MoneyMinor = number;

export const CURRENCY_ETB = "ETB" as const;
export type Currency = typeof CURRENCY_ETB;

export function toMinorUnits(amount: string | number): MoneyMinor {
  return new Decimal(amount).mul(100).round().toNumber();
}

export function fromMinorUnits(minor: MoneyMinor): string {
  return new Decimal(minor).div(100).toFixed(2);
}

export function formatMoney(minor: MoneyMinor, currency: Currency = CURRENCY_ETB): string {
  const amount = new Decimal(minor).div(100).toNumber();
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${currency}`;
}

export function addMoney(...amounts: MoneyMinor[]): MoneyMinor {
  return amounts.reduce((sum, a) => sum + a, 0);
}

export function multiplyMoney(minor: MoneyMinor, factor: number): MoneyMinor {
  return new Decimal(minor).mul(factor).round().toNumber();
}

export function calculatePenalty(
  contributionMinor: MoneyMinor,
  penaltyEnabled: boolean,
  penaltyType: PenaltyType | null,
  penaltyAmount: number | null
): MoneyMinor {
  if (!penaltyEnabled || !penaltyType || penaltyAmount == null) return 0;
  if (penaltyType === "FIXED_AMOUNT") return toMinorUnits(penaltyAmount);
  if (penaltyType === "PERCENTAGE") {
    return new Decimal(contributionMinor).mul(penaltyAmount).div(100).round().toNumber();
  }
  return 0;
}

export type PenaltyType = "FIXED_AMOUNT" | "PERCENTAGE";
