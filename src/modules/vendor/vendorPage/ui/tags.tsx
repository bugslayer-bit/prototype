/* SRS traceability tags — rendered inline next to labels */
export function ddTag(v: string) {
  return <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">{v}</span>;
}

export function lovTag(v: string) {
  return <span className="ml-1.5 rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold text-teal-600">{v}</span>;
}
