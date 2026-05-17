'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Message } from '@/lib/types';

export default function ChatThread({
  bookingId,
  currentUserId,
  initialMessages,
  otherName,
}: {
  bookingId: string;
  currentUserId: string;
  initialMessages: Message[];
  otherName: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Subscribe to new messages on this booking.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const next = payload.new as Message;
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [bookingId]);

  // Scroll to bottom on new message.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function send() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.from('messages').insert({
      booking_id: bookingId,
      sender_id: currentUserId,
      body: trimmed,
    });
    setSending(false);
    if (!error) setBody('');
  }

  return (
    <div className="bg-white border border-rail rounded-2xl overflow-hidden flex flex-col"
         style={{ height: '380px' }}>
      <div className="px-4 py-3 border-b border-rail text-sm font-medium">
        Chat with {otherName}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-cream/40">
        {messages.length === 0 ? (
          <p className="text-sm text-ink-muted text-center mt-12">
            No messages yet. Say hi 👋
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    mine
                      ? 'bg-accent text-white rounded-br-md'
                      : 'bg-white border border-rail rounded-bl-md'
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-rail p-3 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a message…"
          className="flex-1 border border-rail rounded-full px-4 py-2 outline-none focus:border-accent-mid text-sm"
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !body.trim()}
          className="bg-ink text-white rounded-full px-5 py-2 font-medium hover:bg-accent transition disabled:opacity-50 text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}
