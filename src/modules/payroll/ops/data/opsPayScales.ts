/**
 * OPS Pay Scale Engine — Other Public Servants
 * Derived from Payroll SRS V1 LoVBasedOnCategory sheet
 * All pay scales in Bhutanese Ngultrum (Nu)
 */

export interface OpsPayScaleEntry {
  positionTitle: string;
  minPay: number;
  increment: number;
  maxPay: number;
  /** Notes: e.g., maps to civil service level */
  notes?: string;
}

export interface OpsCategory {
  id: string;
  name: string;
  description: string;
  /** OPS data source — Interfacing system (RBP HRMS, Judiciary HRIS, Parliament HR,
   *  RUB HRIS, LG Portals, NA/NC Secretariat), Manual Entry, or both.
   *  OPS is independent of ZESt — the legacy "zest" value means "interface-fed". */
  dataSource: "zest" | "manual" | "both";
  positions: OpsPayScaleEntry[];
}

/**
 * Constitutional Bodies
 * Highest judicial and electoral authority positions
 */
const CONSTITUTIONAL_BODIES: OpsCategory = {
  id: "constitutional-bodies",
  name: "Constitutional Bodies Post Holder",
  description: "Auditor General, Chairperson, Commissioner and Audit post holders of Constitutional Bodies",
  dataSource: "manual",
  positions: [
    { positionTitle: "Auditor General", minPay: 84180, increment: 1685, maxPay: 92605 },
    { positionTitle: "Chairperson", minPay: 84180, increment: 1685, maxPay: 92605 },
    { positionTitle: "Commissioner", minPay: 84180, increment: 1685, maxPay: 92605 },
    {
      positionTitle: "Audit Officer",
      minPay: 0,
      increment: 0,
      maxPay: 0,
      notes: "Maps to Civil Service P2 level"
    },
    {
      positionTitle: "Audit Specialist",
      minPay: 0,
      increment: 0,
      maxPay: 0,
      notes: "Maps to Civil Service P3 level"
    },
    {
      positionTitle: "Auditor I",
      minPay: 0,
      increment: 0,
      maxPay: 0,
      notes: "Maps to Civil Service S1 level"
    },
    {
      positionTitle: "Auditor II",
      minPay: 0,
      increment: 0,
      maxPay: 0,
      notes: "Maps to Civil Service S2 level"
    },
    {
      positionTitle: "Auditor III",
      minPay: 0,
      increment: 0,
      maxPay: 0,
      notes: "Maps to Civil Service S3 level"
    },
    {
      positionTitle: "Senior Auditor III",
      minPay: 0,
      increment: 0,
      maxPay: 0,
      notes: "Maps to Civil Service SS1 level"
    }
  ]
};

/**
 * Election Commission Bhutan (ECB)
 * Chief Election Commissioner and electoral staff
 */
const ELECTION_COMMISSION_BHUTAN: OpsCategory = {
  id: "ecb",
  name: "ECB",
  description: "Election Commission of Bhutan — Chief Election Commissioner and electoral staff",
  dataSource: "manual",
  positions: [
    { positionTitle: "Chief Election Commissioner", minPay: 84180, increment: 1685, maxPay: 92605 },
    {
      positionTitle: "Election Officer",
      minPay: 0,
      increment: 0,
      maxPay: 0,
      notes: "Maps to Civil Service P2 level"
    },
    {
      positionTitle: "Electoral Assistant",
      minPay: 0,
      increment: 0,
      maxPay: 0,
      notes: "Maps to Civil Service S1 level"
    },
    {
      positionTitle: "Electoral Registration Assistant",
      minPay: 0,
      increment: 0,
      maxPay: 0,
      notes: "Maps to Civil Service O2 level"
    },
    {
      positionTitle: "Electoral Registration Officer",
      minPay: 0,
      increment: 0,
      maxPay: 0,
      notes: "Maps to Civil Service P3 level"
    }
  ]
};

/**
 * Royal University of Bhutan (RUB)
 * Academic and administrative staff on civil service pay scales
 */
