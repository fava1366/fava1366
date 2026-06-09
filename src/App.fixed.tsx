import React, { useState, useEffect, useRef } from "react";
import { User, Channel, Message, AuditLog } from "./types";
import MapComponent from "./components/MapComponent";
import StreamRecorder from "./components/StreamRecorder";
import PhoneSimulator from "./components/PhoneSimulator";
import { 
  Radio, 
  MapPin, 
  Users, 
  Settings, 
  Plus, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  Activity, 
  Terminal, 
  MessageSquare, 
  Volume2, 
  VolumeX, 
  AlertCircle, 
  Wifi, 
  CloudRain, 
  UserPlus
} from "lucide-react";

export default function App() {
  // Sync States
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activePttUser, setActivePttUser] = useState<{ id: string; name: string; channelId: string; idCode?: string } | null>(null);
  
  // UI Interactive States
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Admin Login States
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState<string>("admin");
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>("admin");
  const [adminLoginError, setAdminLoginError] = useState<string>("");

  // Admin New Channel Form
  const [newChanName, setNewChanName] = useState("");
  const [newChanDesc, setNewChanDesc] = useState("");

  // Admin New User Form
  const [newUserId, setNewUserId] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserChan, setNewUserChan] = useState("CH-1");

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sound generator helpers (Web Audio API)
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(e => console.log("Failed to resume audioContext:", e));
    }
  };

  // ✅ تابع بهبود یافته برای پخش صدای Base64
  const playBase64Audio = async (base64: string) => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioContextRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // تبدیل Base64 به ArrayBuffer
      let base64Data = base64;
      if (base64.includes(",")) {
        base64Data = base64.split(",")[1];
      }

      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      // دیکدکردن صدا - WAV
      ctx.decodeAudioData(
        arrayBuffer,
        (buffer) => {
          try {
            playChirpWithContext(ctx, "start");
            
            setTimeout(() => {
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.onended = () => {
                try {
                  playChirpWithContext(ctx, "end");
                } catch (e) {
                  console.warn("Error playing end chirp:", e);
                }
              };
              source.start(0);
            }, 220);
          } catch (e) {
            console.error("Error in decoding callback:", e);
            fallbackPlayAudio(base64);
          }
        },
        (err) => {
          console.error("Error decoding audio data:", err);
          fallbackPlayAudio(base64);
        }
      );
    } catch (e) {
      console.warn("Web Audio API base64 play failed, fallback to native element:", e);
      fallbackPlayAudio(base64);
    }
  };

  const playChirpWithContext = (ctx: AudioContext, type: "start" | "end") => {
    try {
      if (type === "start") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.01);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + 0.12);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);

        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.06);

        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } else {
        const bufferSize = ctx.sampleRate * 0.12;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1000;
        filter.Q.value = 1.0;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
        noise.stop(ctx.currentTime + 0.12);
      }
    } catch (e) {
      console.warn("Error playing chirp with active context:", e);
    }
  };

  // ✅ تابع Fallback بهبود یافته
  const fallbackPlayAudio = (base64: string) => {
    try {
      playRadioChirp("start");
      
      setTimeout(() => {
        try {
          const audio = new Audio(base64);
          audio.volume = 1.0;
          audio.crossOrigin = "anonymous";
          
          audio.play().catch(err => {
            console.warn("Fallback HTML5 play blocked by browser policy:", err);
          });
          
          audio.onended = () => {
            try {
              playRadioChirp("end");
            } catch (e) {
              console.warn("Error playing end chirp in fallback:", e);
            }
          };
        } catch (err) {
          console.error("Fallback HTML5 play crashed:", err);
        }
      }, 220);
    } catch (err) {
      console.error("Fallback play setup crashed:", err);
    }
  };

  const playRadioChirp = (type: "start" | "end") => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioContextRef.current;
      if (!ctx || ctx.state === "suspended") return;

      if (type === "start") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.01);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + 0.12);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);

        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.06);

        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } else {
        const bufferSize = ctx.sampleRate * 0.12;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1000;
        filter.Q.value = 1.0;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
        noise.stop(ctx.currentTime + 0.12);
      }
    } catch (e) {
      console.warn("Audio Context beep error:", e);
    }
  };

  // ✅ اتصال بهبود یافته به WebSocket
  const connectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setWsStatus("connecting");
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { type, data } = payload;

        switch (type) {
          case "sync_state": {
            setUsers(data.users);
            setChannels(data.channels);
            setMessages(data.messages);
            setLogs(data.logs);

            if (selectedUser) {
              const updated = data.users.find((u: User) => u.id === selectedUser.id);
              if (updated) setSelectedUser(updated);
            }
            break;
          }

          case "ptt_broadcast_start": {
            playRadioChirp("start");
            setActivePttUser({
              id: data.userId,
              name: data.userName,
              channelId: data.channelId,
              idCode: data.idCode || data.userId
            });
            break;
          }

          case "ptt_broadcast_end": {
            playRadioChirp("end");
            setActivePttUser(null);
            break;
          }

          case "ptt_audio_broadcast": {
            // ✅ اطمینان از پخش صدا
            if (soundEnabled && data.audioBase64) {
              console.log("Playing audio broadcast...");
              playBase64Audio(data.audioBase64);
            }
            break;
          }

          case "remote_feed_trigger": {
            break;
          }

          case "error": {
            alert(data);
            break;
          }
        }
      } catch (err) {
        console.error("Failed to parse websocket message:", err);
      }
    };

    ws.onclose = () => {
      setWsStatus("disconnected");
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    ws.onerror = () => {
      setWsStatus("disconnected");
    };
  };

  useEffect(() => {
    connectWebSocket();
    
    const handleGesture = () => {
      initAudio();
    };
    
    window.addEventListener("click", handleGesture);
    window.addEventListener("touchstart", handleGesture);

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      window.removeEventListener("click", handleGesture);
      window.removeEventListener("touchstart", handleGesture);
    };
  }, []);

  // WebSocket dispatchers
  const sendPttStart = (userId: string, channelId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "ptt_start",
        payload: { userId, channelId }
      }));
    }
  };

  const sendPttEnd = (userId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "ptt_end",
        payload: { userId }
      }));
    }
  };

  const sendTextMessage = (channelId: string, userId: string, text: string, mediaBase64?: string, mediaType?: "image" | "video" | "file") => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "send_message",
        payload: { channelId, userId, text, mediaBase64, mediaType }
      }));
    }
  };

  const sendPttAudio = (userId: string, userName: string, channelId: string, audioBase64: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "audio_broadcast",
        payload: { userId, userName, channelId, audioBase64 }
      }));
    }
  };

  const sendUpdateLocation = (userId: string, lat: number, lng: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "update_location",
        payload: { userId, lat, lng }
      }));
    }
  };

  const sendAdminLockUser = (userId: string, newStatus: "active" | "locked") => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "admin_lock_user",
        payload: { userId, status: newStatus }
      }));
    }
  };

  const sendAdminChangeChannel = (userId: string, channelId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "admin_change_user_channel",
        payload: { userId, channelId }
      }));
    }
  };

  const sendAdminCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim()) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "admin_create_channel",
        payload: { name: newChanName, description: newChanDesc }
      }));
      setNewChanName("");
      setNewChanDesc("");
    }
  };

  const sendAdminCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId.trim() || !newUserName.trim()) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "admin_create_user",
        payload: { 
          id: newUserId.trim().toUpperCase(), 
          name: newUserName.trim(), 
          channelId: newUserChan,
          phoneNumber: newUserPhone.trim(),
          password: newUserPassword.trim() || "123456"
        }
      }));
      setNewUserId("");
      setNewUserName("");
      setNewUserPhone("");
      setNewUserPassword("");
    }
  };

  const sendAdminEditUser = (id: string, name: string, channelId: string, phoneNumber: string, password?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "admin_edit_user",
        payload: { 
          id, 
          name, 
          channelId,
          phoneNumber,
          password: password || "123456"
        }
      }));
    }
  };

  const sendRemoteControl = (targetUserId: string, enabled: boolean, mediaType: "camera" | "microphone") => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "request_remote_feed",
        payload: { targetUserId, enabled, type: mediaType }
      }));
    }
  };

  const handleAddCustomLog = (actionText: string, logType: "info" | "warning" | "error" | "ptt" | "security", userId?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "add_custom_log",
        payload: { action: actionText, type: logType, userId }
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased" dir="rtl">
      
      {/* Top central network banner notifications */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-6 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          
          {/* Logo & Network state */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-600">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-tight text-slate-900 mb-0.5">شبکه دیسپچری مرکزی و بی‌سیم زنده</h1>
                <p className="text-[10px] text-slate-500 font-medium">سامانه پایش صوتی، تصویری و موقعیت‌یابی بیسیم</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* WS Status node */}
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                wsStatus === "connected" 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : wsStatus === "connecting"
                    ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                    : "bg-rose-55 text-rose-700 border-rose-200"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === "connected" ? 'bg-emerald-500' : wsStatus === "connecting" ? 'bg-amber-500' : 'bg-red-500'}`} />
                {wsStatus === "connected" ? "متصل به سرور" : wsStatus === "connecting" ? "درحال اتصال..." : "قطع ارتباط"}
              </span>

              {/* Speaker sound controller toggle */}
              <button 
                onClick={() => {
                  initAudio();
                  setSoundEnabled(!soundEnabled);
                }}
                className={`p-1.5 rounded-lg border text-slate-600 hover:bg-slate-100 transition ${soundEnabled ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-100 border-slate-200'}`}
                title="تغییر صدای فرکانس بی سیم"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
              </button>

              {isAdminLoggedIn && (
                <button 
                  onClick={() => {
                    setIsAdminLoggedIn(false);
                    handleAddCustomLog("کابین دیسپچری مرکزی توسط اپراتور قفل گردید.", "security");
                  }}
                  className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-250 rounded-lg hover:bg-rose-100 transition text-[10.5px] font-bold flex items-center gap-1 leading-none shadow-sm"
                  title="خروج از پنل مدیریت"
                >
                  <Lock className="w-3.5 h-3.5" />
                  خروج مدیر
                </button>
              )}
            </div>
          </div>

          {/* Glowing active transmission system status */}
          <div className="w-full sm:w-auto flex justify-end">
            {activePttUser ? (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 flex items-center gap-3 animate-pulse text-red-700 shadow-sm text-xs w-full sm:w-80 justify-center">
                <div className="relative">
                  <div className="w-2.5 h-2.5 bg-red-400 rounded-full animate-ping" />
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                </div>
                <span>
                   فرکانس ورودی فعال: <strong className="font-mono font-black">{activePttUser.idCode || activePttUser.id}</strong> ({activePttUser.name})
                </span>
              </div>
            ) : (
              <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-1.5 text-[11px] text-slate-600 font-mono flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-slate-450 rounded-full" />
                <span>فرکانس رادیویی آزاد است (STANBY IDLE)</span>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Primary Grid Layout Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Fully Interfacing Cellular Rugged Mobile Walkie-Talkie Simulator (5 Cols) */}
        <div className="lg:col-span-4 flex flex-col items-center gap-4">
          <div className="w-full sticky top-24">
            <div className="flex items-center gap-2 mb-2 justify-center lg:justify-start">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-650 animate-pulse" />
              <h2 className="text-xs font-bold text-slate-600">شبیه‌ساز و رسیور موبایل کاربر بی سیم (Virtual device)</h2>
            </div>
            
            <PhoneSimulator 
              users={users}
              channels={channels}
              messages={messages}
              activePttUser={activePttUser}
              onSendPttStart={sendPttStart}
              onSendPttEnd={sendPttEnd}
              onSendMessage={sendTextMessage}
              onUpdateLocation={sendUpdateLocation}
              onAddLog={handleAddCustomLog}
              onSendAudio={sendPttAudio}
            />
            
            <div className="mt-4 p-3.5 bg-white border border-slate-200 rounded-xl text-[10px] text-slate-600 max-w-[420px] mx-auto text-justify leading-relaxed shadow-sm">
              <strong>💡 راهنما تست:</strong> می‌توانید هویت گوشی را تغییر دهید، کانال‌ها را تعویض کنید، دکمه بی‌سیم صوتی (PTT) را بفشارید و یا از فلش‌های جهت‌یابی برای شبیه‌سازی حرکت فیزیکی کاربر روی نقشه لایو بغل استفاده کنید تا فرکانس بلافاصله در پنل مرکزی همگام شود.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Master Operations Web dispatch Dashboard (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {!isAdminLoggedIn ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col justify-between min-h-[550px] text-white animate-fadeIn" id="admin-security-overlay">
              <div className="flex flex-col gap-5 my-auto max-w-md mx-auto w-full">
                <div className="text-center">
                  <div className="w-14 h-14 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <ShieldAlert className="w-8 h-8 animate-pulse text-indigo-400" />
                  </div>
                  <h3 className="font-extrabold text-base text-indigo-300">اتاق فرماندهی و دیسپچری مرکزی (ادمین)</h3>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    این پنل مجهز به رسیور زنده صوتی، موقعیت‌یاب لایو کلاینت‌ها، ثبت گزارشات سیستمی، تخصیص مکانی فرکانس‌ها و ابزار مسدودسازی بی‌سیم کاربران است.
                  </p>
                </div>

                {adminLoginError && (
                  <div className="bg-rose-950/40 border border-rose-900/40 text-rose-300 text-[10px] py-2 px-3 rounded-xl font-bold text-center">
                    ⚠️ {adminLoginError}
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-300 font-bold">شناسه کاربری مدیر (Username):</label>
                    <input 
                      type="text"
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 font-mono text-left"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-300 font-bold">گذرواژه امنیتی کادر فرمان (Password):</label>
                    <input 
                      type="password"
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500 font-mono text-left"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      required
                    />
                  </div>

                  <button 
                    onClick={() => {
                      if (adminUsername === "admin" && (adminPasswordInput === "admin" || adminPasswordInput === "123456")) {
                        setIsAdminLoggedIn(true);
                        setAdminLoginError("");
                        handleAddCustomLog("اتصال مدیر دیسپچری مرکزی تأیید گردید و دالان‌های مانیتورینگ امنیتی بازگشایی شد.", "security");
                      } else {
                        setAdminLoginError("شناسه یا رمز عبور ادمین نامعتبر است.");
                      }
                    }}
                    className="w-full mt-4 py-3 bg-indigo-650 hover:bg-indigo-600 active:bg-indigo-700 transition duration-150 rounded-xl text-xs font-black text-white shadow shadow-indigo-600/20 cursor-pointer"
                  >
                    تایید فرکانس و ورود به مانیتور دیسپچری
                  </button>
                </div>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-900 max-w-md mx-auto w-full text-center text-[10px] text-slate-500 leading-relaxed mt-6">
                <strong>💡 راهنمای کادر فرمان:</strong> جهت ثبت و ارزیابی سریع پنل مدیریت، می‌توانید با شناسه کاربری <code className="text-indigo-400 bg-zinc-900 px-1 py-0.5 rounded font-mono">admin</code> و گذرواژه <code className="text-indigo-400 bg-zinc-900 px-1 py-0.5 rounded font-mono">admin</code> وارد اتاق فرمان شوید.
              </div>
            </div>
          ) : (
            <>
              {/* Section 1: Tactical Vector Map for GPS positioning */}
              <section className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-indigo-600" />
              نمای نقشه وکتوری هوشمند - پایش جغرافیایی در دالان دیتای موبایل
            </h3>
            
            <MapComponent 
              users={users}
              onUserSelect={(user) => setSelectedUser(user)}
              onUpdateLocation={sendUpdateLocation}
              selectedUserId={selectedUser?.id}
            />
          </section>

          {/* Section 2: Surveillance listening with record options */}
          <section>
            <StreamRecorder 
              selectedUser={selectedUser}
              onSendRemoteControl={sendRemoteControl}
              isStreaming={selectedUser?.isStreaming || false}
              onAddLog={handleAddCustomLog}
            />
          </section>

          {/* Section 3: User Details, custom controls, lock controls, channels management */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* User register and list controls panel */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-slate-800 text-sm">سرپرستی کاربران و تخصیص دسترسی</h4>
                </div>
                <span className="text-[10px] bg-indigo-50 px-2 py-0.5 rounded text-indigo-700 border border-indigo-100 font-mono font-bold">
                  {users.length} کاربر ثبت‌شده
                </span>
              </div>

              {/* User Selector Dropdown */}
              <div className="flex flex-col gap-1 text-xs bg-slate-50/50 p-2.5 rounded-xl border border-slate-250">
                <label className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                  <UserPlus className="w-3 h-3 text-indigo-500" />
                  انتخاب مخاطب جهت مدیریت و ویرایش:
                </label>
                <select
                  value={selectedUser?.id || ""}
                  onChange={(e) => {
                    const found = users.find(u => u.id === e.target.value);
                    if (found) setSelectedUser(found);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 font-bold outline-none cursor-pointer focus:border-indigo-500 text-xs shadow-sm"
                >
                  <option value="">-- یک کاربر رادیویی فعال را انتخاب کنید --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.id}) {u.status === 'locked' ? '🔒 (Locked)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* User lock, channel reassignment controls */}
              {selectedUser ? (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col gap-3 animate-fadeIn">
                  
                  {/* LIVE EDIT USER SPECIFICATIONS SECTION */}
                  <div className="bg-white border border-slate-200 p-2.5 rounded-lg flex flex-col gap-2">
                    <span className="text-[10.5px] font-black text-indigo-700 block border-b border-slate-100 pb-1.5">🎛️ ویرایش اطلاعات و گذرواژه امنیتی ({selectedUser.id})</span>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] text-slate-400 font-bold">نام و فامیل:</label>
                        <input
                          type="text"
                          defaultValue={selectedUser.name}
                          key={`name-${selectedUser.id}`}
                          id={`edit-name-${selectedUser.id}`}
                          className="bg-slate-50 border border-slate-200 rounded p-1 text-slate-800 outline-none focus:border-indigo-500 font-bold text-xs"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] text-slate-400 font-bold">شماره ارتباطی:</label>
                        <input
                          type="text"
                          defaultValue={selectedUser.phoneNumber || ""}
                          key={`phone-${selectedUser.id}`}
                          id={`edit-phone-${selectedUser.id}`}
                          className="bg-slate-50 border border-slate-200 rounded p-1 text-slate-800 outline-none focus:border-indigo-500 font-mono text-xs"
                        />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] text-slate-400 font-bold">گذرواژه بیسیم گوشی:</label>
                        <input
                          type="text"
                          defaultValue={selectedUser.password || "123456"}
                          key={`pass-${selectedUser.id}`}
                          id={`edit-pass-${selectedUser.id}`}
                          className="bg-slate-50 border border-slate-200 rounded p-1 text-slate-800 outline-none focus:border-indigo-500 font-mono text-xs font-bold"
                        />
                      </div>

                      <div className="flex flex-col justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const nameEl = document.getElementById(`edit-name-${selectedUser.id}`) as HTMLInputElement;
                            const phoneEl = document.getElementById(`edit-phone-${selectedUser.id}`) as HTMLInputElement;
                            const passEl = document.getElementById(`edit-pass-${selectedUser.id}`) as HTMLInputElement;
                            if (nameEl && phoneEl && passEl) {
                              sendAdminEditUser(
                                selectedUser.id,
                                nameEl.value.trim(),
                                selectedUser.channelId,
                                phoneEl.value.trim(),
                                passEl.value.trim()
                              );
                              handleAddCustomLog(`اطلاعات و رمز عبور کاربر "${selectedUser.id}" باموفقیت توسط مدیر فرماندهی ویرایش و همگام‌سازی شد.`, "info");
                            }
                          }}
                          className="w-full py-1 px-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded text-[10px] transition duration-150 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          اعمال تغییرات کاربر
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 border-t border-slate-100 pt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-800">وضعیت دسترسی زنده:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedUser.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}>
                        {selectedUser.status === "active" ? "فعال در بی‌سیم" : "مسدود فرکانسی (🔒)"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-1">
                    {/* Lock unlock buttons */}
                    {selectedUser.status === "active" ? (
                      <button
                        onClick={() => sendAdminLockUser(selectedUser.id, "locked")}
                        className="py-1.5 px-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        مسدودسازی کاربر
                      </button>
                    ) : (
                      <button
                        onClick={() => sendAdminLockUser(selectedUser.id, "active")}
                        className="py-1.5 px-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition flex items-center justify-center gap-1.5"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        رفع مسدودیت
                      </button>
                    )}

                    {/* Quick locate */}
                    <button
                      onClick={() => handleAddCustomLog(`درخواست بروزرسانی موقعیت جغرافیایی کاربر ${selectedUser.id}`, "info")}
                      className="py-1.5 px-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition flex items-center justify-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      استعلام موقعیت
                    </button>
                  </div>

                  {/* Channel reassignment selection */}
                  <div className="flex flex-col gap-1.5 border-t border-slate-200 pt-2 text-xs">
                    <label className="text-[10px] text-slate-500">تغییر کانال فرکانسی کاربر به صورت سراسری:</label>
                    <select
                      value={selectedUser.channelId}
                      onChange={(e) => sendAdminChangeChannel(selectedUser.id, e.target.value)}
                      className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 font-bold outline-none cursor-pointer focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      {channels.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="text-center text-xs text-slate-500 bg-slate-50 py-4 border border-dashed border-slate-200 rounded-xl">
                  جهت اعمال تنظیمات دیسپچری و زنده، کاربری را روی نقشه انتخاب کنید.
                </div>
              )}

              {/* Define user form */}
              <form onSubmit={sendAdminCreateUser} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                  تعریف بیسیم اختصاصی جدید:
                </span>
                
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="شناسه (مانند: USER-550)"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="نام و فامیل کاربر"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="شماره تماس (مانند: ...)"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="رمز ورود (مثال: 550)"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="flex gap-2 text-xs">
                  <select
                    value={newUserChan}
                    onChange={(e) => setNewUserChan(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 outline-none flex-1 font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    {channels.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 font-bold text-white rounded-lg hover:bg-indigo-550 transition flex items-center gap-1 text-center shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    ثبت کاربر
                  </button>
                </div>
              </form>
            </div>

            {/* Channels creation form & layout details */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-slate-800 text-sm">مدیریت دالان ارتباطی فرکانس‌ها</h4>
                </div>
                <span className="text-[10px] bg-slate-55 px-2 py-0.5 rounded text-slate-750 border border-slate-200 font-mono font-bold">
                  {channels.length} کانال فعال
                </span>
              </div>

              {/* Active channel lists with user counts details */}
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[140px] pr-1">
                {channels.map(chan => {
                  const channelUsers = users.filter(u => u.channelId === chan.id && u.status === "active");
                  return (
                    <div key={chan.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{chan.name}</span>
                        <span className="text-[10px] text-slate-500">{chan.description.substring(0, 50)}</span>
                      </div>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                        {channelUsers.length} بی سیم متصل
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Define new channel form */}
              <form onSubmit={sendAdminCreateChannel} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2 mt-auto">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  افزودن دالان ارتباطی (کانال) جدید:
                </span>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="عنوان کانال (مانند: تدارکات غرب)"
                    value={newChanName}
                    onChange={(e) => setNewChanName(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="توضیحات فرستنده"
                    value={newChanDesc}
                    onChange={(e) => setNewChanDesc(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-1.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-550 transition-all font-mono shadow-sm"
                >
                  + فعال‌سازی فرکانس جدید کانال
                </button>
              </form>
            </div>

          </section>

          {/* Section 4: System Audit chronological logs */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-800 text-sm"> گزارش زنده لاگ و وقایع امنیتی دیسپچری</h4>
              </div>
              <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            </div>

            <div className="h-44 overflow-y-auto bg-slate-950 border border-slate-900 rounded-xl p-3 font-mono text-[10.5px] text-emerald-400 max-h-[180px] flex flex-col gap-1.5 leading-relaxed">
              {logs.length === 0 ? (
                <span className="text-slate-600 italic">هیچ واقعه‌ای ثبت نشده است...</span>
              ) : (
                logs.slice().reverse().map((log) => (
                  <div key={log.id} className="flex gap-2 items-start border-b border-zinc-900 pb-1.5">
                    <span className="text-[9px] text-zinc-500 whitespace-nowrap">[{new Date(log.timestamp).toLocaleTimeString("fa-IR")}]</span>
                    {log.userId && (
                      <span className="text-indigo-400 font-bold whitespace-nowrap">[{log.userId}]:</span>
                    )}
                    <span className={`text-wrap break-all ${
                      log.type === "security" 
                        ? 'text-rose-400 font-extrabold' 
                        : log.type === "ptt" 
                          ? 'text-amber-300 font-bold' 
                          : 'text-zinc-300'
                    }`}>
                      {log.action}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

            </>
          )}
        </div>
      </main>

      {/* Footer detailing compatibility with cellular data */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-slate-500 text-[10.5px]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>طراحی سیستم واکی‌تاکی دیسپچری آنلاین © ۲۰۲۶- ۱۴۰۵</span>
          <span className="text-indigo-600 font-bold">بستر ارتباطی: بهینه‌سازی شده برای سیم‌کارت همراه اول، ایرانسل و رایتل (3G/4G/5G)</span>
        </div>
      </footer>
    </div>
  );
}
