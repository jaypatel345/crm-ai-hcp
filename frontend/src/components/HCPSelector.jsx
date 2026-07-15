import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchHCPs, selectHCP, clearSelectedHCP } from "../features/hcpSlice";
import { fetchHCPInteractions } from "../features/interactionSlice";

export default function HCPSelector() {
  const dispatch = useDispatch();
  const { hcps, loading, error, selectedHCP } = useSelector((state) => state.hcp);
  const [query, setQuery] = useState(selectedHCP?.name || "");

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(fetchHCPs({ search: query, skip: 0, limit: 20 }));
    }, 250);
    return () => clearTimeout(timer);
  }, [dispatch, query]);

  useEffect(() => {
    setQuery(selectedHCP?.name || "");
  }, [selectedHCP]);

  const handleSelect = (hcp) => {
    dispatch(selectHCP(hcp));
    dispatch(fetchHCPInteractions(hcp.id));
    setQuery(hcp.name);
  };

  const handleClear = () => {
    dispatch(clearSelectedHCP());
    setQuery("");
  };

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">Search HCP</label>
      <div className="mt-2 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search HCP by name, specialty, hospital..."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        />
        {selectedHCP && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-2 max-h-44 overflow-auto rounded-2xl border border-slate-100 bg-white">
        {loading && (
          <div className="p-3 text-sm text-slate-500">Searching HCPs…</div>
        )}
        {!loading && error && (
          <div className="p-3 text-sm text-rose-600">
            Failed to search HCPs. Try again.
          </div>
        )}
        {!loading && !error && hcps.length === 0 && (
          <div className="p-3 text-sm text-slate-500">
            {query ? `No HCPs found for "${query}".` : "No HCPs available."}
          </div>
        )}
        {!loading &&
          !error &&
          hcps.map((hcp) => (
            <button
              key={hcp.id}
              type="button"
              onClick={() => handleSelect(hcp)}
              className={`w-full border-b border-slate-100 px-4 py-3 text-left text-sm last:border-0 hover:bg-slate-50 ${
                selectedHCP?.id === hcp.id ? "bg-slate-100" : ""
              }`}
            >
              <div className="font-medium text-slate-900">{hcp.name}</div>
              <div className="text-xs text-slate-500">
                {[hcp.specialty, hcp.hospital, hcp.city]
                  .filter(Boolean)
                  .join(" • ")}
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
