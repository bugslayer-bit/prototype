/* Inline badge / note helpers used by the Sanction Management forms */
export function ddBadge(v: string) {
  return <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-500">{v}</span>;
}

export function brNote(text: string) {
  return <span className="mt-1 block text-xs text-slate-500">BR: {text}</span>;
}