const ROYAL_UNIVERSITY_OF_BHUTAN: OpsCategory = {
  id: "rub",
  name: "RUB",
  description: "Royal University of Bhutan — academic and administrative staff on Civil Service pay scales",
  dataSource: "both",
  positions: [
    { positionTitle: "EX/ES-1", minPay: 54575, increment: 1090, maxPay: 70925 },
    { positionTitle: "EX/ES-2", minPay: 45785, increment: 915, maxPay: 59510 },
    { positionTitle: "EX/ES-3", minPay: 38700, increment: 775, maxPay: 50325 },
    { positionTitle: "P1", minPay: 36570, increment: 735, maxPay: 47595 },
    { positionTitle: "P2", minPay: 32300, increment: 650, maxPay: 42050 },
    { positionTitle: "SS1", minPay: 32300, increment: 650, maxPay: 42050 },
    { positionTitle: "P3", minPay: 28315, increment: 570, maxPay: 36865 },
    { positionTitle: "SS2", minPay: 28315, increment: 570, maxPay: 36865 },
    { positionTitle: "P4", minPay: 25220, increment: 505, maxPay: 32795 },
    { positionTitle: "SS3", minPay: 25220, increment: 505, maxPay: 32795 },
    { positionTitle: "P5", minPay: 20645, increment: 415, maxPay: 26870 },
    { positionTitle: "SS4", minPay: 20645, increment: 415, maxPay: 26870 },
    { positionTitle: "S1", minPay: 19970, increment: 400, maxPay: 25970 },
    { positionTitle: "S2", minPay: 18095, increment: 365, maxPay: 23570 },
    { positionTitle: "S3", minPay: 16535, increment: 335, maxPay: 21560 },
    { positionTitle: "S4", minPay: 14675, increment: 295, maxPay: 19100 },
    { positionTitle: "S5", minPay: 13575, increment: 275, maxPay: 17700 },
    { positionTitle: "O1", minPay: 13300, increment: 270, maxPay: 17350 },
    { positionTitle: "O2", minPay: 12495, increment: 250, maxPay: 16245 },
    { positionTitle: "O3", minPay: 11355, increment: 230, maxPay: 14805 },
    { positionTitle: "O4", minPay: 10550, increment: 215, maxPay: 13775 },
    { positionTitle: "GSP", minPay: 10505, increment: 210, maxPay: 13655 },
    { positionTitle: "ESP", minPay: 9450, increment: 190, maxPay: 12300 },
    { positionTitle: "GSC-I", minPay: 8080, increment: 160, maxPay: 10480 },
    { positionTitle: "GSC-II", minPay: 7695, increment: 155, maxPay: 10020 }
  ]
};

/**
 * Foreign Services
 * Diplomatic positions for Bhutan's foreign service
 */
const FOREIGN_SERVICES: OpsCategory = {
  id: "foreign-services",
  name: "Foreign Services",
  description: "Diplomatic and foreign service positions (uses civil service scales + Representative)",
  dataSource: "zest",
  positions: [
    { positionTitle: "Representative (Kutshab)", minPay: 84180, increment: 1685, maxPay: 92605 }
    // Note: Other positions map to civil service scales with minPay/increment/maxPay = 0/0/0
  ]
};

/**
 * Foreign Services (Local Recruit)
 * Local staff posted at foreign stations, paid in different currency denomination
 */
