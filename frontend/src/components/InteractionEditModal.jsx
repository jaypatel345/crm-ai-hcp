import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  updateInteraction,
  updateInteractionOptimistic,
  removeInteractionOptimistic,
  setEditingId,
  clearFormPrefill,
} from "../features/interactionSlice";

const schema = z.object({
  interaction_type: z.string().min(1, "Interaction type is required."),
  date: z.string().min(1, "Date is required."),
  time: z.string().optional(),
  attendees: z.string().optional(),
  topics_discussed: z.string().optional(),
  voice_note_summary: z.string().optional(),
  sentiment: z.string().optional(),
  outcomes: z.string().optional(),
  follow_up_actions: z.string().optional(),
});

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export default function InteractionEditModal({ interaction, onClose }) {
  const dispatch = useDispatch();
  const { loading, formPrefill } = useSelector((state) => state.interaction);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!interaction) return;
    reset({
      interaction_type: interaction.interaction_type || "visit",
      date: toDateInput(interaction.date),
      time: interaction.time || "",
      attendees: interaction.attendees || "",
      topics_discussed: interaction.topics_discussed || "",
      voice_note_summary: interaction.voice_note_summary || "",
      sentiment: interaction.sentiment || "neutral",
      outcomes: interaction.outcomes || "",
      follow_up_actions: interaction.follow_up_actions || "",
    });
    dispatch(setEditingId(interaction.id));
  }, [interaction, reset, dispatch]);

  // Handle form prefill from AI for edit actions
  useEffect(() => {
    if (formPrefill && formPrefill.action === "edit_interaction") {
      const data = formPrefill.data;
      
      // Only apply if this modal is open and matches the interaction
      if (interaction && data.interaction_id === interaction.id) {
        if (data.interaction_type) setValue("interaction_type", data.interaction_type);
        if (data.date) setValue("date", toDateInput(data.date));
        if (data.time) setValue("time", data.time);
        if (data.attendees) setValue("attendees", data.attendees);
        if (data.topics_discussed) setValue("topics_discussed", data.topics_discussed);
        if (data.voice_note_summary) setValue("voice_note_summary", data.voice_note_summary);
        if (data.sentiment) setValue("sentiment", data.sentiment);
        if (data.outcomes) setValue("outcomes", data.outcomes);
        if (data.follow_up_actions) setValue("follow_up_actions", data.follow_up_actions);
        
        // Clear prefill after applying
        dispatch(clearFormPrefill());
        toast.success("Form prefilled with AI suggestions.");
      }
    }
  }, [formPrefill, interaction, setValue, dispatch]);

  const handleClose = () => {
    dispatch(setEditingId(null));
    onClose();
  };

  const onSubmit = async (data) => {
    const previous = { ...interaction };
    const optimistic = {
      ...interaction,
      ...data,
      updated_at: new Date().toISOString(),
    };

    dispatch(updateInteractionOptimistic(optimistic));

    try {
      await dispatch(
        updateInteraction({
          id: interaction.id,
          ...data,
          date: new Date(data.date).toISOString(),
        }),
      ).unwrap();
      toast.success("Interaction updated.");
      handleClose();
    } catch (error) {
      dispatch(removeInteractionOptimistic(optimistic.id));
      dispatch(updateInteractionOptimistic(previous));
      toast.error("Failed to update interaction.");
      console.error(error);
    }
  };

  if (!interaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Edit Interaction
            </h3>
            <p className="text-sm text-slate-500">
              Update details for interaction #{interaction.id}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Type</span>
            <select
              {...register("interaction_type")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            >
              <option value="visit">Visit</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="virtual">Virtual</option>
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Date</span>
              <input
                type="date"
                {...register("date")}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-500">{errors.date.message}</p>
              )}
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Time</span>
              <input
                type="time"
                {...register("time")}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Attendees</span>
            <input
              type="text"
              {...register("attendees")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Topics</span>
            <textarea
              rows="3"
              {...register("topics_discussed")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Summary</span>
            <textarea
              rows="3"
              {...register("voice_note_summary")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Sentiment</span>
            <select
              {...register("sentiment")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            >
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Outcomes</span>
            <textarea
              rows="2"
              {...register("outcomes")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Follow-up Actions
            </span>
            <textarea
              rows="2"
              {...register("follow_up_actions")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
