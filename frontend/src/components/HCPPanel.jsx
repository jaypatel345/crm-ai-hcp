import { useSelector } from "react-redux";
import HCPSelector from "./HCPSelector";
import InteractionHistory from "./InteractionHistory";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <span className="text-slate-600">{value}</span>
    </div>
  );
}

export default function HCPPanel() {
  const { selectedHCP } = useSelector((state) => state.hcp);
  const { currentHCPInteractions, historyLoading } = useSelector(
    (state) => state.interaction,
  );

  const lastInteraction = currentHCPInteractions[0] ?? null;

  return (
    <aside className="flex w-full min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 shrink-0">
        <h2 className="text-lg font-semibold text-slate-900">HCP Profile</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Search and select an HCP to view history.
        </p>
      </div>

      <div className="shrink-0">
        <HCPSelector />
      </div>

      {!selectedHCP ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">No HCP selected</p>
          <p className="mt-2 text-xs text-slate-500">
            Search above to view interaction history, last meeting notes, and
            follow-up actions.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-base font-semibold text-slate-900">
              {selectedHCP.name}
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              {selectedHCP.specialty || "Specialty not listed"}
            </p>
            <div className="mt-3 space-y-1.5">
              <DetailRow label="Hospital" value={selectedHCP.hospital} />
              <DetailRow label="City" value={selectedHCP.city} />
              <DetailRow label="Phone" value={selectedHCP.phone} />
              <DetailRow label="Email" value={selectedHCP.email} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Interactions
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {historyLoading ? "…" : currentHCPInteractions.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Last Meeting
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {historyLoading
                  ? "Loading…"
                  : formatDate(lastInteraction?.date)}
              </p>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-5">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Previous Notes
              </p>
              {historyLoading ? (
                <p className="mt-2 text-sm text-slate-500">Loading notes…</p>
              ) : lastInteraction ? (
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {lastInteraction.voice_note_summary ||
                    lastInteraction.topics_discussed ||
                    lastInteraction.outcomes ||
                    "No notes recorded for the latest interaction."}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No previous interactions yet.
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Next Follow-up
              </p>
              {historyLoading ? (
                <p className="mt-2 text-sm text-slate-500">Loading…</p>
              ) : lastInteraction?.follow_up_actions ? (
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {lastInteraction.follow_up_actions}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No follow-up actions suggested yet.
                </p>
              )}
            </div>
          </div>

          <InteractionHistory />
        </div>
      )}
    </aside>
  );
}
