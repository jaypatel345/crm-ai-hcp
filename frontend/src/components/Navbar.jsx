export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">CRM AI HCP</h2>
          <p className="text-sm text-slate-500">
            FastAPI + React + Tailwind + AI agent
          </p>
        </div>
      </div>
    </header>
  );
}
