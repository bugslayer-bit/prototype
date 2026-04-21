export interface GewogEntry {
  code: string;
  name: string;
}

export interface DungkhagEntry {
  code: string;
  name: string;
  gewogs: GewogEntry[];
}

export interface DzongkhagEntry {
  code: string;
  name: string;
  dungkhags: DungkhagEntry[];
}

export const bhutanLocationHierarchy: DzongkhagEntry[] = [
  {
    code: "11",
    name: "Bumthang",
    dungkhags: [
      {
        code: "110",
        name: "",
        gewogs: [
          { code: "1101", name: "Chhoekhor" },
          { code: "1102", name: "Chhumig" },
          { code: "1103", name: "Tang" },
          { code: "1104", name: "Ura" }
        ]
      }
    ]
  },
  {
    code: "12",
    name: "Chhukha",
    dungkhags: [
      {
        code: "120",
        name: "",
        gewogs: [
          { code: "1201", name: "Bjagchhog" },
          { code: "1202", name: "Bongo" },
          { code: "1203", name: "Chapchha" },
          { code: "1204", name: "Darla" },
          { code: "1205", name: "Doongna" },
          { code: "1206", name: "Getana" },
          { code: "1207", name: "Geling" },
          { code: "1208", name: "Loggchina" },
          { code: "1209", name: "Maedtabkha" }
        ]
      },
      {
        code: "121",
        name: "Phuntsholing Dungkhag",
        gewogs: [
          { code: "1211", name: "Phuentshogling" },
          { code: "1212", name: "Samphelling" }
        ]
      }
    ]
  },
  {
    code: "13",
    name: "Dagana",
    dungkhags: [
      {
        code: "130",
        name: "",
        gewogs: [
          { code: "1301", name: "Dorona" },
          { code: "1302", name: "Drukjeygang" },
          { code: "1303", name: "Gesarling" },
          { code: "1304", name: "Gozhi" },
          { code: "1305", name: "Karna" },
          { code: "1306", name: "Khebisa" },
          { code: "1307", name: "Largyab" },
          { code: "1308", name: "Tashiding" },
          { code: "1309", name: "Tsangkha" },
          { code: "1310", name: "Tsenda-Gang" },
          { code: "1311", name: "Tseza" }
        ]
      },
      {
        code: "131",
        name: "Lhamoi Dzingkha Dungkhag",
        gewogs: [
          { code: "1311", name: "Lhamoi Dzingkha" },
          { code: "1312", name: "Nichula" },
          { code: "1313", name: "Karmaling" }
        ]
      }
    ]
  },
  {
    code: "14",
    name: "Gasa",
    dungkhags: [
      {
        code: "140",
        name: "",
        gewogs: [
          { code: "1401", name: "Khamaed" },
          { code: "1402", name: "Khatoed" },
          { code: "1403", name: "Laya" },
          { code: "1404", name: "Lunana" }
        ]
      }
    ]
  },
  {
    code: "15",
    name: "Haa",
    dungkhags: [
      {
        code: "150",
        name: "",
        gewogs: [
          { code: "1501", name: "Bji" },
          { code: "1502", name: "Uesu" },
          { code: "1503", name: "Kartshog" },
          { code: "1504", name: "Samar" }
        ]
      },
      {
        code: "151",
        name: "Sombaykha Dungkhag",
        gewogs: [
          { code: "1511", name: "Gakiling" },
          { code: "1512", name: "Sangbay" }
        ]
      }
    ]
  },
  {
    code: "16",
    name: "Lhuentse",
    dungkhags: [
      {
        code: "160",
        name: "",
        gewogs: [
          { code: "1601", name: "Gangzur" },
          { code: "1602", name: "Jarey" },
          { code: "1603", name: "Khoma" },
          { code: "1604", name: "Maenbi" },
          { code: "1605", name: "Maedtsho" },
          { code: "1606", name: "Minjey" },
          { code: "1607", name: "Tsaenkhar" }
        ]
      }
    ]
  },
  {
    code: "17",
    name: "Mongar",
    dungkhags: [
      {
        code: "170",
        name: "",
        gewogs: [
          { code: "1701", name: "Balam" },
          { code: "1702", name: "Chhaling" },
          { code: "1703", name: "Chagsakhar" },
          { code: "1704", name: "Dramedtse" },
          { code: "1705", name: "Drepoong" },
          { code: "1706", name: "Jurmed" },
          { code: "1707", name: "Kengkhar" },
          { code: "1708", name: "Monggar" },
          { code: "1709", name: "Na-Rang" },
          { code: "1710", name: "Ngatshang" },
          { code: "1711", name: "Saling" },
          { code: "1712", name: "Shermuhoong" },
          { code: "1713", name: "Thang-Rong" },
          { code: "1714", name: "Tsakaling" },
          { code: "1715", name: "Tsamang" }
        ]
      },
      {
        code: "171",
        name: "Weringla Dungkhag",
        gewogs: [
          { code: "1711", name: "Gongdue" },
          { code: "1712", name: "Silambi" }
        ]
      }
    ]
  },
  {
    code: "18",
    name: "Paro",
    dungkhags: [
      {
        code: "180",
        name: "",
        gewogs: [
          { code: "1801", name: "Dokar" },
          { code: "1802", name: "Dopshar-ri" },
          { code: "1803", name: "Doteng" },
          { code: "1804", name: "Hoongrel" },
          { code: "1805", name: "Lamgong" },
          { code: "1806", name: "Loong-nyi" },
          { code: "1807", name: "Nagya" },
          { code: "1808", name: "Sharpa" },
          { code: "1809", name: "Tsento" },
          { code: "1810", name: "Wangchang" }
        ]
      }
    ]
  },
  {
    code: "19",
    name: "Pema Gatshel",
    dungkhags: [
      {
        code: "190",
        name: "",
        gewogs: [
          { code: "1901", name: "Chhokhorling" },
          { code: "1902", name: "Dechhenling" },
          { code: "1903", name: "Norboogang" },
          { code: "1904", name: "Chhimoong" },
          { code: "1905", name: "Chongshing" },
          { code: "1906", name: "Dungmaed" },
          { code: "1907", name: "Khar" },
          { code: "1908", name: "Nanong" },
          { code: "1909", name: "Shumar" },
          { code: "1910", name: "Yurung" },
          { code: "1911", name: "Zobel" }
        ]
      },
      {
        code: "191",
        name: "Nganglam Dungkhag",
        gewogs: [
          { code: "1911", name: "Nganglam" }
        ]
      }
    ]
  },
  {
    code: "20",
    name: "Punakha",
    dungkhags: [
      {
        code: "200",
        name: "",
        gewogs: [
          { code: "2001", name: "Barp" },
          { code: "2002", name: "Chhubu" },
          { code: "2003", name: "Dzomi" },
          { code: "2004", name: "Goenshari" },
          { code: "2005", name: "Guma" },
          { code: "2006", name: "Kabisa" },
          { code: "2007", name: "Lingmukha" },
          { code: "2008", name: "Shelnga-Bjemi" },
          { code: "2009", name: "Talog" },
          { code: "2010", name: "Toedpaisa" },
          { code: "2011", name: "Toedwang" }
        ]
      }
    ]
  },
  {
    code: "21",
    name: "Samdrup Jongkhar",
    dungkhags: [
      {
        code: "210",
        name: "",
        gewogs: [
          { code: "2101", name: "Dewathang" },
          { code: "2102", name: "Gomdar" },
          { code: "2103", name: "Orong" },
          { code: "2104", name: "Wangphu" }
        ]
      },
      {
        code: "211",
        name: "Jomotshangkha Dungkhag",
        gewogs: [
          { code: "2111", name: "Langchenphu" },
          { code: "2112", name: "Lauri" },
          { code: "2113", name: "Serthig" }
        ]
      },
      {
        code: "212",
        name: "Samdrupcholing Dungkhag",
        gewogs: [
          { code: "2121", name: "Martshala" },
          { code: "2122", name: "Pemathang" },
          { code: "2123", name: "Phuntshogthang" },
          { code: "2124", name: "Samrang" }
        ]
      },
      {
        code: "213",
        name: "Samdrup Jongkhar Thromde",
        gewogs: [
          { code: "2131", name: "Samdrup Jongkhar Bar" },
          { code: "2132", name: "Samdrup Jongkhar Maed" },
          { code: "2133", name: "Samdrup Jongkhar Toed" },
          { code: "2134", name: "Samdrup Gatshel" },
          { code: "2135", name: "Bangtsho" },
          { code: "2136", name: "Kipse" },
          { code: "2137", name: "Dzongkhag Yenlag Thromde" }
        ]
      }
    ]
  },
  {
    code: "22",
    name: "Samtse",
    dungkhags: [
      {
        code: "220",
        name: "",
        gewogs: [
          { code: "2201", name: "Norgaygang" },
          { code: "2202", name: "Sang-Ngag-Chhoeling" },
          { code: "2203", name: "Phuentshogpelri" },
          { code: "2204", name: "Samtse" },
          { code: "2205", name: "Tading" },
          { code: "2206", name: "Ugyentse" },
          { code: "2207", name: "Yoeseltse" },
          { code: "2208", name: "Norboogang" }
        ]
      },
      {
        code: "221",
        name: "Dorokha Dungkhag",
        gewogs: [
          { code: "2211", name: "Doomtoed" },
          { code: "2212", name: "Duenchhukha" },
          { code: "2213", name: "Dophuchen" }
        ]
      },
      {
        code: "222",
        name: "Tashichhoeling Dungkhag",
        gewogs: [
          { code: "2221", name: "Tashichhoeling" },
          { code: "2222", name: "Pemaling" },
          { code: "2223", name: "Namgyalchhoeling" },
          { code: "2224", name: "Tendruk" }
        ]
      }
    ]
  },
  {
    code: "23",
    name: "Sarpang",
    dungkhags: [
      {
        code: "230",
        name: "",
        gewogs: [
          { code: "2301", name: "Dekiling" },
          { code: "2302", name: "Gelegphu" },
          { code: "2303", name: "Jigme Chhoeling" },
          { code: "2304", name: "Senggey" },
          { code: "2305", name: "Shompangkha" },
          { code: "2306", name: "Samtenling" },
          { code: "2307", name: "Chhudzom" },
          { code: "2308", name: "Gakiling" }
        ]
      },
      {
        code: "231",
        name: "Gelephu Dungkhag",
        gewogs: [
          { code: "2311", name: "Chhuzanggang" },
          { code: "2312", name: "Serzhong" },
          { code: "2313", name: "Tareythang" },
          { code: "2314", name: "Umling" }
        ]
      },
      {
        code: "232",
        name: "Gelegphu Thromde",
        gewogs: [
          { code: "2321", name: "Jampelling" },
          { code: "2322", name: "Namkhaling" },
          { code: "2323", name: "Rabdeyling" },
          { code: "2324", name: "Samdrupling" },
          { code: "2325", name: "Sonam Gatshel" },
          { code: "2326", name: "Trashiling" }
        ]
      }
    ]
  },
  {
    code: "24",
    name: "Thimphu",
    dungkhags: [
      {
        code: "240",
        name: "",
        gewogs: [
          { code: "2401", name: "Chang" }
        ]
      },
      {
        code: "241",
        name: "Lingzhi",
        gewogs: [
          { code: "2411", name: "Lingzhi" },
          { code: "2412", name: "Soe" },
          { code: "2413", name: "Ge-nyen" },
          { code: "2414", name: "Kawang" },
          { code: "2415", name: "Maedwang" },
          { code: "2416", name: "Naro" },
          { code: "2417", name: "Darkarla" }
        ]
      },
      {
        code: "242",
        name: "Thim Throm",
        gewogs: [
          { code: "2421", name: "Babesa - Semtokha Demkhong" },
          { code: "2422", name: "Olakha-Changzamtog Demkhong" },
          { code: "2423", name: "Changgangkha Demkhong" },
          { code: "2424", name: "Taba-Dechencholing Demkhong" },
          { code: "2425", name: "Kawang Demkhong" },
          { code: "2426", name: "Motithang Demkhong" },
          { code: "2427", name: "Thimphu Thromde" }
        ]
      }
    ]
  },
  {
    code: "25",
    name: "Trashigang",
    dungkhags: [
      {
        code: "250",
        name: "",
        gewogs: [
          { code: "2501", name: "Bartsham" },
          { code: "2502", name: "Bidoong" },
          { code: "2503", name: "Kanglung" },
          { code: "2504", name: "Merag" },
          { code: "2505", name: "Phongmed" },
          { code: "2506", name: "Radhi" },
          { code: "2507", name: "Samkhar" },
          { code: "2508", name: "Shongphu" },
          { code: "2509", name: "Udzorong" },
          { code: "2510", name: "Yangnyer" }
        ]
      },
      {
        code: "251",
        name: "Sagteng Dungkhag",
        gewogs: [
          { code: "2511", name: "Sagteng" }
        ]
      },
      {
        code: "252",
        name: "Thrimshing Dungkhag",
        gewogs: [
          { code: "2521", name: "Thrimshing" },
          { code: "2522", name: "Kangpar" }
        ]
      },
      {
        code: "253",
        name: "Womrong Dungkhag",
        gewogs: [
          { code: "2531", name: "Khaling" },
          { code: "2532", name: "Lumang" }
        ]
      }
    ]
  },
  {
    code: "26",
    name: "Trashiyantse",
    dungkhags: [
      {
        code: "260",
        name: "",
        gewogs: [
          { code: "2601", name: "Boomdeling" },
          { code: "2602", name: "Jamkhar" },
          { code: "2603", name: "Khamdang" },
          { code: "2604", name: "Ramjar" },
          { code: "2605", name: "Toetsho" },
          { code: "2606", name: "Tongmajangsa" },
          { code: "2607", name: "Yangtse" },
          { code: "2608", name: "Yallang" }
        ]
      }
    ]
  },
  {
    code: "27",
    name: "Trongsa",
    dungkhags: [
      {
        code: "270",
        name: "",
        gewogs: [
          { code: "2701", name: "Draagteng" },
          { code: "2702", name: "Korphu" },
          { code: "2703", name: "Langthil" },
          { code: "2704", name: "Nubi" },
          { code: "2705", name: "Tangsibji" }
        ]
      }
    ]
  },
  {
    code: "28",
    name: "Tsirang",
    dungkhags: [
      {
        code: "280",
        name: "",
        gewogs: [
          { code: "2801", name: "Barshong" },
          { code: "2802", name: "Doonglagang" },
          { code: "2803", name: "Gosarling" },
          { code: "2804", name: "Kilkhorthang" },
          { code: "2805", name: "Mendrelgang" },
          { code: "2806", name: "Patshaling" },
          { code: "2807", name: "Pungtenchhu" },
          { code: "2808", name: "Rangthangling" },
          { code: "2809", name: "Semjong" },
          { code: "2810", name: "Sergithang" },
          { code: "2811", name: "Tsholingkhar" },
          { code: "2812", name: "Tsirang Toed" }
        ]
      }
    ]
  },
  {
    code: "29",
    name: "Wangdue Phodrang",
    dungkhags: [
      {
        code: "290",
        name: "",
        gewogs: [
          { code: "2901", name: "Athang" },
          { code: "2902", name: "Bjenag" },
          { code: "2903", name: "Darkar" },
          { code: "2904", name: "Dangchu" },
          { code: "2905", name: "Ganteng" },
          { code: "2906", name: "Kazshi" },
          { code: "2907", name: "Gase Tshogom" },
          { code: "2908", name: "Gase Tshowom" },
          { code: "2909", name: "Nyishog" },
          { code: "2910", name: "Nahi" },
          { code: "2911", name: "Phangyel" },
          { code: "2912", name: "Saephu" },
          { code: "2913", name: "Phobji" },
          { code: "2914", name: "Ruebisa" },
          { code: "2915", name: "Thedtsho" },
          { code: "2916", name: "Bajo Throm" }
        ]
      }
    ]
  },
  {
    code: "30",
    name: "Zhemgang",
    dungkhags: [
      {
        code: "300",
        name: "",
        gewogs: [
          { code: "3001", name: "Bardo" },
          { code: "3002", name: "Nangkor" },
          { code: "3003", name: "Shingkhar" },
          { code: "3004", name: "Trong" }
        ]
      },
      {
        code: "301",
        name: "Pangbang Dungkhag",
        gewogs: [
          { code: "3011", name: "Bjoka" },
          { code: "3012", name: "Goshing" },
          { code: "3013", name: "Ngangla" },
          { code: "3014", name: "Phangkhar" }
        ]
      }
    ]
  }
];

