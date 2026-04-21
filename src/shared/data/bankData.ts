/**
 * Bhutan Banking Data - Banks and Branch Hierarchy
 * Source: Royal Monetary Authority of Bhutan (RMA), BFSC Codes, Bank of Bhutan Branch Finder
 *
 * Banks regulated by RMA:
 *   1. Bank of Bhutan (BOBL) - est. 1968, ~46 branches
 *   2. Bhutan National Bank (BNBL) - est. 1997, ~22 branches
 *   3. Bhutan Development Bank Limited (BDBL) - est. 1988, ~33 branches
 *   4. T Bank Limited (TBNK) - est. 2010
 *   5. Druk PNB Bank Limited (DPNBL) - est. 2010, ~7 branches
 *   6. DK Bank (Druk Holding) - digital/development bank
 */

export interface BranchEntry {
  code: string;
  name: string;
  dzongkhag: string;
  bfscCode: string;
}

export interface BankEntry {
  id: string;
  code: string;
  name: string;
  swift: string;
  /** BFSC prefix used for branch codes, e.g. "BHUB9100" for Bank of Bhutan */
  bfscPrefix: string;
  branches: BranchEntry[];
}

export const bhutanBankHierarchy: BankEntry[] = [
  {
    id: "BOBL",
    code: "01",
    name: "Bank of Bhutan",
    swift: "BHUBBTBT",
    bfscPrefix: "BHUB9100",
    branches: [
      { code: "0101", name: "Thimphu Main Branch", dzongkhag: "Thimphu", bfscCode: "BHUB9100201" },
      { code: "0102", name: "Phuentsholing Branch", dzongkhag: "Chhukha", bfscCode: "BHUB9100202" },
      { code: "0103", name: "Paro Branch", dzongkhag: "Paro", bfscCode: "BHUB9100209" },
      { code: "0104", name: "Gelephu Branch", dzongkhag: "Sarpang", bfscCode: "BHUB9100204" },
      { code: "0105", name: "Mongar Branch", dzongkhag: "Mongar", bfscCode: "BHUB9100205" },
      { code: "0106", name: "Trashigang Branch", dzongkhag: "Trashigang", bfscCode: "BHUB9100206" },
      { code: "0107", name: "Samdrup Jongkhar Branch", dzongkhag: "Samdrup Jongkhar", bfscCode: "BHUB9100207" },
      { code: "0108", name: "Wangdue Phodrang Branch", dzongkhag: "Wangdue Phodrang", bfscCode: "BHUB9100208" },
      { code: "0109", name: "Bumthang Branch", dzongkhag: "Bumthang", bfscCode: "BHUB9100223" },
      { code: "0110", name: "Trongsa Branch", dzongkhag: "Trongsa", bfscCode: "BHUB9100210" },
      { code: "0111", name: "Punakha Branch", dzongkhag: "Punakha", bfscCode: "BHUB9100211" },
      { code: "0112", name: "Haa Branch", dzongkhag: "Haa", bfscCode: "BHUB9100212" },
      { code: "0113", name: "Samtse Branch", dzongkhag: "Samtse", bfscCode: "BHUB9100213" },
      { code: "0114", name: "Tsimasham Branch", dzongkhag: "Chhukha", bfscCode: "BHUB9100214" },
      { code: "0115", name: "Damphu Branch", dzongkhag: "Tsirang", bfscCode: "BHUB9100215" },
      { code: "0116", name: "Zhemgang Branch", dzongkhag: "Zhemgang", bfscCode: "BHUB9100216" },
      { code: "0117", name: "Lhuentse Branch", dzongkhag: "Lhuentse", bfscCode: "BHUB9100217" },
      { code: "0118", name: "Gomtu Branch", dzongkhag: "Samtse", bfscCode: "BHUB9100218" },
      { code: "0119", name: "Gedu Branch", dzongkhag: "Chhukha", bfscCode: "BHUB9100219" },
      { code: "0120", name: "Dagana Branch", dzongkhag: "Dagana", bfscCode: "BHUB9100220" },
      { code: "0121", name: "Gasa Branch", dzongkhag: "Gasa", bfscCode: "BHUB9100221" },
      { code: "0122", name: "Pema Gatshel Branch", dzongkhag: "Pema Gatshel", bfscCode: "BHUB9100222" },
      { code: "0123", name: "Trashiyangtse Branch", dzongkhag: "Trashiyantse", bfscCode: "BHUB9100224" },
      { code: "0124", name: "Sarpang Branch", dzongkhag: "Sarpang", bfscCode: "BHUB9100225" },
      { code: "0125", name: "Kanglung Branch", dzongkhag: "Trashigang", bfscCode: "BHUB9100226" },
      { code: "0126", name: "Nganglam Branch", dzongkhag: "Pema Gatshel", bfscCode: "BHUB9100227" },
      { code: "0127", name: "Thimphu Olakha Branch", dzongkhag: "Thimphu", bfscCode: "BHUB9100228" },
      { code: "0128", name: "Thimphu Babesa Branch", dzongkhag: "Thimphu", bfscCode: "BHUB9100240" },
      { code: "0129", name: "Thimphu Motithang Branch", dzongkhag: "Thimphu", bfscCode: "BHUB9100242" },
      { code: "0130", name: "Phuentsholing Rinchending Branch", dzongkhag: "Chhukha", bfscCode: "BHUB9100229" },
      { code: "0131", name: "Deothang Branch", dzongkhag: "Samdrup Jongkhar", bfscCode: "BHUB9100231" },
      { code: "0132", name: "Samtse Tashichhoeling Branch", dzongkhag: "Samtse", bfscCode: "BHUB9100232" },
      { code: "0133", name: "Khaling Branch", dzongkhag: "Trashigang", bfscCode: "BHUB9100233" },
      { code: "0134", name: "Samdrupcholing Branch", dzongkhag: "Samdrup Jongkhar", bfscCode: "BHUB9100234" },
      { code: "0135", name: "Jomotshangkha Branch", dzongkhag: "Samdrup Jongkhar", bfscCode: "BHUB9100235" },
      { code: "0136", name: "Dorokha Branch", dzongkhag: "Samtse", bfscCode: "BHUB9100236" },
      { code: "0137", name: "Pasakha Branch", dzongkhag: "Chhukha", bfscCode: "BHUB9100237" },
      { code: "0138", name: "Bajo Branch", dzongkhag: "Wangdue Phodrang", bfscCode: "BHUB9100238" },
      { code: "0139", name: "Lobesa Branch", dzongkhag: "Punakha", bfscCode: "BHUB9100239" },
      { code: "0140", name: "Thimphu Dechencholing Branch", dzongkhag: "Thimphu", bfscCode: "BHUB9100243" },
      { code: "0141", name: "Phuentsholing Town Branch", dzongkhag: "Chhukha", bfscCode: "BHUB9100241" },
      { code: "0142", name: "Gelephu Jigmeling Branch", dzongkhag: "Sarpang", bfscCode: "BHUB9100245" },
      { code: "0143", name: "Thimphu Changzamtog Branch", dzongkhag: "Thimphu", bfscCode: "BHUB9100246" },
      { code: "0144", name: "Rangjung Branch", dzongkhag: "Trashigang", bfscCode: "BHUB9100247" },
      { code: "0145", name: "Panbang Branch", dzongkhag: "Zhemgang", bfscCode: "BHUB9100249" },
      { code: "0146", name: "Tingtibi Branch", dzongkhag: "Zhemgang", bfscCode: "BHUB9100250" }
    ]
  },
  {
    id: "BNBL",
    code: "02",
    name: "Bhutan National Bank",
    swift: "BNBTBTBT",
    bfscPrefix: "BNBT9100",
    branches: [
      { code: "0201", name: "Thimphu Main Branch", dzongkhag: "Thimphu", bfscCode: "BNBT9100301" },
      { code: "0202", name: "Phuentsholing Branch", dzongkhag: "Chhukha", bfscCode: "BNBT9100309" },
      { code: "0203", name: "Paro Branch", dzongkhag: "Paro", bfscCode: "BNBT9100304" },
      { code: "0204", name: "Mongar Branch", dzongkhag: "Mongar", bfscCode: "BNBT9100321" },
      { code: "0205", name: "Gelephu Branch", dzongkhag: "Sarpang", bfscCode: "BNBT9100313" },
      { code: "0206", name: "Wangdue Phodrang Branch", dzongkhag: "Wangdue Phodrang", bfscCode: "BNBT9100306" },
      { code: "0207", name: "Bumthang Branch", dzongkhag: "Bumthang", bfscCode: "BNBT9100323" },
      { code: "0208", name: "Trashigang Branch", dzongkhag: "Trashigang", bfscCode: "BNBT9100324" },
      { code: "0209", name: "Samdrup Jongkhar Branch", dzongkhag: "Samdrup Jongkhar", bfscCode: "BNBT9100319" },
      { code: "0210", name: "Samtse Branch", dzongkhag: "Samtse", bfscCode: "BNBT9100311" },
      { code: "0211", name: "Thimphu Olakha Branch", dzongkhag: "Thimphu", bfscCode: "BNBT9100328" },
      { code: "0212", name: "Gomtu Branch", dzongkhag: "Samtse", bfscCode: "BNBT9100327" },
      { code: "0213", name: "Tsirang Branch", dzongkhag: "Tsirang", bfscCode: "BNBT9100315" },
      { code: "0214", name: "Trongsa Branch", dzongkhag: "Trongsa", bfscCode: "BNBT9100314" },
      { code: "0215", name: "Punakha Branch", dzongkhag: "Punakha", bfscCode: "BNBT9100316" },
      { code: "0216", name: "Lhuentse Branch", dzongkhag: "Lhuentse", bfscCode: "BNBT9100325" },
      { code: "0217", name: "Haa Branch", dzongkhag: "Haa", bfscCode: "BNBT9100317" },
      { code: "0218", name: "Dagana Branch", dzongkhag: "Dagana", bfscCode: "BNBT9100318" },
      { code: "0219", name: "Kanglung Branch", dzongkhag: "Trashigang", bfscCode: "BNBT9100322" },
      { code: "0220", name: "Phuentsholing Toribari Branch", dzongkhag: "Chhukha", bfscCode: "BNBT9100329" },
      { code: "0221", name: "Thimphu Babesa Branch", dzongkhag: "Thimphu", bfscCode: "BNBT9100330" },
      { code: "0222", name: "Zhemgang Branch", dzongkhag: "Zhemgang", bfscCode: "BNBT9100326" },
      { code: "0223", name: "Corporate Branch Thimphu", dzongkhag: "Thimphu", bfscCode: "BNBT9100302" }
    ]
  },
  {
    id: "BDBL",
    code: "03",
    name: "Bhutan Development Bank Limited",
    swift: "BDEABTBT",
    bfscPrefix: "BHDE9100",
    branches: [
      { code: "0301", name: "Thimphu Main Branch", dzongkhag: "Thimphu", bfscCode: "BHDE9100601" },
      { code: "0302", name: "Phuentsholing Branch", dzongkhag: "Chhukha", bfscCode: "BHDE9100602" },
      { code: "0303", name: "Paro Branch", dzongkhag: "Paro", bfscCode: "BHDE9100603" },
      { code: "0304", name: "Mongar Branch", dzongkhag: "Mongar", bfscCode: "BHDE9100604" },
      { code: "0305", name: "Gelephu Branch", dzongkhag: "Sarpang", bfscCode: "BHDE9100605" },
      { code: "0306", name: "Trashigang Branch", dzongkhag: "Trashigang", bfscCode: "BHDE9100606" },
      { code: "0307", name: "Samdrup Jongkhar Branch", dzongkhag: "Samdrup Jongkhar", bfscCode: "BHDE9100607" },
      { code: "0308", name: "Wangdue Phodrang Branch", dzongkhag: "Wangdue Phodrang", bfscCode: "BHDE9100608" },
      { code: "0309", name: "Bumthang Branch", dzongkhag: "Bumthang", bfscCode: "BHDE9100609" },
      { code: "0310", name: "Trongsa Branch", dzongkhag: "Trongsa", bfscCode: "BHDE9100610" },
      { code: "0311", name: "Punakha Branch", dzongkhag: "Punakha", bfscCode: "BHDE9100611" },
      { code: "0312", name: "Haa Branch", dzongkhag: "Haa", bfscCode: "BHDE9100613" },
      { code: "0313", name: "Samtse Branch", dzongkhag: "Samtse", bfscCode: "BHDE9100614" },
      { code: "0314", name: "Dagana Branch", dzongkhag: "Dagana", bfscCode: "BHDE9100618" },
      { code: "0315", name: "Lhuentse Branch", dzongkhag: "Lhuentse", bfscCode: "BHDE9100625" },
      { code: "0316", name: "Tsirang Branch", dzongkhag: "Tsirang", bfscCode: "BHDE9100615" },
      { code: "0317", name: "Zhemgang Branch", dzongkhag: "Zhemgang", bfscCode: "BHDE9100616" },
      { code: "0318", name: "Pema Gatshel Branch", dzongkhag: "Pema Gatshel", bfscCode: "BHDE9100617" },
      { code: "0319", name: "Trashiyangtse Branch", dzongkhag: "Trashiyantse", bfscCode: "BHDE9100619" },
      { code: "0320", name: "Sarpang Branch", dzongkhag: "Sarpang", bfscCode: "BHDE9100620" },
      { code: "0321", name: "Gasa Branch", dzongkhag: "Gasa", bfscCode: "BHDE9100621" },
      { code: "0322", name: "Chhukha Branch", dzongkhag: "Chhukha", bfscCode: "BHDE9100612" },
      { code: "0323", name: "Lhamoi Dzingkha Branch", dzongkhag: "Dagana", bfscCode: "BHDE9100642" },
      { code: "0324", name: "Nganglam Branch", dzongkhag: "Pema Gatshel", bfscCode: "BHDE9100622" },
      { code: "0325", name: "Kanglung Branch", dzongkhag: "Trashigang", bfscCode: "BHDE9100623" },
      { code: "0326", name: "Khaling Branch", dzongkhag: "Trashigang", bfscCode: "BHDE9100624" },
      { code: "0327", name: "Deothang Branch", dzongkhag: "Samdrup Jongkhar", bfscCode: "BHDE9100626" },
      { code: "0328", name: "Gomtu Branch", dzongkhag: "Samtse", bfscCode: "BHDE9100627" },
      { code: "0329", name: "Tsimasham Branch", dzongkhag: "Chhukha", bfscCode: "BHDE9100628" },
      { code: "0330", name: "Tingtibi Branch", dzongkhag: "Zhemgang", bfscCode: "BHDE9100629" },
      { code: "0331", name: "Jomotshangkha Branch", dzongkhag: "Samdrup Jongkhar", bfscCode: "BHDE9100630" },
      { code: "0332", name: "Gedu Branch", dzongkhag: "Chhukha", bfscCode: "BHDE9100631" },
      { code: "0333", name: "Dorokha Branch", dzongkhag: "Samtse", bfscCode: "BHDE9100632" }
    ]
  },
  {
    id: "TBNK",
    code: "04",
    name: "T Bank Limited",
    swift: "TBBTBTBT",
    bfscPrefix: "TBBT9100",
    branches: [
      { code: "0401", name: "Thimphu Main Branch", dzongkhag: "Thimphu", bfscCode: "TBBT9100401" },
      { code: "0402", name: "Phuentsholing Branch", dzongkhag: "Chhukha", bfscCode: "TBBT9100402" },
      { code: "0403", name: "Paro Branch", dzongkhag: "Paro", bfscCode: "TBBT9100403" },
      { code: "0404", name: "Gelephu Branch", dzongkhag: "Sarpang", bfscCode: "TBBT9100404" },
      { code: "0405", name: "Wangdue Phodrang Branch", dzongkhag: "Wangdue Phodrang", bfscCode: "TBBT9100405" },
      { code: "0406", name: "Mongar Branch", dzongkhag: "Mongar", bfscCode: "TBBT9100406" },
      { code: "0407", name: "Trashigang Branch", dzongkhag: "Trashigang", bfscCode: "TBBT9100407" },
      { code: "0408", name: "Thimphu Olakha Branch", dzongkhag: "Thimphu", bfscCode: "TBBT9100408" },
      { code: "0409", name: "Samtse Branch", dzongkhag: "Samtse", bfscCode: "TBBT9100409" },
      { code: "0410", name: "Bumthang Branch", dzongkhag: "Bumthang", bfscCode: "TBBT9100410" },
      { code: "0411", name: "Samdrup Jongkhar Branch", dzongkhag: "Samdrup Jongkhar", bfscCode: "TBBT9100411" }
    ]
  },
  {
    id: "DPNBL",
    code: "05",
    name: "Druk PNB Bank Limited",
    swift: "PUNBBTBT",
    bfscPrefix: "PUNB9100",
    branches: [
      { code: "0501", name: "Thimphu Main Branch", dzongkhag: "Thimphu", bfscCode: "PUNB9100501" },
      { code: "0502", name: "Phuentsholing Branch", dzongkhag: "Chhukha", bfscCode: "PUNB9100502" },
      { code: "0503", name: "Paro Branch", dzongkhag: "Paro", bfscCode: "PUNB9100503" },
      { code: "0504", name: "Gelephu Branch", dzongkhag: "Sarpang", bfscCode: "PUNB9100504" },
      { code: "0505", name: "Wangdue Phodrang Branch", dzongkhag: "Wangdue Phodrang", bfscCode: "PUNB9100505" },
      { code: "0506", name: "Trongsa Branch", dzongkhag: "Trongsa", bfscCode: "PUNB9100506" },
      { code: "0507", name: "Samtse Branch", dzongkhag: "Samtse", bfscCode: "PUNB9100507" }
    ]
  },
  {
    id: "DKBNK",
    code: "06",
    name: "DK Bank",
    swift: "",
    bfscPrefix: "DKBK9100",
    branches: [
      { code: "0601", name: "Thimphu Main Branch", dzongkhag: "Thimphu", bfscCode: "DKBK9100701" },
      { code: "0602", name: "Phuentsholing Branch", dzongkhag: "Chhukha", bfscCode: "DKBK9100702" }
    ]
  }
];

