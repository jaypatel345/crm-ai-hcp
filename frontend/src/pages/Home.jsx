import ChatBox from "../components/ChatBox";
import InteractionForm from "../components/InteractionForm";
import HCPPanel from "../components/HCPPanel";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      <header className="rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Log Interaction</h1>
        <p className="mt-1 text-sm text-slate-500">
          Use the structured form or AI chat to log HCP interactions. Select an
          HCP below the form to view history and follow-ups.
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <div className="flex min-w-0 flex-col gap-6">
          <InteractionForm />
          <HCPPanel />
        </div>
        <ChatBox />
      </div>
    </div>
  );
}
