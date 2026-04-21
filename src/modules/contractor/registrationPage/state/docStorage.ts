/* ═══════════════════════════════════════════════════════════════════
   Document persistence helper — serialises uploaded files to
   localStorage as data URLs so they can be re-hydrated on reload.
   ═══════════════════════════════════════════════════════════════════ */
import { DOC_STORAGE_PREFIX, type StoredDoc } from "../types";

export function saveDocsToStorage(contractorId: string, docFiles: Record<string, File[]>) {
  if (!contractorId) return;
  const promises: Promise<[string, StoredDoc[]]>[] = Object.entries(docFiles).map(([key, files]) => {
    return Promise.all(
      files.map(
        (f) =>
          new Promise<StoredDoc>((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({ name: f.name, size: f.size, type: f.type, dataUrl: reader.result as string });
            reader.readAsDataURL(f);
          }),
      ),
    ).then((docs) => [key, docs] as [string, StoredDoc[]]);
  });
  Promise.all(promises).then((entries) => {
    const map: Record<string, StoredDoc[]> = {};
    for (const [k, v] of entries) {
      if (v.length) map[k] = v;
    }
    try {
      window.localStorage.setItem(DOC_STORAGE_PREFIX + contractorId, JSON.stringify(map));
    } catch {
      /* quota */
    }
  });
}
