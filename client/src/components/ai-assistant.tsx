import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  from: "user" | "ai";
  text: string;
}

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { from: "ai", text: data.response }]);
    } catch (err) {
      setMessages((m) => [...m, { from: "ai", text: "Sorry, an error occurred." }]);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50"
        variant="secondary"
      >
        {open ? "Close Help" : "AI Help"}
      </Button>
      {open && (
        <div className="fixed bottom-20 right-4 w-80 bg-background border border-border rounded-md p-3 z-50 shadow-lg">
          <div className="max-h-60 overflow-y-auto space-y-2 mb-2 text-sm">
            {messages.map((msg, idx) => (
              <div key={idx} className={msg.from === "user" ? "text-right" : "text-left"}>
                <span className="whitespace-pre-wrap">{msg.text}</span>
              </div>
            ))}
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask how to use features..."
            className="mb-2"
            rows={3}
          />
          <Button onClick={sendMessage} className="w-full" size="sm">
            Send
          </Button>
        </div>
      )}
    </>
  );
}