// ─── Helper Functions ───

/** Get all bank names as "code - name" */
export function getAllBanks(): string[] {
  return bhutanBankHierarchy.map(b => `${b.code} - ${b.name}`);
}

/** Find bank by value (with or without code prefix) */
function findBank(bankValue: string): BankEntry | undefined {
  return bhutanBankHierarchy.find(b =>
    b.name === bankValue || `${b.code} - ${b.name}` === bankValue
  );
}

/** Get branch names for a given bank. Returns "bfscCode - name". */
export function getBranchesForBank(bankValue: string): string[] {
  const bank = findBank(bankValue);
  if (!bank) return [];
  return bank.branches.map(br => `${br.bfscCode} - ${br.name}`);
}

/** Get branch codes for a given bank. Returns "bfscCode - name" format. */
export function getBranchCodesForBank(bankValue: string): string[] {
  return getBranchesForBank(bankValue);
}

/** Get all bank names for master data display */
export function getAllBanksMasterData(): string[] {
  return bhutanBankHierarchy.map(b => `${b.code} - ${b.name}`);
}

/** Get all branch names for master data display (all banks combined). Shows "bfscCode - branchName (bankId)" */
export function getAllBranchesMasterData(): string[] {
  return bhutanBankHierarchy.flatMap(b =>
    b.branches.map(br => `${br.bfscCode} - ${br.name} (${b.id})`)
  );
}

/** Get all unique branch codes for master data display. Shows "bfscCode - branchName" */
export function getAllBranchCodesMasterData(): string[] {
  return bhutanBankHierarchy.flatMap(b =>
    b.branches.map(br => `${br.bfscCode} - ${br.name}`)
  );
}

/** Find bank by BFSC prefix */
export function findBankByBfscPrefix(bfscCode: string): BankEntry | undefined {
  return bhutanBankHierarchy.find(b => bfscCode.startsWith(b.bfscPrefix));
}

/** Get the BFSC prefix for a bank */
export function getBfscPrefixForBank(bankValue: string): string {
  const bank = findBank(bankValue);
  return bank?.bfscPrefix ?? "";
}
