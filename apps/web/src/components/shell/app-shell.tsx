import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { AppNavigation } from "@/components/shell/app-navigation";
import { Icon } from "@/components/ui/icon";

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 rounded-lg">
      <span className="flex size-10 items-center justify-center rounded-xl bg-action-soft text-action">
        <Icon name="wallet" />
      </span>
      <span>
        <span className="block text-lg font-semibold tracking-tight text-ink">
          Ledger AI
        </span>
        <span className="block text-xs text-muted">
          Private finance, clearly.
        </span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <aside className="glass-surface fixed inset-y-0 left-0 z-30 hidden w-[280px] border-y-0 border-l-0 px-4 py-6 lg:flex lg:flex-col">
        <Brand />
        <div className="mt-8 overflow-y-auto pr-1">
          <Suspense fallback={null}>
            <AppNavigation />
          </Suspense>
        </div>
        <div className="mt-auto rounded-xl border border-border bg-surface/80 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="size-2 rounded-full bg-success" />
            Private by design
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            Financial facts are durable. Raw capture media is temporary.
          </p>
        </div>
      </aside>
      <div className="lg:pl-[280px]">
        <header className="glass-surface sticky top-0 z-20 flex h-16 items-center justify-between border-x-0 border-t-0 px-4 sm:px-6 lg:px-10">
          <div className="lg:hidden">
            <Brand />
          </div>
          <p className="hidden text-sm text-muted lg:block">
            Your personal financial ledger
          </p>
          <Link
            className="button-primary min-h-10 px-3 text-xs sm:px-4 sm:text-sm"
            href="/capture"
          >
            <Icon className="size-4" name="plus" />
            <span>Quick capture</span>
          </Link>
        </header>
        <main className="mx-auto w-full max-w-[1280px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pb-10 lg:pt-10">
          {children}
        </main>
      </div>
      <div className="glass-surface fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 lg:hidden">
        <Suspense fallback={null}>
          <AppNavigation mobile />
        </Suspense>
      </div>
    </div>
  );
}
