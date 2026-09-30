"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded border border-[#ddd6c7] bg-white px-3 py-1.5 text-[#1b1b1a] hover:border-[#1b1b1a]">
      Print / save as PDF
    </button>
  );
}
