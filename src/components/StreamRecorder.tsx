import React from 'react';
import { User } from '../types';
import { Video, Mic } from 'lucide-react';

interface StreamRecorderProps {
  selectedUser: User | null;
  onSendRemoteControl: (userId: string, enabled: boolean, mediaType: 'camera' | 'microphone') => void;
  isStreaming: boolean;
  onAddLog: (action: string, type: string, userId?: string) => void;
}

export default function StreamRecorder({ selectedUser, onSendRemoteControl, isStreaming }: StreamRecorderProps) {
  if (!selectedUser) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center text-slate-500">
        جهت مانیتورینگ صدا و تصویر، یک کاربر را انتخاب کنید
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Video className="w-4 h-4 text-indigo-600" />
        نظارت زنده صدا و تصویر
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSendRemoteControl(selectedUser.id, true, 'camera')}
          className="p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-indigo-700 font-bold text-sm transition"
        >
          <Video className="w-4 h-4 inline mr-2" />
          فعال‌سازی دوربین
        </button>
        
        <button
          onClick={() => onSendRemoteControl(selectedUser.id, true, 'microphone')}
          className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-amber-700 font-bold text-sm transition"
        >
          <Mic className="w-4 h-4 inline mr-2" />
          فعال‌سازی میکروفن
        </button>
      </div>
      
      {isStreaming && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
          ✓ جریان زنده فعال است
        </div>
      )}
    </div>
  );
}
