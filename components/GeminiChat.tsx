
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Message } from '../types';
import { CONTACTS } from '../constants/contacts';
import { TARIFFS } from '../tariffsData';

export const toggleGeminiChat = (message?: string) => {
  window.dispatchEvent(new CustomEvent('toggle-gemini-chat', { detail: { message } }));
};

// ---------- Audio utils ----------
function floatTo16BitPCM(input: Float32Array): Uint8Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return new Uint8Array(output.buffer);
}
function base64Encode(bytes: Uint8Array): string {
  let b = '';
  for (let i = 0; i < bytes.byteLength; i++) b += String.fromCharCode(bytes[i]);
  return btoa(b);
}
function base64Decode(s: string): Uint8Array {
  const bin = atob(s);
  const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b;
}
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate = 24000): Promise<AudioBuffer> {
  const d16 = new Int16Array(data.buffer);
  const buf = ctx.createBuffer(1, d16.length, sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < d16.length; i++) ch[i] = d16[i] / 32768.0;
  return buf;
}

// ---------- Quick suggestions ----------
const INITIAL_SUGGESTIONS = [
  'Хочу подключить интернет 🌐',
  'Какие тарифы есть? 📋',
  'Уже клиент, есть проблема 🔧',
  'Стоимость подключения 💰',
];

// Parse suggestion buttons from AI response
function parseResponse(text: string): { cleanText: string; buttons: string[] } {
  const buttons: string[] = [];
  const cleanText = text
    .replace(/💡[^\n]*/g, (match) => {
      [...match.matchAll(/"([^"]+)"/g)].forEach((m) => buttons.push(m[1]));
      return '';
    })
    .trim();
  return { cleanText, buttons };
}

// ---------- Geolocation helpers ----------
function isMobile(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
}

async function getAddressFromCoords(lat: number, lon: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=ru`;
  const response = await fetch(url, { headers: { 'User-Agent': 'RoborNET-Widget/1.0' } });
  if (!response.ok) throw new Error('Geocoding error');
  const data = await response.json();
  if (!data?.address) throw new Error('No address');

  const addr = data.address;
  const parts: string[] = [];

  const city = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality;
  if (city) {
    parts.push('г. ' + city.replace(/^город\s+/i, '').replace(/^г\.\s*/i, ''));
  }

  const street = addr.road || addr.street;
  if (street) {
    const cleanStreet = street
      .replace(/^улица\s+/i, '').replace(/^ул\.\s*/i, '')
      .replace(/^проспект\s+/i, '').replace(/^пр\.\s*/i, '')
      .replace(/^переулок\s+/i, '').replace(/^пер\.\s*/i, '')
      .replace(/^бульвар\s+/i, '').replace(/^б-р\s*/i, '')
      .replace(/^проезд\s+/i, '').replace(/^шоссе\s+/i, '');
    let streetType = 'ул.';
    if (/^проспект\s/i.test(street) || /^пр\.\s/i.test(street)) streetType = 'пр.';
    else if (/^переулок\s/i.test(street) || /^пер\.\s/i.test(street)) streetType = 'пер.';
    else if (/^бульвар\s/i.test(street) || /^б-р\s/i.test(street)) streetType = 'б-р';
    else if (/^проезд\s/i.test(street)) streetType = 'пр-д';
    else if (/^шоссе\s/i.test(street)) streetType = 'ш.';
    parts.push(streetType + ' ' + cleanStreet);
  }

  const house = addr.house_number;
  if (house) parts.push('д. ' + house);

  return parts.length > 0 ? parts.join(', ') : data.display_name;
}

const ADDRESS_ASK_KW = ['укажите.*адрес', 'ваш адрес подключения', 'какой.*адрес', 'где вы.*находитесь', 'адрес.*подключен'];
const ADDRESS_EXCLUDE_KW = ['квартира или', 'это квартира', 'частный дом', 'номер квартиры', 'какой номер', 'адрес:', 'адрес принят', 'по адресу', 'вся информация', 'ваш.*заяв'];

function checkAddressQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  const hasAsk = ADDRESS_ASK_KW.some(kw => new RegExp(kw, 'i').test(lower));
  const hasExclude = ADDRESS_EXCLUDE_KW.some(kw => kw.includes('.*') ? new RegExp(kw, 'i').test(lower) : lower.includes(kw));
  const hasAddress = /кв\.\s*\d|д\.\s*\d+.*кв/i.test(text);
  return hasAsk && !hasExclude && !hasAddress;
}

// ---------- Phone mask helpers ----------
const PHONE_ASK_KW = ['номер телефона', 'ваш телефон', 'телефон для связи',
  'контактный телефон', 'номер для связи', 'ваш номер',
  'введите.*телефон', 'укажите.*телефон', 'подскажите.*телефон',
  'оставьте.*телефон', 'номер.*для связи'];
const PHONE_EXCLUDE_KW = ['принят', 'спасибо', 'записал', 'нашёл', 'нашел',
  'найден', 'по номеру', 'на номер', 'с номером'];

function checkPhoneQuestion(text: string): boolean {
  const lo = text.toLowerCase();
  const hasKw = PHONE_ASK_KW.some(k => new RegExp(k, 'i').test(lo));
  const hasEx = PHONE_EXCLUDE_KW.some(k => lo.includes(k));
  return hasKw && !hasEx;
}

function formatPhone(digits: string): string {
  let r = '+7(';
  for (let i = 0; i < digits.length && i < 10; i++) {
    if (i === 3) r += ') ';
    if (i === 6) r += '-';
    if (i === 8) r += '-';
    r += digits[i];
  }
  return r;
}

function extractPhoneDigits(value: string): string {
  const raw = value.replace(/\D/g, '');
  let digits = raw;
  if (digits.startsWith('7')) digits = digits.substring(1);
  else if (digits.startsWith('8')) digits = digits.substring(1);
  if (digits.length > 10) digits = digits.substring(0, 10);
  return digits;
}

// ---------- MessageContent ----------
const MessageContent: React.FC<{
  text: string;
  onSuggestionClick?: (text: string) => void;
  isDark?: boolean;
}> = ({ text, onSuggestionClick, isDark }) => {
  const lines = text.split('\n');

  return (
    <div className="leading-relaxed">
      {lines.map((line, i) => {
        // Inline suggestion buttons from 💡 lines
        if (line.includes('💡')) {
          const match = line.match(/💡\s*(.+)/);
          if (match) {
            const fullText = match[1].trim();
            let suggestionText = fullText.replace(/^[^:«"]+[:«"]\s*/, '');
            suggestionText = suggestionText.replace(/[»"']*$/g, '');

            const variants = suggestionText
              .split(/,\s*|\s+или\s+|»\s*,?\s*«|"\s*,?\s*"/)
              .map(v => v.trim())
              .map(v => v.replace(/^[«"''«]|[»"'']$/g, ''))
              .map(v => v.replace(/<[^>]+>/g, ''))
              .map(v => v.replace(/[»«"']+/g, ''))
              .filter(v => v.length > 0 && v.length < 50);

            const header = fullText.split(/[:«]/)[0];

            return (
              <div key={i}>
                <p style={{ color: '#00D4FF', fontWeight: 600, fontSize: '13px', margin: '8px 0 4px 0' }}>
                  💡 {header}
                </p>
                {variants.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {variants.map((v, vi) => (
                      <button
                        key={vi}
                        onClick={() => onSuggestionClick?.(v)}
                        style={{
                          display: 'inline-block',
                          padding: '6px 14px',
                          background: isDark ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.1)',
                          color: '#00D4FF',
                          border: '1px solid rgba(0,212,255,0.3)',
                          borderRadius: '18px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#00D4FF';
                          e.currentTarget.style.color = '#0f172a';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isDark ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.1)';
                          e.currentTarget.style.color = '#00D4FF';
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }
        }

        if (line.trim()) {
          const html = line
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-slate-900 dark:text-white">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^\* (.*?)$/gm, '<span class="text-neon-cyan">•</span> $1');
          return <p key={i} className="mb-1.5 last:mb-0" dangerouslySetInnerHTML={{ __html: html }} />;
        }

        return <div key={i} className="h-1.5" />;
      })}
    </div>
  );
};

// ---------- Gemini API key (loaded at runtime) ----------
let _geminiApiKey = '';
fetch('https://aida.smit34.ru/api/gemini-key')
  .then(r => r.json())
  .then(d => { if (d.key) _geminiApiKey = d.key; })
  .catch(() => {});

// ---------- AIDA relay session ID ----------
const AIDA_CHAT_URL = 'https://aida.smit34.ru/chat';
const RELAY_SESSION_KEY = 'robornet_relay_session';
function getRelaySession(): string {
  let id = localStorage.getItem(RELAY_SESSION_KEY);
  if (!id || !id.startsWith('robornet_')) {
    id = `robornet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(RELAY_SESSION_KEY, id);
  }
  return id;
}

