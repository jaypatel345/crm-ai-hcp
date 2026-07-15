import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchHCPInteractions } from "../features/interactionSlice";

export default function InteractionHistory() {
  const dispatch = useDispatch();
  const { selectedHCP } = useSelector((s) => s.hcp);
  const { currentHCPInteractions, loading } = useSelector((s) => s.interaction);

  useEffect(() => {
    if (selectedHCP) dispatch(fetchHCPInteractions(selectedHCP.id));
  }, [dispatch, selectedHCP]);

  if (!selectedHCP) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-slate-700">
        Interaction History
      </h3>
      {loading && <div className="text-sm text-slate-500 mt-2">Loading...</div>}
      {!loading && currentHCPInteractions.length === 0 && (
        <div className="text-sm text-slate-500 mt-2">No interactions yet.</div>
      )}
      <ul className="mt-3 space-y-3">
        {currentHCPInteractions.map((it) => (
          <li
            key={it.id}
            className="rounded-2xl border border-slate-100 bg-white p-3"
          >
            <div className="text-sm font-medium text-slate-900">
              {it.interaction_type} • {it.date}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              {it.topics_discussed || it.outcomes}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