/** Helper to find dzongkhag by name (with or without code prefix) */
function findDzongkhag(dzongkhagValue: string): DzongkhagEntry | undefined {
  return bhutanLocationHierarchy.find(d =>
    d.name === dzongkhagValue || `${d.code} - ${d.name}` === dzongkhagValue
  );
}

/** Helper to find dungkhag by name (with or without code prefix) */
function findDungkhag(dz: DzongkhagEntry, dungkhagValue: string): DungkhagEntry | undefined {
  return dz.dungkhags.find(dk =>
    dk.name === dungkhagValue || `${dk.code} - ${dk.name}` === dungkhagValue
  );
}

/** Get all dzongkhag options as "code - name" */
export function getAllDzongkhags(): string[] {
  return bhutanLocationHierarchy.map(d => `${d.code} - ${d.name}`);
}

/** Get dungkhags for a given dzongkhag. Returns "code - name" for non-empty names only. */
export function getDungkhagsForDzongkhag(dzongkhagValue: string): string[] {
  const dz = findDzongkhag(dzongkhagValue);
  if (!dz) return [];
  return dz.dungkhags
    .filter(dk => dk.name !== "" && !dk.name.toLowerCase().includes("throm"))
    .map(dk => `${dk.code} - ${dk.name}`);
}

