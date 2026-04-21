import { MasterDataGroup } from "../masterData";
import {
  getAllDzongkhagsMasterData,
  getAllGewogsMasterData,
  getAllDungkhagsMasterData,
  getAllThromdesMasterData
} from "../locationData";

export const locationGroups: MasterDataGroup[] = [
  {
    id: "gewog",
    title: "Gewog",
    description: "LoV 2.1 / master-data-driven",
    values: getAllGewogsMasterData()
  },
  {
    id: "dungkhag",
    title: "Dungkhag",
    description: "LoV 2.2 / master-data-driven",
    values: getAllDungkhagsMasterData()
  },
  {
    id: "thromde",
    title: "Thromde",
    description: "LoV 2.3 / master-data-driven",
    values: getAllThromdesMasterData()
  },
  {
    id: "dzongkhag",
    title: "Dzongkhag",
    description: "LoV 2.4 / master-data-driven",
    values: getAllDzongkhagsMasterData()
  },
  {
    id: "fi-operating-region",
    title: "FI — Operating Region",
    description: "PRN 7.1 Step 1 — geographic footprint (Dzongkhag level)",
    values: [
      "Thimphu",
      "Paro",
      "Phuntsholing",
      "Gelephu",
      "Mongar",
      "Samdrup Jongkhar",
      "Bumthang",
      "Trongsa",
      "Trashigang",
      "Samtse",
      "Nationwide"
    ]
  }
];