const FOREIGN_SERVICES_LOCAL_RECRUIT: OpsCategory = {
  id: "local-recruits",
  name: "Local Recruits",
  description: "Local Recruits at foreign stations (USD or equivalent currency)",
  dataSource: "manual",
  positions: [
    { positionTitle: "Account Assistant", minPay: 1000, increment: 125, maxPay: 500000 },
    { positionTitle: "ADM Assistant", minPay: 1000, increment: 100, maxPay: 500000 },
    { positionTitle: "Care Taker", minPay: 1000, increment: 90, maxPay: 500000 },
    { positionTitle: "Driver", minPay: 1000, increment: 85, maxPay: 500000 },
    { positionTitle: "Electrician", minPay: 1000, increment: 65, maxPay: 500000 },
    { positionTitle: "First Secretary", minPay: 1000, increment: 60, maxPay: 500000 },
    { positionTitle: "Gardener", minPay: 1000, increment: 85, maxPay: 500000 },
    { positionTitle: "Health Assistant", minPay: 1000, increment: 65, maxPay: 500000 },
    { positionTitle: "Messenger", minPay: 1000, increment: 60, maxPay: 500000 },
    { positionTitle: "Office Assistant", minPay: 1000, increment: 85, maxPay: 500000 },
    { positionTitle: "Poen", minPay: 1000, increment: 65, maxPay: 500000 },
    { positionTitle: "Personal Secretary", minPay: 1000, increment: 60, maxPay: 500000 },
    { positionTitle: "Plumber", minPay: 1000, increment: 85, maxPay: 300000 },
    { positionTitle: "Receptionist", minPay: 1000, increment: 65, maxPay: 300000 },
    { positionTitle: "Second Secretary", minPay: 1000, increment: 60, maxPay: 300000 },
    { positionTitle: "Security Guard", minPay: 1000, increment: 65, maxPay: 500000 },
    { positionTitle: "GSP I", minPay: 1000, increment: 65, maxPay: 500000 },
    { positionTitle: "GSP II", minPay: 1000, increment: 60, maxPay: 500000 },
    { positionTitle: "ESP", minPay: 1000, increment: 60, maxPay: 500000 }
  ]
};

/**
 * Judiciary
 * Supreme Court and High Court judicial positions
 */
const JUDICIARY: OpsCategory = {
  id: "judiciary",
  name: "Judiciary",
  description: "Chief Justice, Drangpon, and related judicial positions",
  dataSource: "manual",
  positions: [
    { positionTitle: "Chief Justice of Bhutan", minPay: 137800, increment: 2755, maxPay: 151575 },
    { positionTitle: "Chief Justice of High Court", minPay: 77535, increment: 1555, maxPay: 93085 },
    { positionTitle: "Drangpon of Supreme Court", minPay: 84180, increment: 1685, maxPay: 101030 },
    { positionTitle: "Drangpons of High Court", minPay: 73845, increment: 1480, maxPay: 88645 },
    { positionTitle: "Justice of Supreme Court", minPay: 73845, increment: 1480, maxPay: 88645 },
    {
      positionTitle: "Justice of High Court",
      minPay: 0,
      increment: 0,
      maxPay: 0,
      notes: "Maps to Civil Service level"
    },
    {
      positionTitle: "Driver IV",
      minPay: 0,
      increment: 0,
      maxPay: 0,
      notes: "Maps to Civil Service level"
    }
  ]
};

/**
 * Local Government
 * Dzongkhag, Gewog, and Thromde administrative positions
 */
const LOCAL_GOVERNMENT: OpsCategory = {
  id: "local-govt",
  name: "Local Government",
  description: "Gup, Mangmi, Thrompon, Gewog and Dzongkhag administrative positions",
  dataSource: "manual",
  positions: [
    { positionTitle: "Driver", minPay: 10550, increment: 215, maxPay: 13775 },
    { positionTitle: "Dzongkhag Thromde Thuemi", minPay: 24780, increment: 500, maxPay: 27280 },
    { positionTitle: "Gewog Administrative Officer (GSP)", minPay: 10505, increment: 210, maxPay: 13655 },
    { positionTitle: "Gewog Care Taker (ESP)", minPay: 9450, increment: 190, maxPay: 12300 },
    { positionTitle: "Geydrung", minPay: 16120, increment: 320, maxPay: 20920 },
    { positionTitle: "Gup", minPay: 33040, increment: 660, maxPay: 36340 },
    { positionTitle: "Mangmi", minPay: 24780, increment: 495, maxPay: 27255 },
    { positionTitle: "Thrompon", minPay: 52195, increment: 1045, maxPay: 57420 },
    { positionTitle: "Tshogpa", minPay: 12155, increment: 245, maxPay: 13380 },
    { positionTitle: "Thromde Thuemi", minPay: 12155, increment: 245, maxPay: 13380 }
  ]
};

