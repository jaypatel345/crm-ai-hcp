import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sendChatMessage, addMessage } from "../features/interactionSlice";
import toast from "react-hot-toast";

export default function ChatBox() {
  const dispatch = useDispatch();
  const { messages, chatLoading } = useSelector((state) => state.interaction);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message to chat
    dispatch(addMessage({ role: "user", content: userMessage }));

    try {
      await dispatch(sendChatMessage(userMessage)).unwrap();
    } catch (error) {
      // The thunk may throw a string (rejectWithValue) or an Axios error
      const serverDetail =
        (typeof error === "string" && error) ||
        error?.response?.data?.detail ||
        error?.message ||
        JSON.stringify(error);
      toast.error(
        serverDetail.length < 200
          ? serverDetail
          : "Failed to get AI response. Check server logs.",
      );
      console.error("Error sending chat message:", error);
    }
  };

  return (
    <section className="w-full max-w-full flex min-h-160 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            AI Assistant
          </h2>
          <p className="text-sm text-slate-500">
            Log interaction details here via chat.
          </p>
        </div>
      </div>

      <div className="mb-6 flex-1 space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-4 max-h-96">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <p className="text-sm">
              Start a conversation with the AI assistant
            </p>
            <p className="text-xs mt-2">
              Try: "Log a meeting with Dr. Sharma about diabetes medication"
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`rounded-3xl p-4 ${
                message.role === "user"
                  ? "bg-slate-100 ml-8"
                  : "bg-white shadow-sm mr-8"
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
          <div className="rounded-3xl bg-white p-4 shadow-sm mr-8">
            <p className="text-sm text-slate-500">AI is thinking...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <textarea
          rows="4"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the interaction or ask a follow-up question..."
          className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          disabled={chatLoading}
        />
        <button
          type="submit"
          disabled={chatLoading || !input.trim()}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {chatLoading ? "Sending..." : "Send Message"}
        </button>
      </form>
    </section>
  );
}
