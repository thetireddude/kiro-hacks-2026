import VoiceConversation from "@/components/VoiceConversation";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center gap-2 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Voice Conversation
        </h1>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Click start, then speak naturally. The AI will listen and respond by
          voice. Your conversation continues hands-free.
        </p>
      </div>

      <VoiceConversation />
    </main>
  );
}
