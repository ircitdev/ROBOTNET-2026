
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { getGeminiResponse } from '../services/geminiService';
import { Message } from '../types';
import { CONTACTS } from '../constants/contacts';
import { TARIFFS } from '../tariffsData';
import { FAQ } from '../constants';
import { CHANNELS_DATA } from '../channels';
import { decode, decodeAudioData, createBlob } from '../utils/audioUtils';

export const toggleGeminiChat = (message?: string) => {
  window.dispatchEvent(new CustomEvent('toggle-gemini-chat', { detail: { message } }));
};

const INITIAL_QUICK_ACTIONS = [
  "Какой тариф самый быстрый? 🚀",
  "Какие каналы в HD качестве? 📺",
  "Тариф для частного дома 🏠",
  "Как оплатить интернет? 💳",
  "Что такое обещанный платеж? ⏳"
];

const MessageContent: React.FC<{ text: string; role: 'user' | 'model' }> = ({ text, role }) => {
  const formatText = (input: string) => {
    let formatted = input
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-slate-900 dark:text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/^\* (.*?)$/gm, '<div class="flex gap-2 my-1"><span class="text-neon-cyan">•</span><span>$1</span></div>')
      .replace(/^\d+\. (.*?)$/gm, '<div class="flex gap-2 my-1"><span class="font-bold text-neon-cyan">$&</span></div>');

    return formatted.split('\n').map((line, i) => {
      if (line.includes('flex gap-2')) return <div key={i} dangerouslySetInnerHTML={{ __html: line }} />;
      return line.trim() ? <p key={i} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{ __html: line }} /> : <div key={i} className="h-2" />;
    });
  };

  return <div className="leading-relaxed whitespace-pre-wrap">{formatText(text)}</div>;
};

const GeminiChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'model', 
      text: 'Привет! Я ИИ-ассистент RoborNET. ⚡️ Помогу подобрать тариф, изучить ТВ-пакеты или ответить на вопросы поддержки. Что вас интересует?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [usedActions, setUsedActions] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Live Audio Refs
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const liveSessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const [isLiveActive, setIsLiveActive] = useState(false);

  // Speech Recognition Ref
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const handleToggle = (e: any) => {
      setIsOpen(true);
      if (e.detail?.message) {
        setPendingMessage(e.detail.message);
      }
    };
    window.addEventListener('toggle-gemini-chat', handleToggle);
    return () => window.removeEventListener('toggle-gemini-chat', handleToggle);
  }, []);

  const handleSend = async (customText?: string) => {
    const userMsg = (customText || input).trim();
    if (!userMsg || isLoading) return;

    if (customText) {
      setUsedActions(prev => new Set(prev).add(customText));
    }

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const history = [...messages, { role: 'user', text: userMsg } as Message].slice(0, -1).map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const aiResponse = await getGeminiResponse(userMsg, history);
    setMessages(prev => [...prev, { role: 'model', text: aiResponse }]);
    setIsLoading(false);
  };

  const startDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Ваш браузер не поддерживает голосовой ввод.");
      return;
    }

    if (isDictating) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsDictating(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsDictating(false);
    };

    recognition.onend = () => {
      setIsDictating(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => {
    if (isOpen && pendingMessage) {
      handleSend(pendingMessage);
      setPendingMessage(null);
    }
  }, [isOpen, pendingMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const stopVoiceMode = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    if (audioContextsRef.current) {
      audioContextsRef.current.input.close();
      audioContextsRef.current.output.close();
      audioContextsRef.current = null;
    }
    setIsVoiceMode(false);
    setIsLiveActive(false);
  };

  const startVoiceMode = async () => {
    try {
      setIsVoiceMode(true);
      setIsLoading(true);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputCtx, output: outputCtx };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            setIsLiveActive(true);
            setIsLoading(false);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
               const text = message.serverContent.outputTranscription.text;
               setMessages(prev => [...prev, { role: 'model', text: `(AI Голос): ${text}` }]);
            } else if (message.serverContent?.inputTranscription) {
               const text = message.serverContent.inputTranscription.text;
               setMessages(prev => [...prev, { role: 'user', text: `(Ваш голос): ${text}` }]);
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputCtx) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.onended = () => sourcesRef.current.delete(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live AI Error:", e);
            stopVoiceMode();
          },
          onclose: () => {
            setIsLiveActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          },
          systemInstruction: `Вы — RoborNET AI. Вы общаетесь с пользователем ГОЛОСОМ. 
          Будьте кратки. Вы работаете в интернет-провайдере РоборНЭТ в Волгограде.
          Доступные тарифы: ${JSON.stringify(TARIFFS)}.
          ТВ-каналы: 140+.`
        }
      });

      liveSessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start voice mode", err);
      setIsVoiceMode(false);
      setIsLoading(false);
    }
  };

  const availableActions = INITIAL_QUICK_ACTIONS.filter(action => !usedActions.has(action));

  return (
    <div className="fixed bottom-6 right-6 z-[200]">
      {isOpen ? (
        <div className="bg-[#1e293b] dark:bg-slate-900 w-80 sm:w-96 h-[600px] rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,212,255,0.3)] flex flex-col border border-white/10 overflow-hidden animate-in slide-in-from-bottom-6 duration-500 ease-out">
          {/* Header */}
          <div className="bg-[#0f172a] p-5 flex justify-between items-center text-white border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-neon-cyan/20 rounded-full flex items-center justify-center border border-neon-cyan/30">
                  <svg className="w-6 h-6 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0f172a] animate-pulse" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-sm tracking-tight">RoborNET AI</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {isVoiceMode ? 'Голосовой звонок' : 'Онлайн поддержка'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
               {!isVoiceMode && (
                 <button onClick={startVoiceMode} className="p-2 hover:bg-neon-cyan/10 rounded-full transition-colors text-neon-cyan group" title="Режим живого звонка">
                   <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                 </button>
               )}
               <button onClick={() => { if(isVoiceMode) stopVoiceMode(); setIsOpen(false); }} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
               </button>
            </div>
          </div>
          
          {/* Voice Mode Visualizer */}
          {isVoiceMode ? (
            <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-10 relative overflow-hidden">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.1)_0%,transparent_70%)] animate-pulse" />
               <div className="relative z-10 flex flex-col items-center">
                  <div className="w-32 h-32 bg-neon-cyan/20 rounded-full flex items-center justify-center border-4 border-neon-cyan/40 mb-10 relative">
                     <div className="absolute inset-0 rounded-full border border-neon-cyan animate-ping opacity-20" />
                     <div className="absolute inset-[-10px] rounded-full border border-neon-cyan animate-ping opacity-10 [animation-delay:0.5s]" />
                     <svg className="w-16 h-16 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  </div>
                  <h4 className="text-xl font-heading font-extrabold text-white mb-2 text-center">ИИ Слушает...</h4>
                  <p className="text-slate-400 text-sm text-center">Просто говорите. Я отвечу в реальном времени.</p>
                  
                  <div className="mt-12 flex gap-1 h-10 items-end">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className={`w-1.5 bg-neon-cyan rounded-full animate-wave`} style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>

                  <button onClick={stopVoiceMode} className="mt-16 px-10 py-4 bg-neon-coral text-white rounded-2xl font-heading font-extrabold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg">Завершить звонок</button>
               </div>
            </div>
          ) : (
            <>
              {/* Messages Area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#111827]">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${m.role === 'user' ? 'bg-neon-cyan text-slate-900 rounded-br-none font-bold shadow-md' : 'bg-[#1e293b] text-slate-200 rounded-bl-none shadow-sm border border-white/5'}`}>
                      <MessageContent text={m.text} role={m.role} />
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-[#1e293b] p-4 rounded-2xl rounded-bl-none shadow-sm border border-white/5 flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">AI печатает...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions Scroll Area */}
              {availableActions.length > 0 && (
                <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar shrink-0 border-t border-white/5 bg-[#0f172a]">
                  {availableActions.map((action, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleSend(action)}
                      className="whitespace-nowrap px-4 py-2 rounded-full bg-[#1e293b] border border-white/10 text-[11px] font-bold text-slate-300 hover:border-neon-cyan hover:text-neon-cyan transition-all"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 bg-[#0f172a] flex flex-col gap-3 shrink-0 border-t border-white/5">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                      placeholder={isDictating ? "Слушаю..." : "Задайте вопрос AI..."} 
                      className={`w-full bg-[#1e293b] border rounded-2xl px-5 py-3 text-sm text-white focus:ring-2 outline-none transition-all ${isDictating ? 'border-neon-coral ring-neon-coral/20 pr-12 animate-pulse' : 'border-white/10 focus:ring-neon-cyan/30 focus:border-neon-cyan'}`} 
                    />
                    <button 
                      onClick={startDictation}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${isDictating ? 'text-neon-coral scale-125' : 'text-slate-500 hover:text-neon-cyan'}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </button>
                  </div>
                  <button 
                    onClick={() => handleSend()} 
                    disabled={isLoading || !input.trim()} 
                    className={`bg-neon-cyan text-slate-900 p-3 rounded-2xl transition-all shadow-lg flex items-center justify-center ${isLoading || !input.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                  >
                    <svg className="w-6 h-6 transform rotate-45 -translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="bg-neon-cyan w-16 h-16 rounded-full shadow-[0_10px_25px_rgba(0,212,255,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 relative z-10 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        </button>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes wave {
          0%, 100% { height: 20%; }
          50% { height: 100%; }
        }
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default GeminiChat;
