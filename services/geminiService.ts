
import { GoogleGenAI } from "@google/genai";
import { FAQ } from "../constants";
import { TARIFFS } from "../tariffsData";
import { CHANNELS_DATA } from "../channels";
import { CONTACTS } from "../constants/contacts";

// API key loaded at runtime (not bundled into JS)
let _serviceApiKey = '';
const _keyReady = fetch('https://aida.smit34.ru/api/gemini-key')
  .then(r => r.json())
  .then(d => { if (d.key) _serviceApiKey = d.key; })
  .catch(() => {});

const channelsSummary = CHANNELS_DATA.map(cat => ({
  category: cat.title,
  channelCount: cat.list.length,
  valueProposition: cat.title === "HD Каналы" ? "Высочайшее качество изображения для больших экранов" : 
                    cat.title === "Кино" ? "Лучшие мировые премьеры и классика кинематографа" : 
                    cat.title === "Спортивные" ? "Прямые трансляции главных матчей и событий" : "Разнообразный контент для всей семьи",
  examples: cat.list.slice(0, 5).map(url => {
    const filename = url.split('/').pop() || "";
    return filename.replace(/\.(png|jpg|jpeg|gif)$/i, "").replace(/^tv_html_/, "").replace(/^m/, "").toUpperCase();
  })
}));

const TARIFF_PROFILES = TARIFFS.map(t => ({
  ...t,
  bestFor: t.speed >= 100 ? "Геймеров, стримеров и больших семей с множеством устройств" :
           t.speed >= 60 ? "Просмотра 4K видео и комфортной удаленной работы" :
           t.isWireless ? "Жителей частного сектора, где нет возможности провести кабель" : "Базового серфинга и соцсетей",
  upsellLogic: t.name === "Стандарт" ? "Предложи перейти на Оптимум (+20 Мбит/с всего за 100 руб)" : ""
}));

const SYSTEM_INSTRUCTION = `
Ты — RoborNET AI, ассистент интернет-провайдера РоборНЭТ (Волгоград).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 ГЛАВНОЕ ПРАВИЛО — ОДИН ВОПРОС ЗА РАЗ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ ЗАПРЕЩЕНО задавать 2 и более вопроса в одном сообщении.
❌ ЗАПРЕЩЕНО писать список вопросов (1. ... 2. ...).
❌ ЗАПРЕЩЕНО спрашивать тариф И адрес в одном сообщении.
❌ ЗАПРЕЩЕНО спрашивать телефон И роутер в одном сообщении.
✅ Задай ОДИН вопрос → жди ответа → потом следующий.
✅ Каждое твоё сообщение заканчивается ОДНИМ вопросом.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

КОНТАКТЫ:
- Адрес офиса: ${CONTACTS.address}
- График: ${CONTACTS.workingHours}
- Телефон: ${CONTACTS.phoneShort}

ТАРИФЫ:
${JSON.stringify(TARIFF_PROFILES, null, 2)}

ТВ (140+ КАНАЛОВ):
${JSON.stringify(channelsSummary, null, 2)}

БАЗА ЗНАНИЙ (FAQ):
${JSON.stringify(FAQ, null, 2)}

СТРОГИЙ ПОРЯДОК ОФОРМЛЕНИЯ ЗАЯВКИ (нарушать нельзя):
1. Уточни потребности клиента (кратко)
2. Предложи подходящий тариф
3. Спроси АДРЕС (только адрес, ничего больше)
4. Спроси: квартира или дом? (если не указано в адресе)
5. Спроси: нужен ли роутер? (только этот вопрос)
6. Спроси ТЕЛЕФОН (только этот вопрос)
7. Подтверди заявку итоговым сообщением

НА КАЖДОМ ШАГЕ — ТОЛЬКО ОДИН ВОПРОС. Не перепрыгивай шаги.

СТИЛЬ:
- Короткие сообщения, разбивай на абзацы
- **Жирный** для цен и названий тарифов
- Эмодзи: ⚡️ 🌐 📺 🚀 🏠
- Не пиши длинные описания тарифов без запроса клиента

ПРАВИЛО ПЕРВОГО КОНТАКТА:
Если клиент только открыл чат — поздоровайся и спроси одним коротким вопросом, что его интересует.
`;

export async function getGeminiResponse(userMessage: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  try {
    await _keyReady;
    const ai = new GoogleGenAI({ apiKey: _serviceApiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history,
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    return response.text || `Извините, возникла ошибка. Пожалуйста, попробуйте еще раз или позвоните нам ${CONTACTS.phoneShort}.`;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Связь с базой данных временно прервана. Наберите ${CONTACTS.phoneShort}, наши операторы помогут!`;
  }
}
