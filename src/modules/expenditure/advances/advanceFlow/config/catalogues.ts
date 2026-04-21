/* Fallback catalogues for Advances wizard — used when master data is unavailable */

export const ADVANCE_CATEGORIES_FALLBACK = [
  "Mobilization Advance",
  "Secured Advance",
  "Material Advance",
];

export const NON_CONTRACT_ADVANCE_CATEGORIES_FALLBACK = [
  "Personal Advance",
  "Official Advance",
  "Imprest Advance",
];

/* MOCK_EMPLOYEES — each employee carries the UCoA Organization codes that drive
   Budget Code filtering on Step 1 of Non-Contractual Advances:
     ministryCode  → 2-digit Level-1 (e.g. "19" Ministry of Infrastructure & Transport)
     orgCode       → 4-digit Level-2 (e.g. "1904" Department of Infrastructure Development)
     ministryName  → human label for ministry tag display
   Source: RGOB UCoA (Feb 2026) — Organization - Ministries sheet. */
export const MOCK_EMPLOYEES = [
  { id: "EMP-11904001234", name: "Tshering Dorji", cid: "11904001234", designation: "Executive Engineer", department: "Department of Infrastructure Development", ministryCode: "19", orgCode: "1904", ministryName: "Ministry of Infrastructure and Transport" },
  { id: "EMP-12003003456", name: "Karma Wangmo", cid: "12003003456", designation: "Program Officer", department: "Department of Health Services", ministryCode: "20", orgCode: "2003", ministryName: "Ministry of Health" },
  { id: "EMP-11606005678", name: "Pema Tshomo", cid: "11606005678", designation: "Finance Officer", department: "Department of Treasury and Accounts", ministryCode: "16", orgCode: "1606", ministryName: "Ministry of Finance" },
  { id: "EMP-12203007890", name: "Ugyen Namgay", cid: "12203007890", designation: "Education Officer", department: "Department of School Education", ministryCode: "22", orgCode: "2203", ministryName: "Ministry of Education and Skills Development" },
  { id: "EMP-11706009012", name: "Sangay Choden", cid: "11706009012", designation: "Agriculture Officer", department: "Department of Agriculture", ministryCode: "17", orgCode: "1706", ministryName: "Ministry of Agriculture and Livestock" },
  { id: "EMP-12203007890", name: "Dorji Wangmo", cid: "12203007890", designation: "Inspector", department: "Department of School Education", ministryCode: "22", orgCode: "2203", ministryName: "Ministry of Education and Skills Development" },
  { id: "EMP-11805002022", name: "Tenzin Dorji", cid: "11805002022", designation: "Forest Ranger", department: "Department of Forest and Park Services", ministryCode: "18", orgCode: "1805", ministryName: "Ministry of Energy and Natural Resources" },
];
