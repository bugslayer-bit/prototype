/* Document localStorage persistence for ContractorFormModal */

export const DOC_STORAGE_PREFIX = "ifmis-contractor-docs:";

interface StoredDoc { name: string; size: number; type: string; dataUrl: string }
type StoredDocMap = Record<string, StoredDoc[]>;

export function saveDocsToStorage(contractorId: string, docFiles: Record<string, File[]>) {
  if (!contractorId) return;
  const promises: Promise<[string, StoredDoc[]]>[] = Object.entries(docFiles).map(([key, files]) => {
    return Promise.all(files.map(f => new Promise<StoredDoc>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: f.name, size: f.size, type: f.type, dataUrl: reader.result as string });
      reader.readAsDataURL(f);
    }))).then(docs => [key, docs] as [string, StoredDoc[]]);
  });
  Promise.all(promises).then(entries => {
    const map: StoredDocMap = {};
    for (const [k, v] of entries) { if (v.length) map[k] = v; }
    try { window.localStorage.setItem(DOC_STORAGE_PREFIX + contractorId, JSON.stringify(map)); } catch { /* quota */ }
  });
}

export function loadDocsFromStorage(contractorId: string): Promise<Record<string, File[]>> {
  try {
    const raw = window.localStorage.getItem(DOC_STORAGE_PREFIX + contractorId);
    if (!raw) return Promise.resolve({});
    const map = JSON.parse(raw) as StoredDocMap;
    const result: Record<string, File[]> = {};
    for (const [key, docs] of Object.entries(map)) {
      result[key] = docs.map(d => {
        const byteString = atob(d.dataUrl.split(",")[1] || "");
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        return new File([ab], d.name, { type: d.type });
      });
    }
    return Promise.resolve(result);
  } catch { return Promise.resolve({}); }
}