/**
 * Parliament
 * Members of National Assembly and National Council
 */
const PARLIAMENT: OpsCategory = {
  id: "parliament",
  name: "Parliamentary",
  description:
    "Prime Minister, Speaker, Cabinet Ministers, and Members of Parliament/National Council",
  dataSource: "manual",
  positions: [
    { positionTitle: "Prime Minister", minPay: 190800, increment: 3815, maxPay: 209875 },
    { positionTitle: "Speaker", minPay: 137800, increment: 2755, maxPay: 151575 },
    { positionTitle: "Chairperson of NC", minPay: 137800, increment: 2755, maxPay: 151575 },
    { positionTitle: "Opposition Leader", minPay: 137800, increment: 2755, maxPay: 151575 },
    { positionTitle: "Cabinet Ministers", minPay: 137800, increment: 2755, maxPay: 151575 },
    { positionTitle: "Deputy Speaker", minPay: 84180, increment: 1685, maxPay: 92605 },
    { positionTitle: "Deputy Chairperson", minPay: 84180, increment: 1685, maxPay: 92605 },
    { positionTitle: "Members of Parliament", minPay: 73845, increment: 1475, maxPay: 81220 }
  ]
};

/**
 * Religious Services
 * Monastic and spiritual leadership positions from Dratshang
 */
