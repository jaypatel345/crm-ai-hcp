import ChatBox from "../components/ChatBox";
import InteractionForm from "../components/InteractionForm";

export default function Home() {
  return (
    <div className="w-full max-w-full space-y-8">
      <div className="grid gap-8 w-full max-w-full items-start lg:grid-cols-[1.8fr_1fr]">
        <InteractionForm />
        <ChatBox />
      </div>
    </div>
  );
}
