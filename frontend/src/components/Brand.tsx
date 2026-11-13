export function Logo() {
  return (
    <div className="brand-lockup">
      <img className="brand-mark" src="/assets/Logosplash.png" alt="" aria-hidden="true" />
      <span className="brand-name">
        MyClaSSes
        <span className="brand-caption">TEACHER WORKSPACE</span>
      </span>
    </div>
  );
}

export function ErrorBanner({ children }: { children: string }) {
  return <div className="error-banner" role="alert">{children}</div>;
}
