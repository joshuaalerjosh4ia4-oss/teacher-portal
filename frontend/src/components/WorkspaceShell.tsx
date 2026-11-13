import type { ReactNode } from "react";
import { Logo } from "./Brand";
import type { User } from "../types";
import type { Page } from "../navigation/routes";

interface WorkspaceShellProps {
  user: User;
  page: Page;
  pages: Array<{ id: Page; label: string; icon: ReactNode }>;
  notice: string;
  navigateToPage: (page: Page) => void;
  showAuth: (message?: string) => void;
  setNotice: (value: string) => void;
  children: ReactNode;
}

export function WorkspaceShell({
  user,
  page,
  pages,
  notice,
  navigateToPage,
  showAuth,
  setNotice,
  children,
}: WorkspaceShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Logo />
        <div className="account">
          <div className="account-copy">
            <div className="account-name">{user.username}</div>
            <div className="account-role">Teacher</div>
          </div>
          <span className="avatar" aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</span>
          <button className="button button-secondary button-small" type="button" onClick={() => showAuth()}>
            Sign out
          </button>
        </div>
      </header>
      <div className="portal-layout">
        <aside className="sidebar">
          <p className="sidebar-label">Workspace</p>
          <nav className="nav-list" aria-label="Teacher workspace">
            {pages.map((item) => (
              <button
                className={`nav-item ${page === item.id ? "active" : ""}`}
                type="button"
                key={item.id}
                aria-current={page === item.id ? "page" : undefined}
                onClick={() => navigateToPage(item.id)}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>
        <main className="main-content">{children}</main>
      </div>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button>
        </div>
      )}
    </div>
  );
}
