import type { ReactNode } from "react";

/** A plain app page in the surface frame: title top left, the page's actions top right. */
export function Page({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 p-2 pt-0 md:pl-0 md:pt-2">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-surface">
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto grid max-w-[1040px] gap-6 px-4 py-5 pb-16 sm:px-8 sm:py-6">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="m-0 text-xl font-semibold leading-7 tracking-[-0.015em]">{title}</h1>
              {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            </header>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