const RELIGIOUS_SERVICES: OpsCategory = {
  id: "religious-services",
  name: "Religious Services",
  description: "Monastic and spiritual positions under Dratshang Lhentshog",
  dataSource: "manual",
  positions: [
    { positionTitle: "H.H. the Je Khenpo", minPay: 90000, increment: 1800, maxPay: 126000 },
    { positionTitle: "Je Thrizur", minPay: 30000, increment: 600, maxPay: 45000 },
    { positionTitle: "Drabi Lopen", minPay: 30000, increment: 600, maxPay: 45000 },
    { positionTitle: "Yangbi Lopen", minPay: 30000, increment: 600, maxPay: 45000 },
    { positionTitle: "Tsheney Lopen", minPay: 30000, increment: 600, maxPay: 45000 },
    { positionTitle: "Tshugla Lopen", minPay: 30000, increment: 600, maxPay: 45000 },
    { positionTitle: "Dratshang Umzed", minPay: 24000, increment: 480, maxPay: 36000 },
    { positionTitle: "Samling Sungkhorpa", minPay: 18000, increment: 360, maxPay: 27000 },
    { positionTitle: "Gyelse Yongzin", minPay: 15000, increment: 300, maxPay: 22500 },
    { positionTitle: "Gyelse Rimpoche", minPay: 15000, increment: 300, maxPay: 22500 },
    { positionTitle: "Sungkhorp", minPay: 13500, increment: 270, maxPay: 20250 },
    { positionTitle: "Ma Zim", minPay: 12000, increment: 240, maxPay: 18000 },
    { positionTitle: "Tsey Zim", minPay: 12000, increment: 240, maxPay: 18000 },
    { positionTitle: "Truelku Cat I", minPay: 12000, increment: 0, maxPay: 12000 },
    { positionTitle: "Delchung", minPay: 10500, increment: 210, maxPay: 18000 },
    { positionTitle: "Sungkhorp to Her Majesty", minPay: 9000, increment: 0, maxPay: 9000 },
    { positionTitle: "Lam Neten", minPay: 9000, increment: 180, maxPay: 13500 },
    { positionTitle: "Deytsen Gopen", minPay: 9000, increment: 180, maxPay: 13500 },
    { positionTitle: "Goemdue Udzin Cat I", minPay: 8100, increment: 0, maxPay: 8100 },
    { positionTitle: "Je Khenpos Soelpon", minPay: 8100, increment: 165, maxPay: 12225 },
    { positionTitle: "Truelku Cat II", minPay: 9000, increment: 0, maxPay: 9000 },
    { positionTitle: "Khempo Category I", minPay: 7500, increment: 0, maxPay: 7500 },
    { positionTitle: "Lam Category I", minPay: 7500, increment: 0, maxPay: 7500 },
    { positionTitle: "Udzin of Drigrim Shedras", minPay: 7500, increment: 150, maxPay: 11250 },
    { positionTitle: "Lopen Gongma", minPay: 6900, increment: 140, maxPay: 10400 },
    { positionTitle: "Dheytsey Leyrok", minPay: 6900, increment: 140, maxPay: 10400 },
    { positionTitle: "Pandit Goem", minPay: 6750, increment: 0, maxPay: 6750 },
    { positionTitle: "Lopen Gongma of Lobdras", minPay: 6000, increment: 120, maxPay: 9000 },
    { positionTitle: "Dungyig Gongma", minPay: 6000, increment: 120, maxPay: 9000 },
    { positionTitle: "Lopen Goem Category I", minPay: 6000, increment: 0, maxPay: 6000 },
    { positionTitle: "Lam Category II", minPay: 6000, increment: 0, maxPay: 6000 },
    { positionTitle: "Hungzinpa", minPay: 5100, increment: 100, maxPay: 7600 },
    { positionTitle: "Leydung Dangpa", minPay: 5100, increment: 100, maxPay: 7600 },
    { positionTitle: "Goendey Lam", minPay: 4500, increment: 90, maxPay: 6750 },
    { positionTitle: "Rabdey Dungchen", minPay: 4500, increment: 90, maxPay: 6750 },
    { positionTitle: "Tshampas", minPay: 4500, increment: 0, maxPay: 4500 },
    { positionTitle: "Lam Category III", minPay: 4500, increment: 0, maxPay: 4500 },
    { positionTitle: "Lopen Goem Category II", minPay: 4500, increment: 0, maxPay: 4500 },
    { positionTitle: "Tsizin", minPay: 3000, increment: 60, maxPay: 4500 },
    { positionTitle: "Rabdey Nyerpa", minPay: 3000, increment: 60, maxPay: 4500 },
    { positionTitle: "Goemlops Category II", minPay: 3000, increment: 0, maxPay: 3000 },
    { positionTitle: "Gomnyer Category I", minPay: 3000, increment: 0, maxPay: 3000 },
    { positionTitle: "Dratshang Nyerpa", minPay: 2400, increment: 50, maxPay: 3650 },
    { positionTitle: "Leyzin", minPay: 2400, increment: 50, maxPay: 3650 },
    { positionTitle: "Goem Drung Category I", minPay: 2250, increment: 0, maxPay: 2250 },
    { positionTitle: "Kangjups Category I", minPay: 2250, increment: 0, maxPay: 2250 },
    { positionTitle: "Kunyer Cat I", minPay: 1800, increment: 0, maxPay: 1800 },
    { positionTitle: "Goemdye Tsozin Category I", minPay: 1700, increment: 0, maxPay: 1700 },
    { positionTitle: "Pandit Wom", minPay: 1050, increment: 0, maxPay: 1050 },
    { positionTitle: "Goem Drungs Category II", minPay: 1000, increment: 0, maxPay: 1000 },
    { positionTitle: "Goem Nyer Category II", minPay: 1000, increment: 0, maxPay: 1000 },
    { positionTitle: "Samyokpas", minPay: 900, increment: 0, maxPay: 900 },
    { positionTitle: "Goemlops Cat V", minPay: 800, increment: 0, maxPay: 800 },
    { positionTitle: "Goemlops Cat VI", minPay: 750, increment: 0, maxPay: 750 },
    { positionTitle: "Goemlops Category IV", minPay: 900, increment: 0, maxPay: 900 },
    { positionTitle: "Kunyer Cat II", minPay: 750, increment: 0, maxPay: 750 },
    { positionTitle: "Kunyers Cat III", minPay: 600, increment: 0, maxPay: 600 },
    { positionTitle: "Kunyers Cat IV", minPay: 450, increment: 0, maxPay: 450 },
    { positionTitle: "Kuneyrs Cat V", minPay: 400, increment: 0, maxPay: 400 }
  ]
};

