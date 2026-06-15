export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md"
            style={{ background: "linear-gradient(140deg, var(--accent), var(--accent-hover))" }}
          >
            A
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Atlas OS</h1>
          <p className="mt-1 text-sm text-muted">Your personal operating system</p>
        </div>
        <div className="card animate-pop-in p-6 shadow-lg">{children}</div>
      </div>
    </div>
  );
}
