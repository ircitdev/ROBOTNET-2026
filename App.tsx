
import React, { useState, useEffect, useRef } from 'react';
import { FAQ } from './constants';
import { TARIFFS } from './tariffsData';
import { NEWS_DATA } from './news';
import { NewsItem } from './types';
import { CHANNELS_DATA } from './channels';
import ThreeHero from './components/ThreeHero';
import GeminiChat, { toggleGeminiChat } from './components/GeminiChat';
import Preloader from './components/Preloader';
import PromoModal from './components/PromoModal';
import { PROMO_MODAL_DATA } from './constants/promoData';
import { CONTACTS } from './constants/contacts';

const FAQItem: React.FC<{ question: string; answer: string; isOpen: boolean; onClick: () => void }> = ({ question, answer, isOpen, onClick }) => {
  return (
    <div className={`group bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-500 overflow-hidden ${
      isOpen ? 'border-neon-cyan shadow-[0_0_30px_rgba(0,212,255,0.15)]' : 'border-slate-200 dark:border-slate-800 hover:border-neon-cyan/40'
    }`}>
      <button 
        onClick={onClick}
        className="w-full text-left p-7 flex justify-between items-center focus:outline-none"
        aria-expanded={isOpen}
      >
        <span className={`text-lg font-heading font-bold transition-colors duration-300 ${isOpen ? 'text-neon-cyan' : 'text-slate-900 dark:text-white'}`}>
          {question}
        </span>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${isOpen ? 'bg-neon-cyan text-slate-900 rotate-180' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="p-7 pt-0 text-slate-600 dark:text-slate-400 text-base leading-relaxed border-t border-slate-50 dark:border-slate-800/50 mt-0">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isDark, setIsDark] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [visibleNewsCount, setVisibleNewsCount] = useState(3);
  const [newsModalActive, setNewsModalActive] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const [isChannelsModalOpen, setIsChannelsModalOpen] = useState(false);
  const [selectedChannelCategory, setSelectedChannelCategory] = useState(0);
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);

  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading) {
      const promoTimer = setTimeout(() => setShowPromoModal(true), PROMO_MODAL_DATA.delay);
      const cookieTimer = setTimeout(() => setShowCookieBanner(true), 30000);
      return () => {
        clearTimeout(promoTimer);
        clearTimeout(cookieTimer);
      };
    }
  }, [isLoading]);

  // Auto-hide cookie banner after 5 seconds
  useEffect(() => {
    if (showCookieBanner) {
      const hideTimer = setTimeout(() => setShowCookieBanner(false), 5000);
      return () => clearTimeout(hideTimer);
    }
  }, [showCookieBanner]);

  // GSAP Animations
  useEffect(() => {
    if (isLoading) return;

    const gsap = (window as any).gsap;
    const ScrollTrigger = (window as any).ScrollTrigger;
    if (!gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.set(".gsap-reveal", { opacity: 0, y: 30 });

      const heroTl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1.2 } });
      heroTl
        .to(".hero-badge", { y: 0, opacity: 1, duration: 0.8 }, 0.5)
        .to(".hero-title", { y: 0, opacity: 1, stagger: 0.2 }, "-=0.6")
        .to(".hero-p", { y: 0, opacity: 1 }, "-=0.8")
        .to(".hero-btns", { y: 0, opacity: 1, stagger: 0.15 }, "-=1");

      const revealOnScroll = (selector: string, start: string = "top 85%") => {
        gsap.utils.toArray(selector).forEach((el: any) => {
          gsap.to(el, {
            scrollTrigger: { trigger: el, start },
            y: 0, opacity: 1, duration: 1, ease: "power3.out",
            overwrite: "auto"
          });
        });
      };

      revealOnScroll(".section-heading");
      revealOnScroll(".tariff-card", "top 70%");
      revealOnScroll(".about-text", "top 70%");
      revealOnScroll(".news-card", "top 70%");
      revealOnScroll(".faq-gsap", "top 75%");
      revealOnScroll(".help-gsap", "top 80%");
      revealOnScroll(".office-info-gsap", "top 75%");
      revealOnScroll(".legal-info-gsap", "top 75%");

      gsap.to(".about-visual", {
        scrollTrigger: { trigger: "#about", start: "top 60%" },
        scale: 1, opacity: 1, duration: 1.5, ease: "elastic.out(1, 0.75)"
      });
    }, containerRef);

    return () => ctx.revert();
  }, [isLoading]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  useEffect(() => {
    if (newsModalActive || isChannelsModalOpen || isLoading || showPromoModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [newsModalActive, isChannelsModalOpen, isLoading, showPromoModal]);

  const openNews = (item: NewsItem) => {
    setSelectedNews(item);
    setNewsModalActive(true);
  };

  const closeNews = () => {
    setNewsModalActive(false);
    setTimeout(() => setSelectedNews(null), 400);
  };

  const loadMoreNews = () => setVisibleNewsCount(prev => prev + 3);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div ref={containerRef}>
      {isLoading && <Preloader onComplete={() => setIsLoading(false)} />}
      
      <div className={`min-h-screen flex flex-col font-sans transition-opacity duration-1000 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {/* Header */}
        <header className={`fixed top-0 w-full z-[100] transition-all duration-300 ${scrolled ? 'bg-white/90 dark:bg-slate-950/90 glass py-3 border-b border-neon-cyan/10' : 'bg-transparent py-5 border-b border-transparent'}`}>
          <div className="container mx-auto px-6 flex justify-between items-center">
            <a href="#" className="flex items-center gap-2 group" aria-label="РоборНЭТ Главная">
              <svg className="w-8 h-8 text-neon-cyan group-hover:drop-shadow-[0_0_8px_#00D4FF]" viewBox="0 0 640 512" fill="currentColor" role="img" aria-hidden="true">
                <path d="M634.91 154.88C457.74-8.99 182.19-8.93 5.09 154.88c-6.66 6.16-6.79 16.59-.35 22.98l34.24 33.97c6.14 6.1 16.28 6.25 22.48.51 126.96-117.63 318.66-118.49 446.71 0 6.21 5.74 16.34 5.59 22.48-.51l34.24-33.97c6.44-6.39 6.31-16.82-.35-22.98zM320 352c-35.35 0-64 28.65-64 64s28.65 64 64 64 64-28.65 64-64-28.65-64-64-64zm202.67-83.59c-111.53-103.35-293.78-103.37-405.33 0-6.26 5.8-6.43 15.91-.52 21.79l34.32 34.12c5.82 5.8 15.35 5.82 21.13.02 73.08-67.65 192.47-67.71 265.81 0 5.78 5.79 15.31 5.78 21.13-.02l34.32-34.12c5.78-5.77 5.74-15.99-.52-21.79z"/>
              </svg>
              <span className="text-2xl font-heading font-extrabold tracking-tighter dark:text-white">Robor<span className="text-neon-cyan">NET</span></span>
            </a>

            <nav className="hidden lg:flex items-center gap-8 font-medium uppercase text-[10px] tracking-widest" aria-label="Основная навигация">
              <a href="#about" className="hover:text-neon-cyan transition-colors dark:text-slate-300">О сети</a>
              <a href="#tariffs" className="hover:text-neon-cyan transition-colors dark:text-slate-300">Тарифы</a>
              <a href="#tv" className="hover:text-neon-cyan transition-colors dark:text-slate-300">ТВ</a>
              <a href="#news" className="hover:text-neon-cyan transition-colors dark:text-slate-300">Новости</a>
              <a href="#faq" className="hover:text-neon-cyan transition-colors dark:text-slate-300">FAQ</a>
              <button onClick={() => toggleGeminiChat()} className="text-neon-cyan font-bold hover:scale-105 transition-transform" aria-label="Открыть ИИ Помощника">AI Помощь</button>
              <button onClick={() => setIsDark(!isDark)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl transition-all active:scale-90" aria-label="Переключить тему оформления">
                {isDark ? '☀️' : '🌙'}
              </button>
              <a href="http://lk.robornet.ru/" className="bg-neon-cyan text-slate-900 px-7 py-2.5 rounded-full font-bold shadow-neon-cyan transition-all hover:scale-105">ЛК</a>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative h-screen flex items-center overflow-hidden" aria-labelledby="hero-title">
          <ThreeHero />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-transparent to-transparent pointer-events-none" />
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-4xl">
              <div className="hero-badge gsap-reveal">
                <span className="inline-block px-4 py-1.5 rounded-full bg-neon-cyan/15 text-neon-cyan text-[10px] font-bold uppercase tracking-[0.2em] mb-8 border border-neon-cyan/40 backdrop-blur-sm">Инновации в каждом бите</span>
              </div>
              <h1 id="hero-title" className="hero-title gsap-reveal text-6xl md:text-9xl font-heading font-extrabold leading-[0.9] mb-10 dark:text-white">Интернет <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-white to-neon-lime">будущего</span></h1>
              <p className="hero-p gsap-reveal text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-12 max-w-2xl leading-relaxed">Забудьте о задержках. Погрузитесь в мир контента на максимальной скорости с РоборНЭТ в Волгограде.</p>
              <div className="hero-btns gsap-reveal flex flex-wrap gap-5">
                <a href="#tariffs" className="bg-neon-lime text-slate-900 px-10 py-5 rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(46,204,113,0.4)] transition-all hover:translate-y-[-4px] animate-click-glow">Выбрать тариф</a>
                <a href="#about" className="px-10 py-5 rounded-2xl font-bold text-lg border border-slate-300 dark:border-slate-700 dark:text-white bg-white/5 backdrop-blur-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:translate-y-[-4px]">О технологии</a>
              </div>
            </div>
          </div>
        </section>

        {/* Tariffs Section */}
        <section id="tariffs" className="py-32 bg-slate-50 dark:bg-slate-950" aria-labelledby="tariffs-title">
          <div className="container mx-auto px-6">
            <div className="section-heading text-center max-w-2xl mx-auto mb-20">
              <span className="text-neon-cyan font-bold uppercase tracking-[0.2em] text-xs mb-4 block">Доступные решения</span>
              <h2 id="tariffs-title" className="text-4xl md:text-5xl font-heading font-extrabold mb-6 dark:text-white">Тарифные планы интернет-провайдера</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg">Прозрачные условия и максимальная производительность для каждого абонента.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {TARIFFS.map((t) => (
                <article key={t.id} className={`tariff-card gsap-reveal group p-8 rounded-[2rem] border bg-white dark:bg-[#111827] flex flex-col transition-all duration-500 hover:translate-y-[-10px] ${t.isPopular ? 'border-neon-cyan shadow-[0_0_30px_rgba(0,212,255,0.15)] ring-2 ring-neon-cyan/20' : 'border-slate-200 dark:border-slate-800'}`}>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-2xl font-heading font-bold dark:text-white">{t.name}</h3>
                      {t.isPopular && <span className="bg-neon-cyan text-slate-900 text-[9px] font-extrabold px-3 py-1 rounded-sm uppercase tracking-widest">хит продаж</span>}
                    </div>
                    <div className="mb-8">
                      <span className="text-5xl font-heading font-extrabold dark:text-white tracking-tighter">{t.price}</span> 
                      <span className="text-slate-400 ml-1.5 text-lg font-medium">₽/мес</span>
                    </div>
                    <div className="space-y-4 mb-8 text-sm font-bold text-slate-500 dark:text-slate-300">
                      {t.isWireless && <div className="flex items-center gap-4">Беспроводное подключение</div>}
                      <div className="flex items-center gap-4">Скорость {t.speed} Мбит/с</div>
                      {t.nightSpeed && <div className="flex items-center gap-4">Ночью: {t.nightSpeed} Мбит/с</div>}
                      {t.tvChannels && <div className="flex items-center gap-4">ТВ: {t.tvChannels} каналов</div>}
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleGeminiChat(`Привет! Я выбрал тариф "${t.name}"`)}
                    className={`w-full py-4 rounded-xl font-heading font-extrabold text-xs uppercase tracking-widest transition-all ${t.isPopular ? 'bg-gradient-to-r from-[#2ECC71] to-[#27AE60] text-white hover:scale-[1.02]' : 'bg-[#1F2937] text-[#9CA3AF] hover:bg-slate-700'}`}>
                    {t.buttonText || 'ПОДКЛЮЧИТЬ'}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-32 bg-white dark:bg-slate-900 relative overflow-hidden" aria-labelledby="about-title">
          <div className="container mx-auto px-6 relative z-10">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div className="about-text gsap-reveal">
                  <span className="text-neon-cyan font-bold uppercase tracking-[0.2em] text-xs mb-4 block">Технологическое превосходство</span>
                  <h2 id="about-title" className="text-4xl md:text-6xl font-heading font-extrabold mb-8 dark:text-white leading-tight">О сети RoborNET</h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-10 text-xl leading-relaxed">Мы построили не просто сеть, а цифровую экосистему. Собственная магистральная инфраструктура в Волгограде позволяет нам предоставлять услуги без посредников.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {['FTTB Архитектура', 'Локальные ресурсы', 'Smart Support', 'IPv6 Ready'].map((feat, i) => (
                      <div key={i} className="flex gap-5 items-center group">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700 group-hover:border-neon-cyan transition-all">
                          <svg className="w-6 h-6 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="font-heading font-bold dark:text-white text-lg">{feat}</h3>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="about-visual gsap-reveal relative">
                  <div className="absolute -inset-10 bg-neon-cyan/10 blur-[120px] rounded-full animate-pulse" />
                  <div className="relative bg-white dark:bg-slate-800/40 backdrop-blur-xl p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-700 shadow-2xl">
                    <div className="text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Статус сети</div>
                      <div className="text-3xl font-heading font-extrabold text-neon-lime">Online</div>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </section>

        {/* TV Section */}
        <section id="tv" className="py-32 bg-slate-50 dark:bg-slate-950 relative overflow-hidden" aria-labelledby="tv-title">
          <div className="absolute inset-0 tv-pattern opacity-60 pointer-events-none" />
          <div className="container mx-auto px-6 relative z-10">
            <div className="flex flex-col lg:flex-row gap-20 items-center mb-16">
              <div className="section-heading lg:w-2/5">
                <span className="text-neon-cyan font-bold uppercase tracking-[0.2em] text-xs mb-4 block">Интерактивный контент</span>
                <h2 id="tv-title" className="text-4xl md:text-6xl font-heading font-extrabold mb-8 dark:text-white">Больше чем ТВ</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-10 text-xl leading-relaxed">Погрузитесь в атмосферу кинотеатра у себя дома. Наше ТВ — это свобода выбора: архив за 7 дней, пауза эфира и одновременный просмотр на 5 устройствах.</p>
                <div className="flex flex-col gap-5">
                   {['5 Устройств', '4K & HDR', '7 Дней записи'].map((item, i) => (
                     <div key={i} className="flex items-center justify-between p-5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-slate-700 font-bold dark:text-white">
                        <span>{item}</span>
                        <svg className="w-5 h-5 text-neon-cyan" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                     </div>
                   ))}
                </div>
              </div>
              <div className="lg:w-3/5 grid grid-cols-2 sm:grid-cols-3 gap-6 w-full">
                {CHANNELS_DATA.slice(0, 6).map((cat, i) => (
                  <button key={i} onClick={() => { setSelectedChannelCategory(i); setIsChannelsModalOpen(true); }} className="tv-cat group relative overflow-hidden rounded-[2.5rem] aspect-[16/11] bg-slate-900 border dark:border-slate-700 shadow-xl hover:scale-[1.05] transition-all" aria-label={`Смотреть список каналов в категории ${cat.title}`}>
                    <img src={cat.img} alt={`Каналы категории ${cat.title}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent flex flex-col justify-end p-6">
                      <span className="text-white font-heading font-extrabold text-sm tracking-widest uppercase">{cat.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* News Section */}
        <section id="news" className="py-32 bg-white dark:bg-slate-900" aria-labelledby="news-title">
          <div className="container mx-auto px-6">
            <div className="section-heading text-center mb-20">
              <h2 id="news-title" className="text-4xl md:text-6xl font-heading font-extrabold dark:text-white">Новости и события компании</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-20">
              {NEWS_DATA.slice(0, visibleNewsCount).map((item) => (
                <article key={item.id} className="news-card gsap-reveal news-item-card bg-slate-50 dark:bg-slate-800/50 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 cursor-pointer group" onClick={() => openNews(item)}>
                  <div className="flex justify-between items-center mb-8">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] text-white font-extrabold uppercase tracking-widest ${item.tagColor}`}>{item.tag}</span>
                    <span className="text-xs font-bold text-slate-400">{item.date}</span>
                  </div>
                  <h3 className="text-2xl font-heading font-bold mb-6 dark:text-white group-hover:text-neon-cyan transition-colors">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed line-clamp-3 mb-8">{item.description}</p>
                  <button className="read-more-btn text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400 group-hover:text-neon-cyan flex items-center gap-3" aria-label={`Читать новость: ${item.title}`}>Читать полностью</button>
                </article>
              ))}
            </div>
            {visibleNewsCount < NEWS_DATA.length && (
              <div className="flex justify-center">
                <button onClick={loadMoreNews} className="px-16 py-6 rounded-[2rem] border-2 border-neon-cyan/30 text-neon-cyan font-heading font-extrabold uppercase tracking-[0.3em] hover:border-neon-cyan hover:scale-105 transition-all">Показать еще</button>
              </div>
            )}
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-32 bg-slate-50 dark:bg-slate-950" aria-labelledby="faq-title">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="section-heading text-center mb-20">
              <h2 id="faq-title" className="text-4xl md:text-5xl font-heading font-extrabold dark:text-white">Часто задаваемые вопросы</h2>
            </div>
            <div className="space-y-6">
              {FAQ.map((item, index) => (
                <div className="faq-gsap gsap-reveal" key={index}>
                    <FAQItem question={item.question} answer={item.answer} isOpen={openFAQIndex === index} onClick={() => setOpenFAQIndex(openFAQIndex === index ? null : index)} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Need Help Block */}
        <section id="help" className="py-20 bg-slate-50 dark:bg-slate-950">
          <div className="container mx-auto px-6">
            <div className="help-gsap gsap-reveal bg-gradient-to-r from-neon-cyan to-blue-600 rounded-[3rem] p-12 text-white flex flex-col lg:flex-row items-center justify-between gap-10 shadow-neon-cyan relative overflow-hidden">
              <div className="absolute inset-0 bg-white/5 opacity-20 pointer-events-none tv-pattern" />
              <div className="relative z-10 flex-1">
                <h2 className="text-3xl md:text-5xl font-heading font-extrabold mb-4">Нужна помощь?</h2>
                <p className="text-white/80 text-xl font-medium">Наши специалисты и ИИ-ассистент на связи 24/7</p>
              </div>
              <div className="relative z-10 flex flex-wrap gap-4 justify-center lg:justify-end shrink-0">
                <a href={`tel:${CONTACTS.phoneShort.replace(/-/g, '')}`} className="bg-white text-slate-900 px-8 py-5 rounded-2xl font-heading font-extrabold text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeWidth="2"/></svg>
                  {CONTACTS.phoneShort}
                </a>
                <a href={CONTACTS.tgBot} target="_blank" rel="noopener" className="bg-[#229ED9]/20 backdrop-blur-xl border border-white/20 text-white px-8 py-5 rounded-2xl font-heading font-extrabold text-xs uppercase tracking-widest hover:bg-[#229ED9]/40 transition-all flex items-center gap-3">
                   <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.215-3.053 5.556-5.02c.241-.213-.053-.333-.374-.12l-6.868 4.326-2.96-.924c-.643-.201-.656-.643.134-.951l11.57-4.458c.536-.195 1.004.127.828.928z"/></svg>
                   Telegram Bot
                </a>
                <button onClick={() => toggleGeminiChat()} className="bg-slate-900/20 backdrop-blur-xl border border-white/30 px-8 py-5 rounded-2xl font-heading font-extrabold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3">
                  <svg className="w-5 h-5 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  AI Ассистент
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Official & Office Block */}
        <section id="office" className="py-32 bg-white dark:bg-slate-900" aria-labelledby="office-title">
          <div className="container mx-auto px-6">
            <div className="section-heading text-center mb-16">
              <h2 id="office-title" className="text-4xl md:text-5xl font-heading font-extrabold dark:text-white">Официально</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              <div className="office-info-gsap gsap-reveal p-12 bg-white dark:bg-slate-800/50 rounded-[3.5rem] border border-slate-200 dark:border-slate-700 shadow-xl">
                <h3 className="text-2xl font-heading font-extrabold mb-8 dark:text-white">Офис обслуживания РоборНЭТ</h3>
                <div className="flex flex-col md:flex-row gap-10">
                  <div className="space-y-6 flex-1 text-slate-600 dark:text-slate-300">
                    <p className="font-bold text-lg">{CONTACTS.address}</p>
                    <p>{CONTACTS.workingHours} ({CONTACTS.workingHoursWeekend})</p>
                  </div>
                  <div className="w-full md:w-64 rounded-3xl overflow-hidden shadow-lg border dark:border-slate-700">
                    <img src="https://storage.googleapis.com/uspeshnyy-projects/smit/robotnet.ru/simplemap.png" alt="Схема проезда к офису РоборНЭТ в Волгограде" className="w-full h-auto object-cover opacity-80" />
                  </div>
                </div>
              </div>
              <div className="legal-info-gsap gsap-reveal p-12 bg-slate-900 rounded-[3.5rem] border border-white/5 text-white">
                <h3 className="text-2xl font-heading font-extrabold mb-8 border-b border-white/10 pb-4">Юридическая информация</h3>
                <div className="space-y-4 font-medium text-slate-400">
                   <p>{CONTACTS.legalName}</p>
                   <p>ИНН {CONTACTS.inn} / КПП {CONTACTS.kpp}</p>
                   <p>ОГРН {CONTACTS.ogrn}</p>
                   <p className="text-xs">{CONTACTS.legalAddress}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <GeminiChat />

        {/* Modal Logic Integration */}
        <PromoModal isOpen={showPromoModal} onClose={() => setShowPromoModal(false)} />

        {showCookieBanner && (
          <aside className="fixed bottom-6 left-6 z-[2000] w-[90%] max-w-[420px] animate-in slide-in-from-left-10 duration-700" role="alert" aria-live="polite">
            <div className="bg-white/60 dark:bg-slate-900/60 glass rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-6">
              <div className="shrink-0 w-16 h-16 bg-[#E8FBF4] dark:bg-[#1A3A34] rounded-2xl flex items-center justify-center text-[#10B981]">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/></svg>
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-heading font-extrabold mb-2 dark:text-white">Мы используем cookie</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">Это необходимо для корректной работы сайта и анализа трафика. Продолжая, вы соглашаетесь с нашей <a href="https://storage.googleapis.com/uspeshnyy-projects/smit/robotnet.ru/%D0%9F%D0%9E%D0%9B%D0%9E%D0%96%D0%95%D0%9D%D0%98%D0%95_%D0%be%D0%B1_%D0%be%D0%B1%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B5_%D0%9F%D0%94.pdf" className="text-[#10B981] font-bold hover:underline" target="_blank" rel="noopener">политикой обработки данных</a>.</p>
                <button onClick={() => setShowCookieBanner(false)} className="px-10 py-3 bg-[#10B981] text-white rounded-2xl font-heading font-extrabold text-sm hover:bg-[#059669] transition-colors">Хорошо</button>
              </div>
            </div>
          </aside>
        )}

        {/* Footer */}
        <footer className="bg-slate-950 text-white pt-24 pb-10 border-t border-white/5 mt-auto" aria-label="Подвал сайта">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20 text-left">
              <div>
                <span className="text-2xl font-heading font-extrabold tracking-tighter mb-6 block">Robor<span className="text-neon-cyan">NET</span></span>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">Ваш технологичный партнер в мире связи в Волгограде. Высокая скорость и безупречный сервис с 2011 года.</p>
                <div className="flex gap-4">
                  <a href={CONTACTS.vk} target="_blank" rel="noopener" className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-neon-cyan hover:text-slate-900 transition-all border border-white/10 group" aria-label="Мы ВКонтакте">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.057 3h-14.114c-1.072 0-1.943.871-1.943 1.943v14.114c0 1.072.871 1.943 1.943 1.943h14.114c1.072 0 1.943-.871 1.943-1.943v-14.114c0-1.072-.871-1.943-1.943-1.943zm-3.321 11.239h-1.062c-.443 0-.583.351-.583.743v1.896h1.645l-.214 1.839h-1.431v4.783h-2.152v-4.783h-.846v-1.839h.846v-1.353c0-1.378.846-2.131 2.072-2.131.583 0 1.107.043 1.253.063v1.453h-.846c-.668 0-.796.317-.796.782v1.033h1.621l-.214 1.839z"/></svg>
                  </a>
                  <a href={CONTACTS.tgChannel} target="_blank" rel="noopener" className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-neon-cyan hover:text-slate-900 transition-all border border-white/10" aria-label="Наш Telegram канал">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.215-3.053 5.556-5.02c.241-.213-.053-.333-.374-.12l-6.868 4.326-2.96-.924c-.643-.201-.656-.643.134-.951l11.57-4.458c.536-.195 1.004.127.828.928z"/></svg>
                  </a>
                </div>
              </div>
              <div>
                <h4 className="font-heading font-bold uppercase text-[10px] tracking-[0.2em] text-slate-500 mb-8">Навигация</h4>
                <nav className="flex flex-col gap-5 text-sm font-medium text-slate-400" aria-label="Навигация в подвале">
                  <a href="#tariffs" className="hover:text-neon-cyan transition-colors">Тарифы и подключение</a>
                  <a href="#tv" className="hover:text-neon-cyan transition-colors">Интерактивное ТВ</a>
                  <a href="#news" className="hover:text-neon-cyan transition-colors">Новости компании</a>
                  <a href="#faq" className="hover:text-neon-cyan transition-colors">Вопросы и ответы</a>
                  <a href={CONTACTS.tgBot} target="_blank" rel="noopener" className="text-neon-cyan hover:underline">Telegram Бот</a>
                </nav>
              </div>
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div>
                  <h4 className="font-heading font-bold uppercase text-[10px] tracking-[0.2em] text-slate-500 mb-8">Поддержка</h4>
                  <address className="not-italic space-y-6">
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Горячая линия</span>
                        <a href={`tel:${CONTACTS.phoneShort.replace(/-/g, '')}`} className="text-white font-heading font-extrabold text-2xl hover:text-neon-cyan transition-colors block leading-none">{CONTACTS.phoneShort}</a>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Мобильный</span>
                        <a href={`tel:${CONTACTS.phoneMobile.replace(/[^\d+]/g, '')}`} className="text-white font-heading font-bold text-xl hover:text-neon-cyan transition-colors block leading-none">{CONTACTS.phoneMobile}</a>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Email</span>
                        <a href={`mailto:${CONTACTS.email}`} className="text-slate-400 hover:text-neon-cyan transition-colors block text-sm">{CONTACTS.email}</a>
                    </div>
                  </address>
                </div>
                <div>
                  <h4 className="font-heading font-bold uppercase text-[10px] tracking-[0.2em] text-slate-500 mb-8">Офис</h4>
                  <div className="text-slate-400 text-sm leading-relaxed space-y-4">
                    <p className="font-bold text-white">{CONTACTS.address}</p>
                    <p>{CONTACTS.workingHours}<br/>{CONTACTS.workingHoursWeekend}</p>
                    <div className="pt-4 flex flex-col gap-2">
                        <a href="https://storage.googleapis.com/uspeshnyy-projects/smit/robotnet.ru/%D0%94%D0%BE%D0%B3%D0%BE%D0%B2%D0%BE%D1%80_%D0%9E%D0%A3%D0%A1_%D0%A0%D0%9E%D0%91%D0%9E%D0%A0_11-2022.pdf" target="_blank" rel="noopener" className="hover:text-white transition-colors underline decoration-slate-800 underline-offset-4">Публичная оферта</a>
                        <a href="https://storage.googleapis.com/uspeshnyy-projects/smit/robotnet.ru/%D0%9F%D0%9E%D0%9B%D0%9E%D0%96%D0%95%D0%9D%D0%98%D0%95_%D0%be%D0%B1_%D0%be%D0%B1%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B5_%D0%9F%D0%94.pdf" target="_blank" rel="noopener" className="hover:text-white transition-colors underline decoration-slate-800 underline-offset-4">Конфиденциальность</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-8 border-t border-white/5 text-center flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">© 2011-2024 РоборНЭТ. Лицензии №163740, №163741. Услуги связи ООО "РОБОР".</p>
              <a href="https://itc34.ru" target="_blank" rel="noopener" className="text-slate-600 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-neon-lime"></span>
                 Design by ITConsulting
              </a>
            </div>
          </div>
        </footer>

        {/* Scroll Top Button */}
        <button onClick={scrollToTop} className={`fixed bottom-28 right-6 w-12 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-300 transition-all z-[190] hover:border-neon-cyan hover:text-neon-cyan shadow-xl ${scrolled ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`} aria-label="Вернуться в начало страницы">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
        </button>

        {/* Detail Modals for News and Channels */}
        {newsModalActive && selectedNews && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl" onClick={closeNews} role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[3rem] p-12 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <h2 className="text-4xl font-heading font-extrabold mb-10 dark:text-white leading-tight">{selectedNews.title}</h2>
              <div className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed whitespace-pre-wrap">{selectedNews.fullText || selectedNews.description}</div>
              <button onClick={closeNews} className="mt-12 px-12 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-heading font-extrabold uppercase tracking-widest hover:scale-105 transition-all">Закрыть</button>
            </div>
          </div>
        )}

        {isChannelsModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-2xl" onClick={() => setIsChannelsModalOpen(false)} role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-[4rem] overflow-hidden flex flex-col transition-all border border-white/5" onClick={e => e.stopPropagation()}>
               <div className="p-10 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                  <h2 className="text-3xl font-heading font-extrabold dark:text-white">{CHANNELS_DATA[selectedChannelCategory].title}</h2>
                  <button onClick={() => setIsChannelsModalOpen(false)} className="text-3xl dark:text-white" aria-label="Закрыть список каналов">&times;</button>
               </div>
               <div className="flex-1 overflow-y-auto p-12 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-8">
                  {CHANNELS_DATA[selectedChannelCategory].list.map((ch, idx) => (
                    <div key={idx} className="aspect-square bg-white dark:bg-slate-800 rounded-[2rem] flex items-center justify-center p-6 border dark:border-slate-700 hover:border-neon-cyan transition-all">
                       <img src={ch} alt={`Логотип телеканала`} className="max-w-full max-h-full object-contain filter dark:brightness-110" />
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
