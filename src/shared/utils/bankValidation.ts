/* ═══════════════════════════════════════════════════════════════════════════
   Bank Validation Utility — IFMIS
   ─────────────────────────────────
   Comprehensive bank detail validation against the bhutanBankHierarchy
   master data. Every form that captures bank details (Payroll, Muster Roll,
   Sitting Fee, Contractor, Vendor) should use these helpers to ensure
   bank name, branch, and account number are valid before persisting.

   Validation layers:
     1. Bank name  — must exist in bhutanBankHierarchy
     2. Branch     — must belong to the selected bank
     3. Account No — format validation (length, prefix, numeric)
     4. CBS lookup — simulated Core Banking System verification
   ═══════════════════════════════════════════════════════════════════════════ */

import {
  bhutanBankHierarchy,
  type BankEntry,
  type BranchEntry,
} from "../data/bankData";

/* ─── Types ───────────────────────────────────────────────────────────────── */

export interface BankValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  /** Resolved bank entry (when bank name is valid) */
  bank: BankEntry | null;
  /** Resolved branch entry (when branch is valid for the bank) */
  branch: BranchEntry | null;
  /** Whether CBS lookup passed (simulated) */
  cbsVerified: boolean;
}

export interface BankFieldErrors {
  bankName?: string;
  bankBranch?: string;
  bankAccountNo?: string;
}

/* ─── Constants ───────────────────────────────────────────────────────────── */

/** Bhutanese bank account numbers are typically 9-16 digits */
const ACCOUNT_NO_MIN_LENGTH = 9;
const ACCOUNT_NO_MAX_LENGTH = 16;

/** Account number must be numeric (some banks allow hyphens) */
const ACCOUNT_NO_PATTERN = /^[0-9]{9,16}$/;
const ACCOUNT_NO_PATTERN_RELAXED = /^[0-9-]{9,20}$/;

/* ─── Bank Lookup Helpers ─────────────────────────────────────────────────── */

/** Find a bank by name (exact or partial match). */
export function findBankByName(bankName: string): BankEntry | null {
  if (!bankName) return null;
  const lower = bankName.toLowerCase().trim();
  return (
    bhutanBankHierarchy.find(
      (b) =>
        b.name.toLowerCase() === lower ||
        b.id.toLowerCase() === lower ||
        `${b.code} - ${b.name}`.toLowerCase() === lower
    ) ?? null
  );
}

/** Get all valid bank names (for dropdown options). */
export function getValidBankNames(): string[] {
  return bhutanBankHierarchy.map((b) => b.name);
}

/** Get branches for a given bank name (for dynamic branch dropdown). */
export function getBranchesForBankName(bankName: string): BranchEntry[] {
  const bank = findBankByName(bankName);
  if (!bank) return [];
  return bank.branches;
}

/** Get branch display strings for dropdown. */
export function getBranchOptionsForBank(bankName: string): Array<{ value: string; label: string; bfsc: string }> {
  const branches = getBranchesForBankName(bankName);
  return branches.map((br) => ({
    value: br.name,
    label: `${br.name} (${br.dzongkhag})`,
    bfsc: br.bfscCode,
  }));
}

/** Find a branch by name within a specific bank. */
export function findBranchInBank(bankName: string, branchName: string): BranchEntry | null {
  if (!bankName || !branchName) return null;
  const bank = findBankByName(bankName);
  if (!bank) return null;
  const lower = branchName.toLowerCase().trim();
  return (
    bank.branches.find(
      (br) =>
        br.name.toLowerCase() === lower ||
        br.bfscCode.toLowerCase() === lower ||
        `${br.bfscCode} - ${br.name}`.toLowerCase() === lower
    ) ?? null
  );
}

/* ─── Validation Functions ────────────────────────────────────────────────── */

/** Validate a single bank name. */
export function validateBankName(bankName: string): { valid: boolean; error?: string; bank: BankEntry | null } {
  if (!bankName || bankName.trim() === "") {
    return { valid: false, error: "Bank name is required", bank: null };
  }
  const bank = findBankByName(bankName);
  if (!bank) {
    return {
      valid: false,
      error: `"${bankName}" is not a recognised Bhutanese bank. Please select from the list.`,
      bank: null,
    };
  }
  return { valid: true, bank };
}

/** Validate a branch against a specific bank. */
export function validateBranch(
  bankName: string,
  branchName: string
): { valid: boolean; error?: string; branch: BranchEntry | null } {
  if (!branchName || branchName.trim() === "") {
    return { valid: false, error: "Branch is required", branch: null };
  }
  const bankResult = validateBankName(bankName);
  if (!bankResult.valid) {
    return { valid: false, error: "Cannot validate branch — invalid bank", branch: null };
  }
  const branch = findBranchInBank(bankName, branchName);
  if (!branch) {
    return {
      valid: false,
      error: `"${branchName}" is not a valid branch of ${bankName}. Please select a valid branch.`,
      branch: null,
    };
  }
  return { valid: true, branch };
}

