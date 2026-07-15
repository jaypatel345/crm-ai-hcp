import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchHCPs, selectHCP } from "../features/hcpSlice";

export default function HCPSelector() {
  const dispatch = useDispatch();
  const { hcps, loading, selectedHCP } = useSelector((s) => s.hcp);
  const [query, setQuery] = useState("");

  useEffect(() => {
    dispatch(fetchHCPs({ search: "", skip: 0, limit: 20 }));
  }, [dispatch]);

  const onSearch = (e) => {
    setQuery(e.target.value);
    dispatch(fetchHCPs({ search: e.target.value, skip: 0, limit: 20 }));
  };

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">HCP</label>
      <div className="mt-2">
        <input
          value={query}
          onChange={onSearch}
          placeholder="Search HCP by name..."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
        />
      </div>

      <div className="mt-2 max-h-40 overflow-auto rounded-md border border-slate-100 bg-white">
        {loading && (
          <div className="p-3 text-sm text-slate-500">Searching...</div>
        )}
        {!loading && hcps.length === 0 && (
          <div className="p-3 text-sm text-slate-500">No HCPs found.</div>
        )}
        {!loading &&
          hcps.map((h) => (
            <button
              key={h.id}
              onClick={() => dispatch(selectHCP(h))}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${selectedHCP?.id === h.id ? "bg-slate-100" : ""}`}
            >
              <div className="font-medium text-slate-900">{h.name}</div>
              <div className="text-xs text-slate-500">
                {h.specialty} • {h.city}
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
