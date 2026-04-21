/* Barrel for the Contractor Registration feature.
   The main page component still lives at
   `../ContractorRegistrationPage.tsx` and imports helpers from here. */
export * from "./types";
export * from "./ui/styleTokens";
export { DocumentUploadField } from "./ui/DocumentUploadField";
export { saveDocsToStorage } from "./state/docStorage";
export { saveDraft, loadDraft, clearDraft } from "./state/draftStorage";
export {
  simulateBulkPrefill,
  simulateSystemPrefill,
  buildPrefilledBankRow,
  buildPrefilledContactRow,
  simulateBankAutoPopulate,
  simulateCbsVerify,
} from "./state/prefillSimulators";
export { initialForm, makeContractorId, createBankRow, createContactRow } from "./state/formFactories";