/**
 * Royal Bhutan Police (Uniformed)
 * Military ranks and police officer positions
 */
const ROYAL_BHUTAN_POLICE: OpsCategory = {
  id: "rbp",
  name: "Royal Bhutan Police",
  description: "Police officers and uniformed personnel (Major General to Maksaar)",
  dataSource: "manual",
  positions: [
    { positionTitle: "Major General", minPay: 95920, increment: 1920, maxPay: 118960 },
    { positionTitle: "Brigadier", minPay: 68785, increment: 1375, maxPay: 89410 },
    { positionTitle: "Colonel", minPay: 58345, increment: 1165, maxPay: 75820 },
    { positionTitle: "Lt Colonel", minPay: 49435, increment: 990, maxPay: 64285 },
    { positionTitle: "Major", minPay: 41270, increment: 825, maxPay: 53645 },
    { positionTitle: "Captain", minPay: 33280, increment: 665, maxPay: 43255 },
    { positionTitle: "Lieutenant", minPay: 26845, increment: 535, maxPay: 34870 },
    { positionTitle: "Drimgom", minPay: 20640, increment: 415, maxPay: 26865 },
    { positionTitle: "Dedrim", minPay: 17720, increment: 355, maxPay: 23045 },
    { positionTitle: "Drimpon", minPay: 16385, increment: 330, maxPay: 21335 },
    { positionTitle: "Pelpon", minPay: 15175, increment: 305, maxPay: 19750 },
    { positionTitle: "Pelijab", minPay: 14380, increment: 290, maxPay: 18730 },
    { positionTitle: "Gopa", minPay: 13775, increment: 275, maxPay: 17900 },
    { positionTitle: "Chuma", minPay: 12555, increment: 250, maxPay: 16305 },
    { positionTitle: "Maksaar", minPay: 4500, increment: 0, maxPay: 4500 }
  ]
};

/**
 * Royal Bhutan Police (Civil)
 * Civilian support staff in RBP with civil service pay scales
 */
const ROYAL_BHUTAN_POLICE_CIVIL: OpsCategory = {
  id: "rbp-civil",
  name: "Royal Bhutan Police (Civil)",
  description: "Civilian support staff in Royal Bhutan Police",
  dataSource: "manual",
  positions: [
    { positionTitle: "EX/ES-1", minPay: 54575, increment: 1090, maxPay: 70925 },
    { positionTitle: "EX/ES-2", minPay: 45785, increment: 915, maxPay: 59510 },
    { positionTitle: "EX/ES-3", minPay: 38700, increment: 775, maxPay: 50325 },
    { positionTitle: "P1", minPay: 36570, increment: 735, maxPay: 47595 },
    { positionTitle: "P2", minPay: 32300, increment: 650, maxPay: 42050 },
    { positionTitle: "SS1", minPay: 32300, increment: 650, maxPay: 42050 },
    { positionTitle: "SS2", minPay: 28315, increment: 570, maxPay: 36865 },
    { positionTitle: "P3", minPay: 28315, increment: 570, maxPay: 36865 },
    { positionTitle: "P4", minPay: 25220, increment: 505, maxPay: 32795 },
    { positionTitle: "SS3", minPay: 25220, increment: 505, maxPay: 32795 },
    { positionTitle: "SS4", minPay: 20645, increment: 415, maxPay: 26870 },
    { positionTitle: "P5", minPay: 20645, increment: 415, maxPay: 26870 },
    { positionTitle: "S1", minPay: 19970, increment: 400, maxPay: 25970 },
    { positionTitle: "S2", minPay: 18095, increment: 365, maxPay: 23570 },
    { positionTitle: "S3", minPay: 16535, increment: 335, maxPay: 21560 },
    { positionTitle: "S4", minPay: 14675, increment: 295, maxPay: 19100 },
    { positionTitle: "S5", minPay: 13575, increment: 275, maxPay: 17700 },
    { positionTitle: "O1", minPay: 13300, increment: 270, maxPay: 17350 },
    { positionTitle: "O2", minPay: 12495, increment: 250, maxPay: 16245 },
    { positionTitle: "O3", minPay: 11355, increment: 230, maxPay: 14805 },
    { positionTitle: "O4", minPay: 10550, increment: 215, maxPay: 13775 },
    { positionTitle: "GSP", minPay: 10505, increment: 210, maxPay: 13655 },
    { positionTitle: "ESP", minPay: 9450, increment: 190, maxPay: 12300 },
    { positionTitle: "GSC-I", minPay: 8080, increment: 160, maxPay: 10480 },
    { positionTitle: "GSC-II", minPay: 7695, increment: 155, maxPay: 10020 }
  ]
};

