import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { z } from "zod";
import toast, { Toaster } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import {
  createInteraction,
  addInteractionOptimistic,
  removeInteractionOptimistic,
  fetchHCPInteractions,
  clearFormPrefill,
} from "../features/interactionSlice";
import { fetchHCPs, selectHCP } from "../features/hcpSlice";

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

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function FormSection({ title, children }) {
  return (
    <div className="border-t border-slate-200 pt-5 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, error, className = "", children }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </label>
  );
}

export default function InteractionForm() {
  const dispatch = useDispatch();
  const { hcps, loading: hcpLoading, selectedHCP } = useSelector(
    (state) => state.hcp,
  );
  const { loading: interactionLoading, formPrefill } = useSelector(
    (state) => state.interaction,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      interaction_type: "visit",
      sentiment: "neutral",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [showHCPDropdown, setShowHCPDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchHCPs({ search: searchTerm, limit: 10 }));
  }, [dispatch, searchTerm]);

  useEffect(() => {
    if (!selectedHCP) return;
    setValue("hcp_id", selectedHCP.id);
    setSearchTerm(selectedHCP.name);
  }, [selectedHCP, setValue]);

  // Handle form prefill from AI
  useEffect(() => {
    if (formPrefill && formPrefill.action === "log_interaction") {
      const data = formPrefill.prefill;
      
      if (!data) return;
      
      // If it's a successful save (prefill_only is false or success is true), reset form
      if (data.prefill_only === false || data.success === true) {
        // This was a successful save, reset form
        reset({
          interaction_type: "visit",
          sentiment: "neutral",
          date: new Date().toISOString().split("T")[0],
          hcp_id: selectedHCP?.id || undefined,
        });
        dispatch(clearFormPrefill());
        return;
      }
      
      // Refresh HCP list to ensure newly created HCPs are available
      const handlePrefill = async () => {
        // First refresh with empty search to get all HCPs including newly created ones
        await dispatch(fetchHCPs({ search: "", limit: 100 }));
        
        // Map prefill data to form fields (replace mode - don't append)
        if (data.hcp_id) {
          setValue("hcp_id", data.hcp_id);
          
          // Try to find HCP in refreshed list first
          const hcp = hcps.find(h => h.id === data.hcp_id);
          if (hcp) {
            setSearchTerm(hcp.name);
            dispatch(selectHCP(hcp));
          } else if (data.hcp_details) {
            // Use HCP details from backend response if not in list yet
            setSearchTerm(data.hcp_details.name);
            // Dispatch selectHCP with the full HCP details object
            dispatch(selectHCP({ 
              id: data.hcp_details.id, 
              name: data.hcp_details.name,
              specialty: data.hcp_details.specialty,
              hospital: data.hcp_details.hospital,
              city: data.hcp_details.city,
              phone: data.hcp_details.phone,
              email: data.hcp_details.email
            }));
          } else if (data.hcp_name) {
            // Fallback to name
            setSearchTerm(data.hcp_name);
          }
        } else if (data.hcp_name) {
          setSearchTerm(data.hcp_name);
        }
        
        // Only set values if they are provided (not null/undefined/empty)
        if (data.interaction_type) setValue("interaction_type", data.interaction_type);
        if (data.date) setValue("date", data.date);
        if (data.time) setValue("time", data.time);
        if (data.topics_discussed) setValue("topics_discussed", data.topics_discussed);
        if (data.voice_note_summary) setValue("voice_note_summary", data.voice_note_summary);
        if (data.attendees) setValue("attendees", data.attendees);
        if (data.materials_shared) setValue("materials_shared", data.materials_shared);
        if (data.samples_distributed) setValue("samples_distributed", data.samples_distributed);
        if (data.sentiment) setValue("sentiment", data.sentiment);
        if (data.outcomes) setValue("outcomes", data.outcomes);
        if (data.follow_up_actions) setValue("follow_up_actions", data.follow_up_actions);
        
        // Clear prefill after setting values
        dispatch(clearFormPrefill());
      };
      
      handlePrefill();
    }
  }, [formPrefill, hcps, setValue, dispatch, watch, reset, selectedHCP]);

  const filteredHCPs = hcps.filter(
    (hcp) =>
      hcp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hcp.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hcp.hospital?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleHCPSelect = (hcp) => {
    dispatch(selectHCP(hcp));
    setValue("hcp_id", hcp.id);
    setShowHCPDropdown(false);
    setSearchTerm(hcp.name);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    const tempId = -Date.now();
    const payload = {
      ...data,
      date: new Date(data.date).toISOString(),
    };

    dispatch(
      addInteractionOptimistic({
        id: tempId,
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    );

    try {
      await dispatch(createInteraction(payload)).unwrap();
      toast.success("Interaction logged successfully!");
      reset({
        interaction_type: "visit",
        sentiment: "neutral",
        date: new Date().toISOString().split("T")[0],
        hcp_id: selectedHCP?.id || undefined,
      });
      if (selectedHCP) {
        dispatch(fetchHCPInteractions(selectedHCP.id));
      }
    } catch (error) {
      dispatch(removeInteractionOptimistic(tempId));
      toast.error("Failed to log interaction. Please try again.");
      console.error("Error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="w-full min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <Toaster position="top-right" />

      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">Structured Form</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Log interactions with full field-level control.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <FormSection title="Who & When">
          <Field label="HCP Name" error={errors.hcp_id?.message}>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowHCPDropdown(true);
                }}
                onFocus={() => setShowHCPDropdown(true)}
                onBlur={() =>
                  setTimeout(() => setShowHCPDropdown(false), 150)
                }
                placeholder="Search or select HCP..."
                className={inputClass}
              />
              {hcpLoading && (
                <p className="mt-1 text-xs text-slate-500">Searching HCPs…</p>
              )}
              {showHCPDropdown && filteredHCPs.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                  {filteredHCPs.map((hcp) => (
                    <button
                      type="button"
                      key={hcp.id}
                      onClick={() => handleHCPSelect(hcp)}
                      className="w-full border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-slate-50"
                    >
                      <div className="text-sm font-medium text-slate-900">
                        {hcp.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {hcp.specialty}
                        {hcp.hospital && ` • ${hcp.hospital}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showHCPDropdown &&
                !hcpLoading &&
                searchTerm &&
                filteredHCPs.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-lg">
                    No HCPs found for &quot;{searchTerm}&quot;.
                  </div>
                )}
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label="Type"
              error={errors.interaction_type?.message}
            >
              <select {...register("interaction_type")} className={inputClass}>
                <option value="visit">Visit</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="virtual">Virtual</option>
              </select>
            </Field>

            <Field label="Date">
              <input type="date" {...register("date")} className={inputClass} />
            </Field>

            <Field label="Time">
              <input type="time" {...register("time")} className={inputClass} />
            </Field>
          </div>

          <Field label="Attendees">
            <input
              type="text"
              {...register("attendees")}
              placeholder="Names of people present..."
              className={inputClass}
            />
          </Field>
        </FormSection>

        <FormSection title="Discussion">
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Topics Discussed">
              <textarea
                {...register("topics_discussed")}
                rows="3"
                placeholder="Key discussion points..."
                className={inputClass}
              />
            </Field>

            <Field label="Voice Note Summary">
              <textarea
                {...register("voice_note_summary")}
                rows="3"
                placeholder="AI-generated or manual summary..."
                className={inputClass}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Materials">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Materials Shared">
              <input
                type="text"
                {...register("materials_shared")}
                placeholder="Brochures, PDFs, links..."
                className={inputClass}
              />
            </Field>

            <Field label="Samples Distributed">
              <input
                type="text"
                {...register("samples_distributed")}
                placeholder="Sample names or quantities..."
                className={inputClass}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Outcome">
          <div>
            <span className="text-sm font-medium text-slate-700">Sentiment</span>
            <div className="mt-2 flex flex-wrap gap-4">
              {["positive", "neutral", "negative"].map((value) => (
                <label
                  key={value}
                  className="inline-flex items-center gap-2 text-sm text-slate-700"
                >
                  <input
                    type="radio"
                    value={value}
                    {...register("sentiment")}
                    className="h-4 w-4 text-slate-900 focus:ring-slate-400"
                  />
                  <span className="capitalize">{value}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Outcomes">
              <textarea
                {...register("outcomes")}
                rows="2"
                placeholder="Key outcomes or agreements..."
                className={inputClass}
              />
            </Field>

            <Field label="Follow-up Actions">
              <textarea
                {...register("follow_up_actions")}
                rows="2"
                placeholder="Next steps or tasks..."
                className={inputClass}
              />
            </Field>
          </div>
        </FormSection>

        <button
          type="submit"
          disabled={submitting || interactionLoading}
          className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[10rem]"
        >
          {submitting || interactionLoading ? "Saving..." : "Log Interaction"}
        </button>
      </form>
    </section>
  );
}
