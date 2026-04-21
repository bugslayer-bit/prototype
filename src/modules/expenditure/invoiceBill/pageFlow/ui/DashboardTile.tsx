/* DashboardTile — Invoice & Bill landing card */
import type { DashboardTileDef } from "../types";
import { activeTileClass } from "../../theme";

interface DashboardTileProps {
  tile: DashboardTileDef;
  badge: number;
  onClick: () => void;
  active?: boolean;
}

export function DashboardTile({ tile, badge, onClick, active }: DashboardTileProps) {
  return (
    <section
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border ${tile.border} bg-gradient-to-br ${tile.bg} p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] sm:p-5 ${active ? activeTileClass : ""}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${tile.iconBg} text-xl text-white shadow-md`}
        >
          {tile.icon}
          {badge > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-md">
              {badge}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold leading-6 text-slate-900 sm:text-[15px]">{tile.title}</h2>
        </div>
      </div>
      <div className="mt-4">
        <button
          type="button"
          onClick={onClick}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600 active:border-amber-200 active:bg-amber-50 active:text-amber-900 focus-visible:border-amber-300 focus-visible:bg-amber-50 focus-visible:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
        >
          {tile.cta}
        </button>
      </div>
    </section>
  );
}
