import { MasterDataGroup } from "../masterData";
import {
  getAllBanksMasterData,
  getAllBranchesMasterData,
  getAllBranchCodesMasterData
} from "../bankData";

export const bankGroups: MasterDataGroup[] = [
  {
    id: "bank-name",
    title: "Bank Name",
    description: "LoV 3.2 / RMA-regulated",
    values: getAllBanksMasterData()
  },
  {
    id: "bank-branch-code",
    title: "Bank Branch Code",
    description: "LoV 3.3 / master-data-driven",
    values: getAllBranchCodesMasterData()
  },
  {
    id: "bank-branch-name",
    title: "Bank Branch Name",
    description: "LoV 3.4 / master-data-driven",
    values: getAllBranchesMasterData()
  },
  {
    id: "account-status",
    title: "Account Status",
    description: "LoV 3.5",
    values: ["Active", "Inactive", "Suspended", "Blocked"]
  },
  {
    id: "currency-type",
    title: "Currency Type",
    description: "LoV 3.6 — canonical currency list. Shared across every module (Contract, Invoice, SoE, FI, Debt, Subscriptions, Contractor, Closure). No module-specific currency LoV — declare once, use everywhere.",
    values: ["BTN", "INR", "USD", "EUR", "GBP", "CHF", "CNY", "JPY", "SGD", "SDR"]
  },
  {
    id: "account-type",
    title: "Account Type",
    description: "Derived from LoV bank-account section",
    values: ["Savings Bank Accounts", "Current Deposit Account", "Foreign Account", "Overdraft Account", "SBA (Salary Based Account)"]
  },
  {
    id: "bank-category",
    title: "Bank Category",
    description: "LoV 4.1 / master-data-driven",
    values: ["Domestic", "International", "Government", "Commercial"]
  },
  {
    id: "account-category",
    title: "Account Category",
    description: "DD 11.7 — Domestic or International account",
    values: ["Domestic", "International"]
  },
  {
    id: "advance-bank-guarantee-bank",
    title: "Bank Guarantee Issuing Bank",
    description: "LoV 3.2 / RMA-regulated banks for advance bank guarantees",
    values: [
      "Bank of Bhutan",
      "Bhutan National Bank",
      "T Bank Limited",
      "Bhutan Development Bank",
      "Druk PNB Bank"
    ]
  },
  {
    id: "financial-institution",
    title: "Financial Institution",
    description: "PRN 3.3.1 — RMA-licensed financial institutions offering bill discounting",
    values: [
      "Bank of Bhutan",
      "Bhutan National Bank",
      "Druk PNB Bank",
      "T Bank Limited",
      "Bhutan Development Bank",
      "RICB Limited"
    ]
  }
];
