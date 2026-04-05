"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, User, Building2 } from "lucide-react"

interface Message {
  id: string
  content: string
  sender: "client" | "agency"
  senderName: string
  timestamp: string
}

interface ClientMessagesProps {
  messages: Message[]
  onSendMessage: (content: string) => Promise<void>
}

export function ClientMessages({ messages, onSendMessage }: ClientMessagesProps) {
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!newMessage.trim()) return
    
    setSending(true)
    try {
      await onSendMessage(newMessage.trim())
      setNewMessage("")
    } finally {
      setSending(false)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("es-CL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-foreground">
          Mensajes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de mensajes */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No hay mensajes aún
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Envía un mensaje para comunicarte con tu agencia
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`
                  flex gap-3
                  ${message.sender === "client" ? "flex-row-reverse" : ""}
                `}
              >
                {/* Avatar */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center shrink-0
                  ${message.sender === "client" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-[var(--surface-3)] text-muted-foreground"
                  }
                `}>
                  {message.sender === "client" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                </div>
                
                {/* Burbuja */}
                <div className={`
                  max-w-[75%] rounded-2xl px-4 py-2.5
                  ${message.sender === "client"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-sidebar-accent text-foreground rounded-bl-md"
                  }
                `}>
                  <p className="text-xs font-medium mb-1 opacity-80">
                    {message.senderName}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`
                    text-[10px] mt-1.5
                    ${message.sender === "client" ? "text-white/60" : "text-muted-foreground"}
                  `}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input de mensaje */}
        <div className="pt-3 border-t border-border">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="min-h-[80px] bg-background border-border resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) {
                  handleSend()
                }
              }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-muted-foreground">
              Cmd + Enter para enviar
            </p>
            <Button 
              size="sm"
              className="gap-1.5 bg-primary text-primary-foreground"
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
