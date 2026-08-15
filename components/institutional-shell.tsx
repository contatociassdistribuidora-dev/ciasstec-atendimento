import type { ReactNode } from "react";
import { InstitutionalFooter } from "@/components/institutional-footer";
import { InstitutionalHeader } from "@/components/institutional-header";

export function InstitutionalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <InstitutionalHeader />
      {children}
      <InstitutionalFooter />
    </div>
  );
}