/** Get all gewogs for a given dzongkhag (optionally filtered by dungkhag). Returns "code - name". */
export function getGewogsForDzongkhag(dzongkhagValue: string, dungkhagValue?: string): string[] {
  const dz = findDzongkhag(dzongkhagValue);
  if (!dz) return [];
  if (dungkhagValue) {
    const dk = findDungkhag(dz, dungkhagValue);
    return dk
      ? dk.gewogs
          .map(g => `${g.code} - ${g.name}`)
          .sort((a, b) => a.split(" - ")[1].localeCompare(b.split(" - ")[1]))
      : [];
  }
  // Return all gewogs for this dzongkhag across all dungkhags (sorted alphabetically by name)
  return dz.dungkhags
    .flatMap(dk => dk.gewogs.map(g => `${g.code} - ${g.name}`))
    .sort((a, b) => a.split(" - ")[1].localeCompare(b.split(" - ")[1]));
}

/** Get the thromde for a dzongkhag if one exists. Returns "code - name". */
export function getThromdeForDzongkhag(dzongkhagValue: string): string[] {
  const dz = findDzongkhag(dzongkhagValue);
  if (!dz) return [];
  return dz.dungkhags
    .filter(dk => dk.name.toLowerCase().includes("throm"))
    .map(dk => `${dk.code} - ${dk.name}`);
}

