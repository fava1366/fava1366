import React, { useState, useRef, useEffect } from 'react';
import { User, Channel, Message } from '../types';
import { Phone, Radio, Send } from 'lucide-react';

interface PhoneSimulatorProps {
  users: User[];
  channels: Channel[];
  messages: Message[];
  activePttUser: { id: string; name: string; channelId: string; idCode?: string } | null;
  onSendPttStart: (userId: string, channelId: string) => void;
  onSendPttEnd: (userId: string) => void;
  onSendMessage: (channelId: string, userId: string, text: string) => void;
  onUpdateLocation: (userId: string, lat: number, lng: number) => void;
  onAddLog: (action: string, type: string, userId?: string) => void;
  onSendAudio: (userId: string, userName: string, channelId: string, audioBase64: string) => void;
}

export default function PhoneSimulator({
  users,
  channels,
  activePttUser,
  onSendPttStart,
  onSendPttEnd,
  onSendMessage,
  onAddLog,
}: PhoneSimulatorProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [selectedChannel, setSelectedChannel] = useState<string>(channels[0]?.id || 'CH-1');
  const [messageText, setMessageText] = useState('');
  const [isPttActive, setIsPttActive] = useState(false);

  const selectedUser = users.find(u => u.id === selectedUserId);

  const handlePttStart = () => {
    if (selectedUser) {
      setIsPttActive(true);
      onSendPttStart(selectedUser.id, selectedChannel);
      onAddLog(`کاربر ${selectedUser.name} دکمه PTT را فشار داد`, 'ptt', selectedUser.id);
    }
  };

  const handlePttEnd = () => {
    if (selectedUser) {
      setIsPttActive(false);
      onSendPttEnd(selectedUser.id);
      onAddLog(`کاربر ${selectedUser.name} دکمه PTT را رها کرد`, 'ptt', selectedUser.id);
    }
  };

  const handleSendMessage = () => {
    if (messageText.trim() && selectedUser) {
      onSendMessage(selectedChannel, selectedUser.id, messageText);
      setMessageText('');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Phone className="w-4 h-4 text-indigo-600" />
        <h3 className="font-bold text-slate-800 text-sm">شبیه‌ساز گوشی کاربر</h3>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-slate-500 font-bold">انتخاب کاربر:</label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-sm font-bold outline-none focus:border-indigo-500"
        >
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.id})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-slate-500 font-bold">انتخاب کانال:</label>
        <select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-sm font-bold outline-none focus:border-indigo-500"
        >
          {channels.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onMouseDown={handlePttStart}
        onMouseUp={handlePttEnd}
        onTouchStart={handlePttStart}
        onTouchEnd={handlePttEnd}
        className={`w-full py-4 rounded-xl font-black text-white transition duration-150 flex items-center justify-center gap-2 ${
          isPttActive
            ? 'bg-red-600 scale-95 shadow-lg'
            : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
        }`}
      >
        <Radio className="w-5 h-5" />
        {isPttActive ? 'در حال برقراری تماس...' : 'فشار دهید برای صحبت'}
      </button>

      {activePttUser && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[10px] font-bold text-center">
          🔴 فرکانس فعال: {activePttUser.name}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
        <label className="text-[10px] text-slate-500 font-bold">پیام متنی:</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="پیام را تایپ کنید..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleSendMessage}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-sm transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-slate-50 p-2.5 rounded-lg text-[10px] space-y-1 border border-slate-200">
        <div>📱 <strong>دستگاه:</strong> {selectedUser?.name}</div>
        <div>📍 <strong>شناسه:</strong> {selectedUser?.id}</div>
        <div>🔒 <strong>وضعیت:</strong> {selectedUser?.status === 'active' ? '✓ فعال' : '✕ مسدود'}</div>
      </div>
    </div>
  );
}
