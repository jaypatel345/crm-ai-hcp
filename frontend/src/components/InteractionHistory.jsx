import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchHCPInteractions } from "../features/interactionSlice";
import InteractionEditModal from "./InteractionEditModal";

function formatDate(value) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sentimentClass(sentiment) {
  if (sentiment === "positive") return "bg-emerald-100 text-emerald-700";
  if (sentiment === "negative") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

export default function InteractionHistory() {
  const dispatch = useDispatch();
  const { selectedHCP } = useSelector((state) => state.hcp);
  const { currentHCPInteractions, historyLoading, error } = useSelector(
    (state) => state.interaction,
  );
  const [editingInteraction, setEditingInteraction] = useState(null);

  useEffect(() => {
    if (selectedHCP) {
      dispatch(fetchHCPInteractions(selectedHCP.id));
    }
  }, [dispatch, selectedHCP]);

  if (!selectedHCP) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between border-t border-slate-200 pt-5">
        <h3 className="text-sm font-semibold text-slate-700">
          Interaction History
        </h3>
        <button
          type="button"
          onClick={() => dispatch(fetchHCPInteractions(selectedHCP.id))}
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Refresh
        </button>
      </div>

      {historyLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl border border-slate-100 bg-white p-4"
            >
              <div className="h-4 w-1/3 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-full rounded bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {!historyLoading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load interaction history.{" "}
          <button
            type="button"
            onClick={() => dispatch(fetchHCPInteractions(selectedHCP.id))}
            className="font-medium underline"
          >
            Try again
          </button>
        </div>
      )}

      {!historyLoading && !error && currentHCPInteractions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm font-medium text-slate-700">
            No interactions yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Log an interaction using the form or chat to see history here.
          </p>
        </div>
      )}

      {!historyLoading && !error && currentHCPInteractions.length > 0 && (
        <ul className="space-y-3">
          {currentHCPInteractions.map((interaction) => (
            <li
              key={interaction.id}
              className={`rounded-2xl border bg-white p-4 ${
                interaction._optimistic
                  ? "border-amber-200 bg-amber-50/40"
                  : "border-slate-100"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium capitalize text-slate-900">
                      {interaction.interaction_type}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(interaction.date)}
                    </span>
                    {interaction._optimistic && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        Saving
                      </span>
                    )}
                  </div>
                  {interaction.sentiment && (
                    <span
                      className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sentimentClass(interaction.sentiment)}`}
                    >
                      {interaction.sentiment}
                    </span>
                  )}
                </div>
                {!interaction._optimistic && (
                  <button
                    type="button"
                    onClick={() => setEditingInteraction(interaction)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                )}
              </div>

              <p className="mt-3 text-sm text-slate-700">
                {interaction.topics_discussed ||
                  interaction.voice_note_summary ||
                  interaction.outcomes ||
                  "No details recorded."}
              </p>

              {interaction.follow_up_actions && (
                <p className="mt-2 text-xs text-slate-500">
                  Follow-up: {interaction.follow_up_actions}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <InteractionEditModal
        interaction={editingInteraction}
        onClose={() => setEditingInteraction(null)}
      />
    </div>
  );
}