/**
 * Other Public Servants (General)
 * RUB and ECB staff using civil service pay scales
 */
const OPS_GENERAL: OpsCategory = {
  id: "ops-general",
  name: "Other Public Servants (RUB/ECB)",
  description: "General OPS positions using Civil Service pay scales",
  dataSource: "both",
  positions: [
    // Civil Service pay scales
    { positionTitle: "EX/ES-1", minPay: 54575, increment: 1090, maxPay: 70925 },
    { positionTitle: "EX/ES-2", minPay: 45785, increment: 915, maxPay: 59510 },
    { positionTitle: "EX/ES-3", minPay: 38700, increment: 775, maxPay: 50325 },
    { positionTitle: "P1", minPay: 36570, increment: 735, maxPay: 47595 },
    { positionTitle: "P2", minPay: 32300, increment: 650, maxPay: 42050 },
    { positionTitle: "SS1", minPay: 32300, increment: 650, maxPay: 42050 },
    { positionTitle: "SS2", minPay: 28315, increment: 570, maxPay: 36865 },
    { positionTitle: "P3", minPay: 28315, increment: 570, maxPay: 36865 },
    { positionTitle: "P4", minPay: 25220, increment: 505, maxPay: 32795 },
    { positionTitle: "SS3", minPay: 25220, increment: 505, maxPay: 32795 },
    { positionTitle: "SS4", minPay: 20645, increment: 415, maxPay: 26870 },
    { positionTitle: "P5", minPay: 20645, increment: 415, maxPay: 26870 },
    { positionTitle: "S1", minPay: 19970, increment: 400, maxPay: 25970 },
    { positionTitle: "S2", minPay: 18095, increment: 365, maxPay: 23570 },
    { positionTitle: "S3", minPay: 16535, increment: 335, maxPay: 21560 },
    { positionTitle: "S4", minPay: 14675, increment: 295, maxPay: 19100 },
    { positionTitle: "S5", minPay: 13575, increment: 275, maxPay: 17700 },
    { positionTitle: "O1", minPay: 13300, increment: 270, maxPay: 17350 },
    { positionTitle: "O2", minPay: 12495, increment: 250, maxPay: 16245 },
    { positionTitle: "O3", minPay: 11355, increment: 230, maxPay: 14805 },
    { positionTitle: "O4", minPay: 10550, increment: 215, maxPay: 13775 },
    { positionTitle: "GSP", minPay: 10505, increment: 210, maxPay: 13655 },
    { positionTitle: "ESP", minPay: 9450, increment: 190, maxPay: 12300 }
  ]
};

/**
 * All OPS categories — CANONICAL ORDER.
 * This ordering is the single source of truth driving tab order in the OPS
 * Employee Registry, Pay Scale Master, and every place OPS categories are
 * rendered. Do not re-sort consumers locally.
 *
 *   1. RUB                           — Royal University of Bhutan
 *   2. Judiciary                     — Supreme Court / High Court
 *   3. ECB                           — Election Commission of Bhutan
 *   4. RBP                           — Royal Bhutan Police (uniformed)
 *   5. Local Government              — Dzongkhag / Gewog / Thromde
 *   6. Parliamentary                 — Members of NA / NC
 *   7. Constitutional Bodies Post Holder
 *   8. Local Recruits                — staff at foreign stations
 */
