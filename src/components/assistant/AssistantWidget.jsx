import { useState, useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useMutation } from "@tanstack/react-query"
import { MessageCircle, X, Send, Bot, User } from "lucide-react"
import { sendChatMessage } from "@/api/assistant"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function AssistantWidget() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")

  const [messages, setMessages] = useState([
    { role: "assistant", text: t("assistant.welcomeMessage") }, // ← vuelve a usar t()
  ])
  const scrollRef = useRef(null)

  const mutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }])
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: t("assistant.errorMessage"), isError: true },
      ])
    },
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, mutation.isPending])

  function handleSend(e) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || mutation.isPending) return

    setMessages((prev) => [...prev, { role: "user", text: trimmed }])
    mutation.mutate(trimmed)
    setInput("")
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[480px] rounded-xl border border-[#221F3B] bg-[#151325] shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#221F3B] flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm">{t("assistant.title")}</h3>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2 text-sm", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 max-w-[75%] whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-primary text-white"
                      : msg.isError
                      ? "bg-destructive/10 text-destructive"
                      : "bg-[#221F3B] text-foreground"
                  )}
                >
                  {msg.text}
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-[#221F3B] flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {mutation.isPending && (
              <div className="flex gap-2 text-sm justify-start">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="rounded-lg px-3 py-2 bg-[#221F3B] text-muted-foreground italic">
                  {t("assistant.thinking")}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-[#221F3B] flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("assistant.placeholder")} // ← vuelve a usar t()
              disabled={mutation.isPending}
              className="text-sm"
            />
            <Button type="submit" size="icon" disabled={mutation.isPending || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  )
}