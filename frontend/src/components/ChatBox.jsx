import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  sendChatMessage,
  addMessage,
  fetchHCPInteractions,
  fetchInteractions,
  clearFormPrefill,
  confirmAndSaveInteraction,
} from "../features/interactionSlice";
import { fetchHCPs, selectHCP } from "../features/hcpSlice";
import toast from "react-hot-toast";

const LOGGED_KEYWORDS = [
  "logged successfully",
  "interaction saved",
  "interaction logged",
  "updated successfully",
];

function shouldRefreshHistory(response) {
  const text = response?.toLowerCase() || "";
  return LOGGED_KEYWORDS.some((keyword) => text.includes(keyword));
}

export default function ChatBox() {
  const dispatch = useDispatch();
  const { messages, chatLoading, error, formPrefill } = useSelector(
    (state) => state.interaction,
  );
  const { selectedHCP } = useSelector((state) => state.hcp);
  const [input, setInput] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatLoading]);

  // Show notification when form prefill is available
  useEffect(() => {
    if (formPrefill) {
      // Check if this is a confirmation request (prefill_only is true)
      if (formPrefill.data?.prefill_only === true) {
        setShowConfirmation(true);
      } else {
        toast.success("Form prefilled with AI suggestions. Review and save.", {
          duration: 4000,
        });
      }
    }
  }, [formPrefill]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    dispatch(addMessage({ role: "user", content: userMessage }));

    try {
      const result = await dispatch(sendChatMessage(userMessage)).unwrap();
      
      // Handle successful interaction logging
      if (result.action === "log_interaction" && result.prefill?.success) {
        toast.success(result.prefill.message || "Interaction logged successfully!");
        
        // Refresh HCP list to include newly created HCP
        dispatch(fetchHCPs({ search: "", limit: 100 }));
        
        // Select the newly created HCP if we have the ID
        if (result.prefill.hcp_id) {
          dispatch(selectHCP({ id: result.prefill.hcp_id, name: result.prefill.hcp_name }));
          // Refresh interaction history for the new HCP
          dispatch(fetchHCPInteractions(result.prefill.hcp_id));
        }
        
        // Also refresh all interactions
        dispatch(fetchInteractions());
      } else if (selectedHCP && shouldRefreshHistory(result.response)) {
        dispatch(fetchHCPInteractions(selectedHCP.id));
      }
    } catch (err) {
      const serverDetail =
        (typeof err === "string" && err) ||
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to get AI response.";
      toast.error(
        serverDetail.length < 200
          ? serverDetail
          : "Failed to get AI response. Check server logs.",
      );
      console.error("Error sending chat message:", err);
    }
  };

  const handleConfirmSave = async () => {
    if (!formPrefill?.data) return;
    
    try {
      const result = await dispatch(confirmAndSaveInteraction(formPrefill.data)).unwrap();
      
      // Handle successful save
      if (result.action === "log_interaction" && result.prefill?.success) {
        toast.success(result.prefill.message || "Interaction logged successfully!");
        
        // Refresh HCP list to include newly created HCP
        dispatch(fetchHCPs({ search: "", limit: 100 }));
        
        // Select the newly created HCP if we have the ID
        if (result.prefill.hcp_id) {
          dispatch(selectHCP({ id: result.prefill.hcp_id, name: result.prefill.hcp_name }));
          // Refresh interaction history for the new HCP
          dispatch(fetchHCPInteractions(result.prefill.hcp_id));
        }
        
        // Also refresh all interactions
        dispatch(fetchInteractions());
      }
      
      setShowConfirmation(false);
    } catch (err) {
      const serverDetail =
        (typeof err === "string" && err) ||
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to save interaction.";
      toast.error(
        serverDetail.length < 200
          ? serverDetail
          : "Failed to save interaction. Check server logs.",
      );
      console.error("Error confirming save:", err);
    }
  };

  const handleCancelSave = () => {
    dispatch(clearFormPrefill());
    setShowConfirmation(false);
  };

  return (
    <section className="flex min-h-[28rem] w-full min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)]">
      <div className="mb-4 shrink-0">
        <h2 className="text-lg font-semibold text-slate-900">AI Assistant</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Log interactions or ask about HCP history via chat.
        </p>
      </div>

      {selectedHCP ? (
        <div className="mb-4 shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
          Chatting in context of{" "}
          <span className="font-semibold text-slate-900">
            {selectedHCP.name}
          </span>
        </div>
      ) : (
        <div className="mb-4 shrink-0 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
          Select an HCP below the form for contextual history updates.
        </div>
      )}

      {error && !chatLoading && (
        <div className="mb-4 shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {error}
        </div>
      )}

      {formPrefill && (
        <div className="mb-4 shrink-0 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <div className="flex items-center justify-between">
            <span>
              <strong>AI Prefill:</strong> Form populated with extracted data.
            </span>
            <button
              onClick={() => dispatch(clearFormPrefill())}
              className="ml-4 text-emerald-600 hover:text-emerald-800 underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {showConfirmation && formPrefill?.data?.prefill_only === true && (
        <div className="mb-4 shrink-0 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <div className="mb-3">
            <strong>Confirm Save:</strong> Would you like to save this interaction with the information provided?
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmSave}
              disabled={chatLoading}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {chatLoading ? "Saving..." : "Save Interaction"}
            </button>
            <button
              onClick={handleCancelSave}
              disabled={chatLoading}
              className="inline-flex items-center justify-center rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <p className="text-sm">Start a conversation with the AI assistant</p>
            <p className="text-xs mt-2">
              Try: &quot;Log a meeting with Dr. Sharma about diabetes
              medication&quot;
            </p>
            <p className="text-xs mt-1">
              Or: &quot;Show my previous meetings with Dr. Sharma&quot;
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`rounded-2xl p-3 ${
                message.role === "user"
                  ? "ml-6 bg-slate-100"
                  : "mr-6 bg-white shadow-sm"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">
                {message.role === "user" ? "You" : "AI Assistant"}
              </p>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          ))
        )}
        {chatLoading && (
          <div className="mr-6 rounded-2xl bg-white p-3 shadow-sm">
            <p className="text-sm text-slate-500">AI is thinking...</p>
            <p className="text-xs text-slate-400 mt-1">This may take a few seconds</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-auto shrink-0 space-y-3">
        <textarea
          rows="3"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            selectedHCP
              ? `Ask about ${selectedHCP.name} or log a new interaction...`
              : "Describe the interaction or ask a follow-up question..."
          }
          className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          disabled={chatLoading}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={chatLoading || !input.trim()}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {chatLoading ? "Sending..." : "Send Message"}
        </button>
      </div>
    </section>
  );
}
