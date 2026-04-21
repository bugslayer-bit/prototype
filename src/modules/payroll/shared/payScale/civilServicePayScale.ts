/**
 * Civil Service Pay Scale — sourced from Payroll SRS v1 (2025).
 * Values parsed from ZESt (RCSC) LoV sheet `LoVBasedOnCategory`, rows 152-176,
 * original format: `[POSITION:<LEVEL>]/basePay/annualIncrement/maxPay`.
 *
 * basePay        — entry-point monthly basic pay for the level (Nu.)
 * annualIncrement — increment per year of service (Nu.)
 * maxPay         — ceiling monthly basic pay for the level (Nu.)
 */
export interface PayScaleEntry {
  level: string;
  basePay: number;
  annualIncrement: number;
  maxPay: number;
}

export const CIVIL_SERVICE_PAY_SCALE: Record<string, PayScaleEntry> = {
  "EX|ES-1": { level: "EX|ES-1", basePay: 54575, annualIncrement: 1090, maxPay: 70925 },
  "EX|ES-2": { level: "EX|ES-2", basePay: 45785, annualIncrement: 915, maxPay: 59510 },
  "EX|ES-3": { level: "EX|ES-3", basePay: 38700, annualIncrement: 775, maxPay: 50325 },
  EX: { level: "EX", basePay: 54575, annualIncrement: 1090, maxPay: 70925 },
  P1: { level: "P1", basePay: 36570, annualIncrement: 735, maxPay: 47595 },
  P2: { level: "P2", basePay: 32300, annualIncrement: 650, maxPay: 42050 },
  SS1: { level: "SS1", basePay: 32300, annualIncrement: 650, maxPay: 42050 },
  P3: { level: "P3", basePay: 28315, annualIncrement: 570, maxPay: 36865 },
  SS2: { level: "SS2", basePay: 28315, annualIncrement: 570, maxPay: 36865 },
  P4: { level: "P4", basePay: 25220, annualIncrement: 505, maxPay: 32795 },
  SS3: { level: "SS3", basePay: 25220, annualIncrement: 505, maxPay: 32795 },
  P5: { level: "P5", basePay: 20645, annualIncrement: 415, maxPay: 26870 },
  SS4: { level: "SS4", basePay: 20645, annualIncrement: 415, maxPay: 26870 },
  S1: { level: "S1", basePay: 19970, annualIncrement: 400, maxPay: 25970 },
  S2: { level: "S2", basePay: 18095, annualIncrement: 365, maxPay: 23570 },
  S3: { level: "S3", basePay: 16535, annualIncrement: 335, maxPay: 21560 },
  S4: { level: "S4", basePay: 14675, annualIncrement: 295, maxPay: 19100 },
  S5: { level: "S5", basePay: 13575, annualIncrement: 275, maxPay: 17700 },
  O1: { level: "O1", basePay: 13300, annualIncrement: 270, maxPay: 17350 },
  O2: { level: "O2", basePay: 12495, annualIncrement: 250, maxPay: 16245 },
  O3: { level: "O3", basePay: 11355, annualIncrement: 230, maxPay: 14805 },
  O4: { level: "O4", basePay: 10550, annualIncrement: 215, maxPay: 13775 },
  GSP: { level: "GSP", basePay: 10505, annualIncrement: 210, maxPay: 13655 },
  ESP: { level: "ESP", basePay: 9450, annualIncrement: 190, maxPay: 12300 },
  "GSC-I": { level: "GSC-I", basePay: 8080, annualIncrement: 160, maxPay: 10480 },
  "GSC-II": { level: "GSC-II", basePay: 7695, annualIncrement: 155, maxPay: 10020 },
};

/**
 * Look up a pay scale entry by position level string.
 * Returns undefined if the level is not recognised.
 */
export function lookupPayScale(level: string | undefined): PayScaleEntry | undefined {
  if (!level) return undefined;
  return CIVIL_SERVICE_PAY_SCALE[level];
}

/**
 * Compute current basic pay given a level and years of service.
 * Caps at the level's maxPay ceiling.
 */
export function computeBasicPay(level: string | undefined, yearsOfService = 0): number {
  const entry = lookupPayScale(level);
  if (!entry) return 0;
  const projected = entry.basePay + entry.annualIncrement * Math.max(0, yearsOfService);
  return Math.min(projected, entry.maxPay);
}
