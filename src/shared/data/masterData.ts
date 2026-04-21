import {
  getAllDzongkhags,
  getDungkhagsForDzongkhag,
  getGewogsForDzongkhag,
  getThromdeForDzongkhag,
  getAllDzongkhagsMasterData,
  getAllGewogsMasterData,
  getAllDungkhagsMasterData,
  getAllThromdesMasterData
} from "./locationData";
import {
  getAllBanks,
  getBranchesForBank,
  getBranchCodesForBank,
  getAllBanksMasterData,
  getAllBranchesMasterData,
  getAllBranchCodesMasterData
} from "./bankData";

export { getAllDzongkhags, getDungkhagsForDzongkhag, getGewogsForDzongkhag, getThromdeForDzongkhag };
export { getAllBanks, getBranchesForBank, getBranchCodesForBank };

export * from "./masterData/index";