export const OPS_CATEGORIES: OpsCategory[] = [
  ROYAL_UNIVERSITY_OF_BHUTAN,
  JUDICIARY,
  ELECTION_COMMISSION_BHUTAN,
  ROYAL_BHUTAN_POLICE,
  LOCAL_GOVERNMENT,
  PARLIAMENT,
  CONSTITUTIONAL_BODIES,
  FOREIGN_SERVICES_LOCAL_RECRUIT
];

/* Legacy / unused categories kept only for reference by code paths that may
   still import them. They are intentionally NOT part of OPS_CATEGORIES so the
   published ordering above is the only source of truth. */
// @ts-expect-error — intentionally unused, retained for backwards compat
const _LEGACY_UNUSED_CATEGORIES = [
  FOREIGN_SERVICES,
  RELIGIOUS_SERVICES,
  ROYAL_BHUTAN_POLICE_CIVIL,
  OPS_GENERAL
];

/**
 * Get an OPS category by ID
 */
export function getOpsCategory(id: string): OpsCategory | undefined {
  return OPS_CATEGORIES.find((cat) => cat.id === id);
}

/**
 * Get a specific pay scale entry for a category and position
 */
export function getOpsPayScale(
  categoryId: string,
  positionTitle: string
): OpsPayScaleEntry | undefined {
  const category = getOpsCategory(categoryId);
  if (!category) return undefined;
  return category.positions.find((pos) => pos.positionTitle === positionTitle);
}

/**
 * Get all OPS categories
 */
export function getAllOpsCategories(): OpsCategory[] {
  return [...OPS_CATEGORIES];
}

/**
 * Agency-code → allowed OPS category id(s). MoF (code 16) is treated as
 * the central oversight agency and sees every category; every other
 * agency is restricted to the OPS bucket that actually applies to them.
 * Unknown / empty agency code falls back to everything (dev safety).
 */
const AGENCY_OPS_CATEGORY_MAP: Record<string, string[]> = {
  /* Central oversight — sees everything */
  "16": [],            // Ministry of Finance
  /* Each OPS agency is scoped to its own category */
  "68": ["rub"],                    // Royal University of Bhutan
  "61": ["rub"],                    // KGUMSB (treated as university family)
  "64": ["parliament"],             // National Council
  "65": ["constitutional-bodies"],  // Office of the Attorney General
  "66": ["constitutional-bodies"],  // Royal Privy Council
  "62": ["constitutional-bodies"],  // HMS4 Secretariat
  "63": ["constitutional-bodies"],  // The Pema Secretariat
  "60": ["constitutional-bodies"],  // BNLI
  "67": ["constitutional-bodies"],  // NCHM
  "69": ["rbp"],                    // Royal Bhutan Police
};

/**
 * Return only the OPS categories the given agency is allowed to see.
 * - MoF ("16") and any agency mapped to an empty array sees all categories.
 * - Missing / unknown agency code → all categories (defensive default).
 * - Mapped agencies see exactly the ids listed in the map.
 */
export function getOpsCategoriesForAgency(agencyCode?: string | null): OpsCategory[] {
  if (!agencyCode) return [...OPS_CATEGORIES];
  const allowed = AGENCY_OPS_CATEGORY_MAP[agencyCode];
  if (!allowed) return [...OPS_CATEGORIES];
  if (allowed.length === 0) return [...OPS_CATEGORIES]; // MoF and similar
  return OPS_CATEGORIES.filter((c) => allowed.includes(c.id));
}

/** True if the given agency is the central oversight agency (MoF today). */
export function isCentralPayrollAgency(agencyCode?: string | null): boolean {
  return agencyCode === "16";
}