// Post to AIDA chat backend
async function aidaPost(sessionId: string, message: string, isVoice = false): Promise<string> {
  const body: Record<string, unknown> = { session_id: sessionId, message };
  if (isVoice) body.is_voice = true;
  const r = await fetch(AIDA_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return ((await r.json()).response as string) || '';
}

// ---------- Chat session persistence ----------
const CHAT_STORAGE_KEY = 'robornet_chat_history';
const CHAT_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const VOICE_GREETED_KEY = 'robornet_voice_greeted'; // daily auto-greeting

const INITIAL_BOT_MESSAGE: Message = {
  role: 'model',
  text: 'Привет! Я AI-консультант РоборНЭТ. ⚡️ Помогу подобрать тариф, изучить ТВ-пакеты или ответить на вопросы. Что вас интересует?',
};

function loadSavedMessages(): Message[] {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      const { messages: msgs, timestamp } = JSON.parse(saved);
      if (Date.now() - timestamp < CHAT_TTL_MS && msgs?.length > 1) {
        return msgs;
      }
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }
  } catch {}
  return [INITIAL_BOT_MESSAGE];
}

// ---------- Main Component ----------
const GeminiChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [messages, setMessages] = useState<Message[]>(loadSavedMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(() => {
    const saved = loadSavedMessages();
    return saved.length > 1 ? [] : INITIAL_SUGGESTIONS;
  });

  // Geolocation state
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [geoMessageIdx, setGeoMessageIdx] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Phone mask state
  const [phoneMode, setPhoneMode] = useState(false);

  // Voice state
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingMessageRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeConnectionIdRef = useRef<string | null>(null);
  const voiceTranscriptRef = useRef<{ role: string; text: string }[]>([]);
  const voiceCurrentBotRef = useRef('');
  const userInputAccumulatorRef = useRef('');
  const ticketSentRef = useRef(false);

  // Track site theme
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Toggle from outside
  useEffect(() => {
    const handler = (e: any) => {
      setIsOpen(true);
      setMode('chat');
      if (e.detail?.message) pendingMessageRef.current = e.detail.message;
    };
    window.addEventListener('toggle-gemini-chat', handler);
    return () => window.removeEventListener('toggle-gemini-chat', handler);
  }, []);

  // Send pending message when open
  useEffect(() => {
    if (isOpen && pendingMessageRef.current && !isLoading) {
      const msg = pendingMessageRef.current;
      pendingMessageRef.current = null;
      sendMessage(msg);
    }
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  // Persist chat messages to localStorage
  useEffect(() => {
    if (messages.length > 1) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
          messages,
          timestamp: Date.now()
        }));
      } catch {}
    }
  }, [messages]);

  // ============================
  // GEOLOCATION
  // ============================
  const handleGeoDetect = async (msgIdx: number) => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('loading');
    setGeoMessageIdx(msgIdx);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const address = await getAddressFromCoords(position.coords.latitude, position.coords.longitude);
          setInput(address + ', кв. ');
          setGeoStatus('done');
          inputRef.current?.focus();
          setTimeout(() => setGeoStatus('idle'), 2000);
        } catch {
          setGeoStatus('error');
          setTimeout(() => setGeoStatus('idle'), 2000);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setGeoStatus('error');
        setTimeout(() => setGeoStatus('idle'), 2000);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // ============================
  // CHAT
  // ============================
  const sendMessage = async (text: string) => {
    let message = text;
    // Phone mode: extract clean number, show formatted in chat
    if (phoneMode && text.startsWith('+7')) {
      const digits = extractPhoneDigits(text);
      if (digits.length < 10) return;
      message = '+7' + digits;
      setMessages((prev) => [...prev, { role: 'user', text: formatPhone(digits) }]);
      setPhoneMode(false);
      setInput('');
    } else {
      if (!text.trim() || isLoading) return;
      setMessages((prev) => [...prev, { role: 'user', text }]);
      setInput('');
    }
    setIsLoading(true);
    setSuggestions([]);
    setPhoneMode(false);
    setGeoStatus('idle');
    setGeoMessageIdx(-1);
    try {
      const sessionId = getRelaySession();
      const raw = await aidaPost(sessionId, message);
      const { buttons } = parseResponse(raw);
      // Store raw text — inline 💡 buttons rendered by MessageContent
      setMessages((prev) => [...prev, { role: 'model', text: raw }]);
      // Bottom bar only for non-💡 suggestions
      setSuggestions(buttons.length > 0 ? [] : []);
      // Phone mask: activate when bot asks for phone number
      if (checkPhoneQuestion(raw)) {
        setPhoneMode(true);
        setInput('+7(');
        setTimeout(() => inputRef.current?.focus(), 300);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'model', text: `Ошибка соединения. Позвоните нам: ${CONTACTS.phoneShort}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================
  // VOICE cleanup
  // ============================
  const cleanupVoice = () => {
    activeConnectionIdRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    inputContextRef.current?.close();
    inputContextRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    sourcesRef.current.forEach((s) => s.stop());
    sourcesRef.current.clear();
    setIsAgentSpeaking(false);
    nextStartTimeRef.current = 0;
  };

  // ============================
  // VOICE stop + AIDA relay
  // ============================
  const stopVoice = () => {
    // Flush any pending user speech before relay
    if (userInputAccumulatorRef.current) {
      voiceTranscriptRef.current.push({ role: 'user', text: userInputAccumulatorRef.current });
    }
    if (voiceCurrentBotRef.current.trim()) {
      voiceTranscriptRef.current.push({ role: 'bot', text: voiceCurrentBotRef.current.trim() });
    }

    const transcript = [...voiceTranscriptRef.current];
    console.log('[stopVoice] transcript length:', transcript.length, transcript);

    // Direct API call to create ticket/lead (no relay)
    if (transcript.length > 0) {
      const allText = transcript.map((m) => m.text).join(' ').replace(/\s+/g, ' ');
      // Normalize digits: "8 9 0 6 6 4 6 1 5 14" → "89066461514"
      const digitsNorm = allText.replace(/(\d)\s+(?=\d)/g, '$1');

      const nameM = allText.match(/Имя:\s*([А-ЯЁа-яё][а-яё]+(?:\s+[А-ЯЁа-яё][а-яё]+)?)/i)
        ?? allText.match(/(?:вас зовут|меня зовут|зовут)\s+([А-ЯЁа-яё][а-яё]+)/i)
        ?? allText.match(/^([А-ЯЁ][а-яё]{2,}),\s*(?:телефон|номер)/i)
        ?? allText.match(/([А-ЯЁ][а-яё]{2,}),\s*телефон/i);
      const phoneM = digitsNorm.match(/[Тт]елефон[:\s]+(\+?[\d][\d\s\-(]{8,14})/i)
        ?? digitsNorm.match(/(\+?[78]\(?\d{3}\)?\d{3}\d{2}\d{2})/)
        ?? allText.match(/(\+?[78][\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})/);
      const addrM = allText.match(/[Аа]дрес:\s*(.+?)(?:,\s*(?:Тариф|Телефон|Имя|Проблема)|[.!?]|$)/i);
      const tariffM = allText.match(/Тариф:\s*[«"]?([^»".,\n]+)/i) ?? allText.match(/«([^»]+)»/);
      const problemM = allText.match(/[Пп]роблем[аы]?:\s*(.+?)(?:[.]\s*[А-ЯЁ]|[.]\s*$|\s*[Вв]сё верно|\s*[Сс]оздаю|$)/i)
        ?? allText.match(/проблем[аы]?[:\s]+(.+?)(?:[.]\s|$)/i);

      const name = nameM?.[1]?.trim() ?? '';
      const phone = (phoneM?.[1]?.trim() ?? '').replace(/\s/g, '');
      const addr = addrM?.[1]?.trim() ?? '';
      const tariff = tariffM?.[1]?.trim() ?? '';
      const problem = problemM?.[1]?.trim() ?? '';

      console.log('[stopVoice] extracted:', { name, phone, addr, tariff, problem });

      if (name || phone) {
        ticketSentRef.current = true;
        fetch('https://aida.smit34.ru/api/voice-create-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, address: addr, problem, tariff, source: 'robor' }),
        })
          .then((r) => r.json())
          .then((data) => console.log('[Voice ticket] result:', data))
          .catch((e) => console.error('[Voice ticket] error:', e));
      } else {
        console.warn('[Voice ticket] No name/phone parsed from transcript');
      }
    }

    const hadConversation = transcript.length > 0;
    voiceTranscriptRef.current = [];
    voiceCurrentBotRef.current = '';
    userInputAccumulatorRef.current = '';

    if (hadConversation) {
      setMode('chat');
      setMessages((prev) => [...prev, {
        role: 'model',
        text: 'Голосовой разговор завершён. Ваша заявка обработана. Если есть вопросы — напишите!',
      }]);
      setSuggestions([]);
    }

    cleanupVoice();
    setIsVoiceActive(false);
    setVoiceStatus('idle');
  };

  // ============================
  // VOICE connect
  // ============================
  const connectVoice = async () => {
    const connectionId = Date.now().toString();
    activeConnectionIdRef.current = connectionId;
    ticketSentRef.current = false;
    setVoiceStatus('connecting');
    setIsVoiceActive(true);
    setVoiceError(null);

    const handleDrop = (msg: string) => {
      if (activeConnectionIdRef.current !== connectionId && activeConnectionIdRef.current !== null) return;
      // Flush accumulators
      if (userInputAccumulatorRef.current) {
        voiceTranscriptRef.current.push({ role: 'user', text: userInputAccumulatorRef.current });
        userInputAccumulatorRef.current = '';
      }
      if (voiceCurrentBotRef.current.trim()) {
        voiceTranscriptRef.current.push({ role: 'bot', text: voiceCurrentBotRef.current.trim() });
        voiceCurrentBotRef.current = '';
      }
      console.log('[handleDrop] transcript len:', voiceTranscriptRef.current.length);
      // Direct API call
      const allText = voiceTranscriptRef.current.map((m) => m.text).join(' ').replace(/\s+/g, ' ');
      const digitsNorm = allText.replace(/(\d)\s+(?=\d)/g, '$1');
      const nameM = allText.match(/Имя:\s*([А-ЯЁа-яё][а-яё]+(?:\s+[А-ЯЁа-яё][а-яё]+)?)/i)
        ?? allText.match(/(?:вас зовут|меня зовут|зовут)\s+([А-ЯЁа-яё][а-яё]+)/i)
        ?? allText.match(/([А-ЯЁ][а-яё]{2,}),\s*телефон/i);
      const phoneM = digitsNorm.match(/[Тт]елефон[:\s]+(\+?[\d][\d\s\-(]{8,14})/i)
        ?? digitsNorm.match(/(\+?[78]\(?\d{3}\)?\d{3}\d{2}\d{2})/)
        ?? allText.match(/(\+?[78][\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})/);
      const addrM = allText.match(/[Аа]дрес:\s*(.+?)(?:,\s*(?:Тариф|Телефон|Имя|Проблема)|[.!?]|$)/i);
      const tariffM = allText.match(/Тариф:\s*[«"]?([^»".,\n]+)/i) ?? allText.match(/«([^»]+)»/);
      const problemM = allText.match(/[Пп]роблем[аы]?:\s*(.+?)(?:[.]\s*[А-ЯЁ]|[.]\s*$|\s*[Вв]сё верно|\s*[Сс]оздаю|$)/i);
      const name = nameM?.[1]?.trim() ?? '';
      const phone = (phoneM?.[1]?.trim() ?? '').replace(/\s/g, '');
      const addr = addrM?.[1]?.trim() ?? '';
      const tariff = tariffM?.[1]?.trim() ?? '';
      const problem = problemM?.[1]?.trim() ?? '';
      console.log('[handleDrop] parsed:', { name, phone, addr, tariff, problem });
      if ((name || phone) && !ticketSentRef.current) {
        ticketSentRef.current = true;
        fetch('https://aida.smit34.ru/api/voice-create-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, address: addr, problem, tariff, source: 'robor' }),
        })
          .then((r) => r.json())
          .then((d) => console.log('[handleDrop] ticket result:', d))
          .catch((e) => console.error('[handleDrop] ticket error:', e));
      }
      voiceTranscriptRef.current = [];
      cleanupVoice();
      setVoiceStatus('error');
      setVoiceError(msg);
      setIsVoiceActive(false);
    };

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx({ sampleRate: 24000 });
      inputContextRef.current = new AudioCtx({ sampleRate: 16000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      if (activeConnectionIdRef.current !== connectionId) return;

      const ai = new GoogleGenAI({ apiKey: _geminiApiKey, httpOptions: { baseUrl: 'https://aida.smit34.ru' } });
      let sessionPromise: Promise<any>;

      const callbacks = {
        onopen: () => {
          if (activeConnectionIdRef.current !== connectionId) return;
          setVoiceStatus('connected');
          if (!inputContextRef.current || !streamRef.current) return;

          const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
          const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;
          processor.onaudioprocess = (e: AudioProcessingEvent) => {
            if (activeConnectionIdRef.current !== connectionId) return;
            const pcm = floatTo16BitPCM(e.inputBuffer.getChannelData(0));
            const b64 = base64Encode(pcm);
            sessionPromise.then((s) => {
              if (activeConnectionIdRef.current !== connectionId) return;
              try { s.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: b64 } }); } catch {}
            });
          };
          source.connect(processor);
          processor.connect(inputContextRef.current.destination);
        },
        onmessage: async (message: any) => {
          if (activeConnectionIdRef.current !== connectionId) return;

          // Interrupted — stop playing
          if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach((s) => { s.stop(); sourcesRef.current.delete(s); });
            nextStartTimeRef.current = 0;
            setIsAgentSpeaking(false);
            return;
          }

          // Fix Gemini encoding: UTF-8 bytes misread as Latin-1
          const fixEnc = (t: string | undefined): string | undefined => {
            if (!t) return t;
            if (/[\u00C0-\u00FF]/.test(t)) {
              try {
                const b = new Uint8Array(t.length);
                for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i);
                const d = new TextDecoder('utf-8').decode(b);
                if (/[\u0430-\u044F\u0410-\u042F\u0451\u0401]/.test(d)) return d;
              } catch {}
            }
            return t;
          };

          // Clean voice transcript: merge broken fragments, fix spacing
          const cleanTranscript = (t: string): string => {
            if (!t) return t;
            let s = t;
            s = s.replace(/\s+/g, ' ');
            s = s.replace(/\s+([,.:;!?])/g, '$1');
            // Merge broken Cyrillic word fragments
            for (let i = 0; i < 5; i++) {
              s = s.replace(/([а-яА-ЯёЁ]) ([а-яёЁ]{1,2}) (?=[а-яА-ЯёЁ])/g, '$1$2');
              s = s.replace(/([а-яА-ЯёЁ]{1,2}) ([а-яёЁ]{1,3})(?=[\s,.:;!?]|$)/g, (m: string, a: string, b: string) => {
                if ((a.length + b.length) <= 2) return m;
                return a + b;
              });
            }
            // Common address words fix
            s = s.replace(/\bгор\s*о?\s*д\b/gi, 'город');
            s = s.replace(/\bул\s+и\s*ц/gi, 'улиц');
            s = s.replace(/\bдо\s+м\b/gi, 'дом');
            s = s.replace(/\bкв\s*а?\s*рт\s*и?\s*р/gi, 'квартир');
            s = s.replace(/\bко\s*рп\s*ус/gi, 'корпус');
            s = s.replace(/\bпо\s*д\s*ъ?\s*е\s*зд/gi, 'подъезд');
            s = s.replace(/\bэ\s*та\s*ж/gi, 'этаж');
            s = s.replace(/\bте\s*ле\s*фо\s*н/gi, 'телефон');
            s = s.replace(/\bин\s*те\s*рн\s*е\s*т/gi, 'интернет');
            s = s.replace(/\bпр\s*о\s*бл\s*е\s*м/gi, 'проблем');
            s = s.replace(/\bа\s*д\s*ре\s*с/gi, 'адрес');
            s = s.replace(/\bВо\s*лг\s*о?\s*гр\s*а\s*д/gi, 'Волгоград');
            s = s.replace(/\bВо\s*лж\s*ск/gi, 'Волжск');
            s = s.replace(/(\d+)\.\s*$/g, '$1');
            s = s.replace(/\.\s*$/, '');
            return s.trim();
          };

          // User speech — accumulate in one bubble
          const inputText: string | undefined = fixEnc(message.serverContent?.inputTranscription?.text);
          if (inputText?.trim()) {
            // Concatenate without forced space — Gemini includes natural spacing
            userInputAccumulatorRef.current += inputText;
            const acc = cleanTranscript(userInputAccumulatorRef.current);
            if (acc) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'user' && last.text.startsWith('🎤')) {
                  return [...prev.slice(0, -1), { role: 'user', text: `🎤 ${acc}` }];
                }
                return [...prev, { role: 'user', text: `🎤 ${acc}` }];
              });
            }
          }

          // AI output transcript — accumulate until turnComplete
          const outputText: string | undefined = fixEnc(message.serverContent?.outputTranscription?.text);
          if (outputText?.trim()) voiceCurrentBotRef.current += outputText;

          // Turn complete — commit to transcript
          if (message.serverContent?.turnComplete) {
            if (userInputAccumulatorRef.current) {
              voiceTranscriptRef.current.push({ role: 'user', text: cleanTranscript(userInputAccumulatorRef.current) });
              userInputAccumulatorRef.current = '';
            }
            if (voiceCurrentBotRef.current.trim()) {
              const botText = voiceCurrentBotRef.current.trim();
              voiceTranscriptRef.current.push({ role: 'bot', text: botText });
              setMessages((prev) => [...prev, { role: 'model', text: `🔊 ${botText}` }]);
              voiceCurrentBotRef.current = '';
            }
          }

          // Play audio
          const b64Audio = message.serverContent?.modelTurn?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
          if (b64Audio && audioContextRef.current) {
            setIsAgentSpeaking(true);
            const ctx = audioContextRef.current;
            const audioBuf = await decodeAudioData(base64Decode(b64Audio), ctx, 24000);
            // Reserve slot in the timeline before any other chunk can claim it
            const startAt = Math.max(nextStartTimeRef.current, ctx.currentTime + 0.02);
            nextStartTimeRef.current = startAt + audioBuf.duration;
            const src = ctx.createBufferSource();
            src.buffer = audioBuf;
            src.connect(ctx.destination);
            src.onended = () => {
              sourcesRef.current.delete(src);
              if (sourcesRef.current.size === 0) setIsAgentSpeaking(false);
            };
            src.start(startAt);
            sourcesRef.current.add(src);
          }
        },
        onclose: () => handleDrop('Сессия завершена'),
        onerror: (e: any) => {
          handleDrop('Ошибка: ' + (e?.message || String(e)).slice(0, 80));
        },
      };

      sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks,
        config: {
          responseModalities: ['AUDIO'] as any,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }, // мужской голос
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `ЯЗЫК: русский (ru-RU). Все клиенты говорят по-русски. Отвечай ТОЛЬКО на русском языке.

Ты — голосовой консультант интернет-провайдера РоборНЭТ (ООО «РОБОР») в Волгограде. Твоё имя — Алексей.

ТВОЯ ЗАДАЧА: помогать клиентам с выбором тарифа, консультировать по услугам, принимать заявки на подключение.

ТАРИФЫ (ИСПОЛЬЗУЙ ТОЛЬКО ЭТИ!):
${TARIFFS.map((t) => `- «${t.name}» — ${t.speed} Мбит/с, ${t.price} руб/мес${t.tvChannels ? `, ТВ: ${t.tvChannels}` : ''}${t.isWireless ? ' (беспроводной, для частного сектора)' : ''}`).join('\n')}

🚫 КАТЕГОРИЧЕСКИЕ ЗАПРЕТЫ:
- НЕЛЬЗЯ спрашивать "физическое лицо или компания" — РоборНЭТ работает ТОЛЬКО с физлицами!
- НЕЛЬЗЯ спрашивать про юрлицо, ИП, ООО, бизнес — это НЕ наш профиль!
- НЕЛЬЗЯ спрашивать дату и время подключения — менеджер сам назначит!
- НЕЛЬЗЯ называть телефон компании, адрес офиса или график работы
- НЕЛЬЗЯ спрашивать 2 вопроса в одном сообщении

ПОРЯДОК ОФОРМЛЕНИЯ ЗАЯВКИ НА ПОДКЛЮЧЕНИЕ:
1. Поздоровайся и спроси, чем помочь
2. Узнай потребности (для чего нужен интернет)
3. Рекомендуй подходящий тариф
4. Спроси АДРЕС (только адрес)
5. Уточни: квартира или частный дом?
6. Спроси нужен ли роутер
7. Спроси ТЕЛЕФОН (только телефон)
8. Спроси ИМЯ (только имя)
9. Подтверди в формате: "Имя: [имя], Телефон: [телефон], Адрес: [адрес], Тариф: «[тариф]». Всё верно?"

ПРАВИЛА ОБЩЕНИЯ:
- Говори на русском языке, кратко и по делу
- Будь дружелюбным и профессиональным
- Представляйся: "Добрый день! Я Алексей, консультант РоборНЭТ."
- ГЛАВНОЕ ПРАВИЛО: ОДИН ВОПРОС ЗА РАЗ — задай вопрос, жди ответ, потом следующий
- Если клиент назвал адрес без города — уточни: "Это в Волгограде?"

ЕСЛИ КЛИЕНТ ЖАЛУЕТСЯ (не работает, проблема, сломалось):
1. Посочувствуй кратко
2. Спроси ИМЯ (только имя)
3. Спроси ТЕЛЕФОН (только телефон)
4. Спроси в чём проблема (если не сказал)
5. Подтверди: "Имя: [имя], Телефон: [телефон], Проблема: [описание]. Создаю обращение в поддержку, всё верно?"`,
        },
      });

      sessionPromise.then((session) => {
        if (activeConnectionIdRef.current === connectionId) {
          try {
            session.sendClientContent({
              turns: [{ role: 'user', parts: [{ text: '[НАЧАЛО СЕССИИ] Поздоровайся с клиентом как консультант РоборНЭТ и спроси, чем можешь помочь.' }] }],
              turnComplete: true,
            });
          } catch {}
        }
      }).catch((e: any) => {
        handleDrop('Не удалось подключиться: ' + (e?.message || String(e)).slice(0, 80));
      });

    } catch (err: any) {
      cleanupVoice();
      setIsVoiceActive(false);
      setVoiceStatus('error');
      setVoiceError(err.name === 'NotAllowedError' ? 'Нет доступа к микрофону' : 'Ошибка: ' + err.message);
    }
  };

  useEffect(() => () => cleanupVoice(), []);

  // Auto voice greeting — opens voice chat 60s after page load (once per day)
  useEffect(() => {
    const today = new Date().toDateString();
    if (localStorage.getItem(VOICE_GREETED_KEY) === today) return;

    const timer = setTimeout(() => {
      localStorage.setItem(VOICE_GREETED_KEY, today);
      setIsOpen(true);
      setMode('voice');
      setTimeout(() => connectVoice(), 600);
    }, 60_000);

    return () => clearTimeout(timer);
  }, []);

  const close = () => {
    if (mode === 'voice' && isVoiceActive) stopVoice();
    setIsOpen(false);
  };

  const voiceMessages = messages.filter((m) => m.text?.startsWith('🎤') || m.text?.startsWith('🔊'));

  return (
    <>
      {/* ===== Widget Panel ===== */}
      <div
        style={{
          position: 'fixed',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'opacity 0.3s, visibility 0.3s',
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          pointerEvents: isOpen ? 'auto' : 'none',
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          top: window.innerWidth < 640 ? 0 : 'auto',
          left: window.innerWidth < 640 ? 0 : 'auto',
          right: window.innerWidth < 640 ? 0 : '24px',
          bottom: window.innerWidth < 640 ? 0 : '96px',
          width: window.innerWidth < 640 ? '100%' : '384px',
          height: window.innerWidth < 640 ? '100%' : '580px',
          borderRadius: window.innerWidth < 640 ? '0' : '24px',
          border: window.innerWidth < 640 ? 'none' : isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: window.innerWidth < 640 ? 'none' : isDark ? '0 20px 60px rgba(0,212,255,0.25)' : '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >

        {/* Header — всегда голубой */}
        <div style={{ backgroundColor: '#00D4FF' }} className="px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/25 border border-white/40 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="font-heading font-extrabold text-sm tracking-tight text-white">RoborNET AI</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest">
                  {voiceStatus === 'connected' ? 'голосовой звонок' : 'онлайн'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(mode === 'voice' ? 'chat' : 'voice')}
              title={mode === 'voice' ? 'Текстовый чат' : 'Голосовой режим'}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                mode === 'voice' ? 'bg-white/40 text-white' : 'bg-white/20 hover:bg-white/35 text-white/80 hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            <button
              onClick={close}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors text-white/80 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div
          style={{
            display: 'flex',
            flexShrink: 0,
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
          }}
        >
          {(['chat', 'voice'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMode(tab)}
              style={{
                flex: 1,
                padding: '8px 0',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'color 0.2s',
                borderBottom: mode === tab ? '2px solid #00D4FF' : '2px solid transparent',
                color: mode === tab ? '#00D4FF' : isDark ? '#94a3b8' : '#64748b',
                backgroundColor: mode === tab ? (isDark ? 'rgba(0,212,255,0.08)' : 'rgba(0,212,255,0.05)') : 'transparent',
              }}
            >
              {tab === 'chat' ? (
                <>
                  <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Чат
                </>
              ) : (
                <>
                  <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Голос
                </>
              )}
            </button>
          ))}
        </div>

        {/* ===== CHAT MODE ===== */}
        {mode === 'chat' && (
          <>
            <div
              ref={scrollRef}
              style={{ backgroundColor: isDark ? '#111827' : '#f8fafc', scrollbarWidth: 'none' as const }}
              className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
            >
              {messages.map((m, i) => (
                <div key={i}>
                  <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '10px 14px',
                        borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        fontSize: '14px',
                        backgroundColor: m.role === 'user' ? '#00D4FF' : isDark ? '#1e293b' : '#ffffff',
                        color: m.role === 'user' ? '#0f172a' : isDark ? '#e2e8f0' : '#334155',
                        border: m.role === 'user' ? 'none' : isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                        boxShadow: m.role === 'user' ? 'none' : isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                        fontWeight: m.role === 'user' ? 700 : 400,
                      }}
                    >
                      <MessageContent text={m.text} onSuggestionClick={sendMessage} isDark={isDark} />
                    </div>
                  </div>
                  {/* Geo button — shown after last model message that asks for address, on mobile */}
                  {m.role === 'model' && i === messages.length - 1 && isMobile() && checkAddressQuestion(m.text) && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '6px' }}>
                      <button
                        onClick={() => handleGeoDetect(i)}
                        disabled={geoStatus === 'loading'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          background: geoStatus === 'done' ? '#22c55e' : isDark ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.1)',
                          color: geoStatus === 'done' ? '#fff' : '#00D4FF',
                          border: '1px solid ' + (geoStatus === 'done' ? '#22c55e' : 'rgba(0,212,255,0.3)'),
                          borderRadius: '18px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: geoStatus === 'loading' ? 'wait' : 'pointer',
                          opacity: geoStatus === 'loading' ? 0.7 : 1,
                          transition: 'all 0.2s',
                        }}
                      >
                        {geoStatus === 'loading' && geoMessageIdx === i ? '⏳ Поиск...' :
                         geoStatus === 'done' && geoMessageIdx === i ? '✅ Адрес определён' :
                         geoStatus === 'error' && geoMessageIdx === i ? '🔄 Повторить' :
                         '📍 Определить адрес'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '18px 18px 18px 4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div className="flex gap-1.5">
                      {[0, 150, 300].map((d) => (
                        <div key={d} className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI печатает...</span>
                  </div>
                </div>
              )}
            </div>

            {suggestions.length > 0 && (
              <div
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  flexShrink: 0,
                  borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  scrollbarWidth: 'none' as const,
                }}
              >
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    style={{
                      whiteSpace: 'nowrap',
                      fontSize: '12px',
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      flexShrink: 0,
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                      color: isDark ? '#cbd5e1' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#00D4FF'; (e.currentTarget as HTMLButtonElement).style.color = '#00D4FF'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.color = isDark ? '#cbd5e1' : '#475569'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div
              style={{
                padding: '12px',
                borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                flexShrink: 0,
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
              }}
            >
              <input
                ref={inputRef}
                value={input}
                type={phoneMode ? 'tel' : 'text'}
                onChange={phoneMode ? (e) => {
                  const digits = extractPhoneDigits(e.target.value);
                  setInput(formatPhone(digits));
                } : (e) => setInput(e.target.value)}
                onKeyDown={phoneMode ? (e) => {
                  if (['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Enter'].includes(e.key)) {
                    if (e.key === 'Backspace') {
                      const digits = extractPhoneDigits(input);
                      if (digits.length === 0) { e.preventDefault(); return; }
                    }
                    if (e.key === 'Enter') sendMessage(input);
                    return;
                  }
                  if (e.ctrlKey || e.metaKey) return;
                  if (!/^\d$/.test(e.key)) { e.preventDefault(); return; }
                  if (extractPhoneDigits(input).length >= 10) e.preventDefault();
                } : (e) => { if (e.key === 'Enter') sendMessage(input); }}
                placeholder={phoneMode ? '+7(___) ___-__-__' : 'Задайте вопрос...'}
                style={{
                  flex: 1,
                  backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: phoneMode ? '16px' : '14px',
                  fontFamily: phoneMode ? "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace" : 'inherit',
                  letterSpacing: phoneMode ? '0.5px' : 'normal',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#00D4FF',
                  color: '#0f172a',
                  border: 'none',
                  cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  opacity: !input.trim() || isLoading ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'opacity 0.2s',
                }}
              >
                <svg style={{ width: 16, height: 16, transform: 'rotate(45deg) translateY(-1px)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* ===== VOICE MODE ===== */}
        {mode === 'voice' && (
          <div className="flex-1 flex flex-col min-h-0">
            {(voiceStatus === 'connected' || voiceMessages.length > 0) ? (
              <div
                ref={scrollRef}
                style={{ backgroundColor: isDark ? '#111827' : '#f8fafc', scrollbarWidth: 'none' as const }}
                className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
              >
                {voiceMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '10px 14px',
                        borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        fontSize: '14px',
                        backgroundColor: m.role === 'user' ? '#00D4FF' : isDark ? '#1e293b' : '#ffffff',
                        color: m.role === 'user' ? '#0f172a' : isDark ? '#e2e8f0' : '#334155',
                        border: m.role === 'user' ? 'none' : isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                        fontWeight: m.role === 'user' ? 700 : 400,
                      }}
                    >
                      <MessageContent text={m.text} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#111827' : '#f8fafc' }}>
                {voiceStatus === 'idle' && (
                  <p style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '0 32px', lineHeight: 1.6 }}>
                    Нажмите «Начать» — поговорите с консультантом РоборНЭТ голосом
                  </p>
                )}
                {voiceStatus === 'error' && (
                  <div className="flex flex-col items-center gap-2 text-red-500 px-6 text-center">
                    <span className="text-xs font-bold uppercase tracking-widest">Ошибка</span>
                    <span className="text-sm">{voiceError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Controls */}
            <div
              style={{
                flexShrink: 0,
                padding: '16px',
                borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {voiceStatus === 'connecting' && (
                <div className="flex items-center justify-center gap-2 text-cyan-500 py-1">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-widest">Подключение...</span>
                </div>
              )}
              {voiceStatus === 'connected' && (
                <div className="flex items-end justify-center gap-1 h-8">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div
                      key={i}
                      className="w-2 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: '#00D4FF',
                        height: isAgentSpeaking ? `${30 + ((i * 37 + 13) % 60)}%` : '25%',
                        opacity: isAgentSpeaking ? 1 : 0.35,
                      }}
                    />
                  ))}
                </div>
              )}

              {!isVoiceActive ? (
                <button
                  onClick={connectVoice}
                  style={{ width: '100%', padding: '12px', backgroundColor: '#00D4FF', color: '#0f172a', fontWeight: 800, borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}
                >
                  <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Начать разговор
                </button>
              ) : (
                <button
                  onClick={stopVoice}
                  style={{ width: '100%', padding: '12px', backgroundColor: '#ef4444', color: '#ffffff', fontWeight: 800, borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}
                >
                  <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Завершить
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== FAB Toggle Button ===== */}
      <button
        onClick={() => isOpen ? close() : setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          width: '56px',
          height: '56px',
          borderRadius: '9999px',
          display: isOpen && window.innerWidth < 640 ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(0,212,255,0.4)',
          transition: 'all 0.3s',
          backgroundColor: isOpen ? (isDark ? '#334155' : '#e2e8f0') : '#00D4FF',
          color: isOpen ? (isDark ? '#cbd5e1' : '#475569') : '#0f172a',
          border: 'none',
          cursor: 'pointer',
        }}
        className="group relative active:scale-95 hover:scale-110"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span
              style={{
                position: 'absolute',
                right: '100%',
                marginRight: '16px',
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#f1f5f9' : '#0f172a',
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                opacity: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                pointerEvents: 'none',
              }}
              className="group-hover:opacity-100 transition-opacity"
            >
              AI Ассистент
            </span>
          </>
        )}
      </button>
    </>
  );
};

export default GeminiChat;
