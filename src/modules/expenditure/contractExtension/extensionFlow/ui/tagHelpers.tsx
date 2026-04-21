/* Small inline tag pills used to reference SRS data dictionary entries */
import type { ReactNode } from "react";

export function ddTag(v: string): ReactNode {
  return (
    <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">
      {v}
    </span>
  );
}

export function brTag(v: string): ReactNode {
  return (
    <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">
      {v}
    </span>
  );
}

export function pdTag(v: string): ReactNode {
  return (
    <span className="ml-1.5 rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-600">
      {v}
    </span>
  );
}
