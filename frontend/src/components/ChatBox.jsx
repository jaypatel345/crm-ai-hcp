export default function ChatBox() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Conversation</h2>
          <p className="text-sm text-slate-500">
            Latest AI interaction history.
          </p>
        </div>
      </div>
      <div className="space-y-4 text-slate-700">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">AI Assistant</p>
          <p className="mt-2 text-sm">
            Welcome to your CRM HCP assistant. Ask a question to get started.
          </p>
        </div>
      </div>
    </section>
  );
}
