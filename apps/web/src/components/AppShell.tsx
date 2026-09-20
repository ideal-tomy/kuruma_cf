import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from './ui/Button';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold',
    isActive ? 'text-accent' : 'text-ink-3',
  ].join(' ');

export function AppShell() {
  const { logout } = useAuth();

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-bg">
      <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur-sm">
        <h1 className="text-lg font-bold text-ink">Shaken Notify</h1>
        <Button variant="ghost" className="min-h-11 px-2 py-1 text-xs" onClick={() => logout()}>
          ログアウト
        </Button>
      </header>

      <main className="flex-1 px-4 py-5 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-border bg-surface/95 backdrop-blur-sm">
        <div className="flex px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <NavLink to="/" end className={linkClass}>
            ホーム
          </NavLink>
          <NavLink to="/customers" className={linkClass}>
            顧客
          </NavLink>
          <NavLink to="/line-unmatched" className={linkClass}>
            LINE
          </NavLink>
          <NavLink to="/history" className={linkClass}>
            履歴
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
