export const m = (v: number, d = 0) => `${v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d })} m`;
export const n = (v: number, d = 0) => v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
export const km3 = (v: number) => `${(v / 1e9).toLocaleString("en-US", { maximumFractionDigits: 3, minimumFractionDigits: 3 })} km³`;
