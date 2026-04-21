import React from "react";

export function OpsInterfacePanel() {
  const interfaces = [
    { name: "RBP HRMS", agency: "Royal Bhutan Police", status: "connected", records: 3120 },
    { name: "Judiciary HRIS", agency: "Supreme Court / High Court", status: "connected", records: 412 },
    { name: "Parliament HR", agency: "NA / NC Secretariat", status: "connected", records: 73 },
    { name: "RUB HRIS", agency: "Royal University of Bhutan", status: "pending", records: 0 },
    { name: "LG Portal", agency: "Dzongkhag / Gewog / Thromde", status: "connected", records: 1845 },
    { name: "Dratshang HR", agency: "Zhung Dratshang", status: "manual", records: 0 },
  ];
  return (
    <div className="mb-4 rounded-[24px] border border-amber-200/80 bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <h4 className="mb-4 text-sm font-bold text-amber-950">Available Interfaces</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {interfaces.map((i) => (
          <div key={i.name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
            <div>
              <div className="text-sm font-bold text-slate-800">{i.name}</div>
              <div className="text-[11px] text-slate-500">{i.agency}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-700">{i.records} records</div>
              <span
                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm ${
                  i.status === "connected"
                    ? "bg-green-100 text-green-700"
                    : i.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {i.status.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