/** Validate an account number format. */
export function validateAccountNumber(
  accountNo: string,
  bankName?: string
): { valid: boolean; error?: string; warnings: string[] } {
  const warnings: string[] = [];

  if (!accountNo || accountNo.trim() === "") {
    return { valid: false, error: "Account number is required", warnings };
  }

  const cleaned = accountNo.replace(/[\s-]/g, "");

  if (!/^[0-9]+$/.test(cleaned)) {
    return {
      valid: false,
      error: "Account number must contain only digits",
      warnings,
    };
  }

  if (cleaned.length < ACCOUNT_NO_MIN_LENGTH) {
    return {
      valid: false,
      error: `Account number must be at least ${ACCOUNT_NO_MIN_LENGTH} digits (got ${cleaned.length})`,
      warnings,
    };
  }

  if (cleaned.length > ACCOUNT_NO_MAX_LENGTH) {
    return {
      valid: false,
      error: `Account number must be at most ${ACCOUNT_NO_MAX_LENGTH} digits (got ${cleaned.length})`,
      warnings,
    };
  }

  /* Bank-specific prefix validation */
  if (bankName) {
    const bank = findBankByName(bankName);
    if (bank) {
      /* Some banks use their code as a prefix — optional advisory check */
      if (bank.code === "01" && !cleaned.startsWith("2")) {
        warnings.push("Bank of Bhutan accounts typically start with 2");
      }
    }
  }

  return { valid: true, warnings };
}

/** Full validation of all bank fields. */
export function validateBankDetails(
  bankName: string,
  branchName: string,
  accountNo: string
): BankValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  /* 1. Validate bank */
  const bankResult = validateBankName(bankName);
  if (!bankResult.valid && bankResult.error) {
    errors.push(bankResult.error);
  }

  /* 2. Validate branch (only if bank is valid) */
  let branchResult: ReturnType<typeof validateBranch> = { valid: false, branch: null };
  if (bankResult.valid) {
    branchResult = validateBranch(bankName, branchName);
    if (!branchResult.valid && branchResult.error) {
      errors.push(branchResult.error);
    }
  }

  /* 3. Validate account number */
  const acctResult = validateAccountNumber(accountNo, bankName);
  if (!acctResult.valid && acctResult.error) {
    errors.push(acctResult.error);
  }
  warnings.push(...acctResult.warnings);

  /* 4. Simulated CBS verification */
  const cbsVerified = errors.length === 0;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    bank: bankResult.bank,
    branch: branchResult.branch,
    cbsVerified,
  };
}

/** Get field-level errors for inline form validation. */
export function getFieldErrors(
  bankName: string,
  branchName: string,
  accountNo: string
): BankFieldErrors {
  const fe: BankFieldErrors = {};

  if (bankName) {
    const br = validateBankName(bankName);
    if (!br.valid) fe.bankName = br.error;
  }

  if (branchName && bankName) {
    const br = validateBranch(bankName, branchName);
    if (!br.valid) fe.bankBranch = br.error;
  }

  if (accountNo) {
    const ar = validateAccountNumber(accountNo, bankName);
    if (!ar.valid) fe.bankAccountNo = ar.error;
  }

  return fe;
}

/* ─── CBS Verification (Simulated) ────────────────────────────────────────── */

export interface CbsVerificationResult {
  verified: boolean;
  accountHolderName?: string;
  accountStatus?: "active" | "dormant" | "closed";
  message: string;
}

/**
 * Simulate a Core Banking System (CBS) verification call.
 * In production this would call the bank's CBS API to confirm the
 * account exists, is active, and the holder name matches.
 */
export async function verifyCbs(
  bankName: string,
  branchName: string,
  accountNo: string,
  expectedName?: string
): Promise<CbsVerificationResult> {
  /* Simulate network delay */
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));

  /* Basic field validation first */
  const validation = validateBankDetails(bankName, branchName, accountNo);
  if (!validation.valid) {
    return {
      verified: false,
      message: `CBS rejected: ${validation.errors.join("; ")}`,
    };
  }

  /* Simulated: 95% pass rate for demo purposes */
  const hash = accountNo.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  if (hash % 20 === 0) {
    return {
      verified: false,
      accountStatus: "dormant",
      message: "CBS: Account is dormant. Please contact the bank to reactivate.",
    };
  }

  return {
    verified: true,
    accountHolderName: expectedName ?? "Account Holder",
    accountStatus: "active",
    message: `CBS: Account verified with ${validation.bank?.name} — ${validation.branch?.name}`,
  };
}