/** Get all dzongkhag names with codes for master data display */
export function getAllDzongkhagsMasterData(): string[] {
  return bhutanLocationHierarchy.map(d => `${d.code} - ${d.name}`);
}

/** Get all gewog names with codes for master data display */
export function getAllGewogsMasterData(): string[] {
  const all = bhutanLocationHierarchy.flatMap(dz =>
    dz.dungkhags.flatMap(dk =>
      dk.gewogs.map(g => `${g.code} - ${g.name}`)
    )
  );
  return [...new Set(all)].sort((a, b) => a.split(" - ")[1].localeCompare(b.split(" - ")[1]));
}

/** Get all dungkhag names with codes for master data display (excludes thromdes and null entries) */
export function getAllDungkhagsMasterData(): string[] {
  return bhutanLocationHierarchy.flatMap(dz =>
    dz.dungkhags
      .filter(dk => dk.name !== "" && !dk.name.toLowerCase().includes("throm"))
      .map(dk => `${dk.code} - ${dk.name}`)
  );
}

/** Get all thromde names with codes for master data display */
export function getAllThromdesMasterData(): string[] {
  return bhutanLocationHierarchy.flatMap(dz =>
    dz.dungkhags
      .filter(dk => dk.name.toLowerCase().includes("throm"))
      .map(dk => `${dk.code} - ${dk.name}`)
  );
}
