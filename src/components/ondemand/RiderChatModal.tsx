import React, { useState } from 'react';
import { RiderInfo, ChatMessage } from '../../types';
import { X, Send, ShieldCheck, CheckCheck } from 'lucide-react';

interface RiderChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  rider: RiderInfo;
}

export const RiderChatModal: React.FC<RiderChatModalProps> = ({
  isOpen,
  onClose,
  rider,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'rider',
      text: `Habari! I have picked up your gas cylinder from the depot and verified the seal. On my way to your gate!`,
      timestamp: '2 mins ago',
    },
  ]);
  const [inputVal, setInputVal] = useState('');

  if (!isOpen) return null;

  const quickReplies = [
    'I am at Gate B, guard has been informed.',
    'Please bring your digital scale for weight check.',
    'Please ring intercom #4B when you arrive.',
    'Call me when you reach the gate.',
  ];

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputVal('');

    // Simulated quick rider reply
    setTimeout(() => {
      const riderReply: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'rider',
        text: 'Sawa kabisa! Understood. I will be there in about 6 minutes with digital scale ready.',
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, riderReply]);
    }, 1200);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity"
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl h-[460px] flex flex-col animate-in zoom-in-95 duration-150 text-left"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#14532d] text-white flex items-center justify-center font-bold text-xs">
              {rider.photoInitial}
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">
                {rider.name}
              </h3>
              <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online · {rider.plateNumber}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs bg-slate-50/50">
          <div className="text-center">
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
              Live in-app dispatch chat
            </span>
          </div>

          {messages.map((m) => {
            const isMe = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow-2xs ${
                    isMe
                      ? 'bg-[#14532d] text-white rounded-br-xs'
                      : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs'
                  }`}
                >
                  <p>{m.text}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 px-1 flex items-center gap-0.5">
                  {m.timestamp}
                  {isMe && <CheckCheck className="w-2.5 h-2.5 text-[#166534]" />}
                </span>
              </div>
            );
          })}
        </div>

        {/* Quick reply chips */}
        <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {quickReplies.map((qr, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(qr)}
              className="text-[10px] whitespace-nowrap bg-slate-100 hover:bg-emerald-50 hover:text-[#166534] border border-slate-200 px-2 py-1 rounded-full text-slate-700 transition-colors cursor-pointer shrink-0"
            >
              {qr}
            </button>
          ))}
        </div>

        {/* Message Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputVal);
          }}
          className="p-2.5 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Type message to rider..."
            className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#166534]"
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="w-8 h-8 rounded-lg bg-[#14532d] hover:bg-[#166534] text-white flex items-center justify-center disabled:opacity-40 cursor-pointer transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
