import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { z } from "zod";
import toast, { Toaster } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { createInteraction, addInteractionOptimistic } from "../features/interactionSlice";
import { fetchHCPs } from "../features/hcpSlice";

const schema = z.object({
  hcp_id: z.number().min(1, "HCP is required."),
  interaction_type: z.string().min(1, "Select an interaction type."),
  date: z.string().min(1, "Date is required."),
  time: z.string().optional(),
  attendees: z.string().optional(),
  topics_discussed: z.string().optional(),
  voice_note_summary: z.string().optional(),
  materials_shared: z.string().optional(),
  samples_distributed: z.string().optional(),
  sentiment: z.string().optional(),
  outcomes: z.string().optional(),
  follow_up_actions: z.string().optional(),
});

export default function InteractionForm() {
  const dispatch = useDispatch();
  const { hcps, loading: hcpLoading } = useSelector((state) => state.hcp);
  const { loading: interactionLoading } = useSelector((state) => state.interaction);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      interaction_type: "visit",
      sentiment: "neutral",
      date: new Date().toISOString().split('T')[0],
    },
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showHCPDropdown, setShowHCPDropdown] = useState(false);
  const [selectedHCP, setSelectedHCP] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchHCPs({ search: searchTerm, limit: 10 }));
  }, [dispatch, searchTerm]);

  const filteredHCPs = hcps.filter((hcp) =>
    hcp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hcp.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hcp.hospital?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleHCPSelect = (hcp) => {
    setSelectedHCP(hcp);
    setValue("hcp_id", hcp.id);
    setShowHCPDropdown(false);
    setSearchTerm(hcp.name);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      // Optimistic update
      const optimisticInteraction = {
        id: Date.now(), // temporary ID
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      dispatch(addInteractionOptimistic(optimisticInteraction));
      
      // Actual API call
      await dispatch(createInteraction(data)).unwrap();
      toast.success("Interaction logged successfully!");
      reset({ 
        interaction_type: "visit", 
        sentiment: "neutral",
        date: new Date().toISOString().split('T')[0],
        hcp_id: selectedHCP?.id || "",
      });
      setSelectedHCP(null);
      setSearchTerm("");
    } catch (error) {
      toast.error("Failed to log interaction. Please try again.");
      console.error("Error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="w-full max-w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <Toaster position="top-right" />

      <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
          Interaction Details
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block relative">
            <span className="text-sm font-medium text-slate-700">HCP Name</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowHCPDropdown(true);
              }}
              onFocus={() => setShowHCPDropdown(true)}
              placeholder="Search or select HCP..."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
            {showHCPDropdown && filteredHCPs.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-2xl border border-slate-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                {filteredHCPs.map((hcp) => (
                  <div
                    key={hcp.id}
                    onClick={() => handleHCPSelect(hcp)}
                    className="px-4 py-3 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0"
                  >
                    <div className="text-sm font-medium text-slate-900">{hcp.name}</div>
                    <div className="text-xs text-slate-500">
                      {hcp.specialty} {hcp.hospital && `• ${hcp.hospital}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {errors.hcp_id && (
              <p className="mt-2 text-sm text-red-500">
                {errors.hcp_id.message}
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Interaction Type
            </span>
            <select
              {...register("interaction_type")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="visit">Visit</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="virtual">Virtual</option>
            </select>
            {errors.interaction_type && (
              <p className="mt-2 text-sm text-red-500">
                {errors.interaction_type.message}
              </p>
            )}
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Date</span>
            <input
              type="date"
              {...register("date")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Time</span>
            <input
              type="time"
              {...register("time")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Attendees</span>
          <input
            type="text"
            {...register("attendees")}
            placeholder="Enter names or search..."
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Topics Discussed
            </span>
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              🎙️ Summarize from Voice Note
            </button>
          </div>
          <textarea
            {...register("topics_discussed")}
            rows="4"
            placeholder="Enter key discussion points..."
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  Materials Shared
                </p>
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Search/Add
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">No materials added.</p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  Samples Distributed
                </p>
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Add Sample
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">No samples added.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <span className="inline-flex items-center gap-2">
              <input
                type="radio"
                value="positive"
                {...register("sentiment")}
                className="h-4 w-4 text-slate-900 focus:ring-slate-400"
              />
              Positive
            </span>
          </label>
          <label className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <span className="inline-flex items-center gap-2">
              <input
                type="radio"
                value="neutral"
                {...register("sentiment")}
                className="h-4 w-4 text-slate-900 focus:ring-slate-400"
              />
              Neutral
            </span>
          </label>
          <label className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <span className="inline-flex items-center gap-2">
              <input
                type="radio"
                value="negative"
                {...register("sentiment")}
                className="h-4 w-4 text-slate-900 focus:ring-slate-400"
              />
              Negative
            </span>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Outcomes</span>
          <textarea
            {...register("outcomes")}
            rows="3"
            placeholder="Key outcomes or agreements..."
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Follow-up Actions
          </span>
          <textarea
            {...register("follow_up_actions")}
            rows="3"
            placeholder="Enter next steps or tasks..."
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">
            AI Suggested Follow-ups
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="rounded-2xl bg-white p-3 shadow-sm">
              + Schedule follow-up meeting in 2 weeks
            </li>
            <li className="rounded-2xl bg-white p-3 shadow-sm">
              + Send OmcBoost Phase III PDF
            </li>
            <li className="rounded-2xl bg-white p-3 shadow-sm">
              + Add Dr. Sharma to advisory board invite list
            </li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={submitting || interactionLoading}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting || interactionLoading ? "Saving..." : "Log Interaction"}
        </button>
      </form>
    </section>
  );
}
