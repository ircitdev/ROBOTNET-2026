
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
    <div className={`group bg-white/5 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border transition-all duration-500 overflow-hidden mb-4 ${
      isOpen ? 'border-neon-cyan/50 bg-slate-100/60 dark:bg-slate-900/60 shadow-[0_0_30px_rgba(0,212,255,0.1)]' : 'border-slate-200 dark:border-white/5 hover:border-neon-cyan/20'
    }`}>
      <button 
        onClick={onClick}
        className="w-full text-left p-6 flex justify-between items-center focus:outline-none"
      >
        <span className={`text-base md:text-lg font-bold transition-colors duration-300 ${isOpen ? 'text-neon-cyan' : 'text-slate-700 dark:text-white'}`}>
          {question}
        </span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 ${isOpen ? 'bg-neon-cyan/10 text-neon-cyan rotate-180' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="p-6 pt-0 text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed border-t border-slate-100 dark:border-white/5 mt-0">
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [newsModalActive, setNewsModalActive] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [visibleNewsCount, setVisibleNewsCount] = useState(3);

  const [isChannelsModalOpen, setIsChannelsModalOpen] = useState(false);
  const [selectedChannelCategory, setSelectedChannelCategory] = useState(0);
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);

  const [showPromoModal, setShowPromoModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDark]);

  useEffect(() => {
    if (isLoading) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroTextRef.current || window.innerWidth < 768) return;
      const x = (window.innerWidth / 2 - e.clientX) / 50;
      const y = (window.innerHeight / 2 - e.clientY) / 50;
      heroTextRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) {
      const PROMO_KEY = 'robornet_promo_shown';
      const lastShown = localStorage.getItem(PROMO_KEY);
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (lastShown && now - parseInt(lastShown, 10) < oneDayMs) return;
      const promoTimer = setTimeout(() => {
        setShowPromoModal(true);
        localStorage.setItem(PROMO_KEY, String(Date.now()));
      }, PROMO_MODAL_DATA.delay);
      return () => clearTimeout(promoTimer);
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const gsap = (window as any).gsap;
    const ScrollTrigger = (window as any).ScrollTrigger;
    if (!gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.set(".gsap-reveal", { opacity: 0, y: 30 });
      gsap.utils.toArray(".gsap-reveal").forEach((el: any) => {
        gsap.to(el, {
          scrollTrigger: { trigger: el, start: "top 85%" },
          y: 0, opacity: 1, duration: 1, ease: "power3.out"
        });
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
    const isLocked = newsModalActive || isChannelsModalOpen || isLoading || showPromoModal || isMobileMenuOpen;
    document.body.style.overflow = isLocked ? 'hidden' : 'auto';
  }, [newsModalActive, isChannelsModalOpen, isLoading, showPromoModal, isMobileMenuOpen]);

  const openNews = (item: NewsItem) => {
    setSelectedNews(item);
    setNewsModalActive(true);
  };

  const closeNews = () => {
    setNewsModalActive(false);
    setTimeout(() => setSelectedNews(null), 400);
  };

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
    }
  };

  const ThemeToggle = () => (
    <button 
      onClick={() => setIsDark(!isDark)}
      className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-neon-cyan hover:scale-110 transition-all shadow-lg focus:outline-none"
      title={isDark ? "Светлая тема" : "Темная тема"}
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
      )}
    </button>
  );

  return (
    <div ref={containerRef} className="bg-white dark:bg-slate-950 transition-colors duration-500 selection:bg-neon-cyan selection:text-slate-900">
      {isLoading && <Preloader onComplete={() => setIsLoading(false)} />}
      
      <div className={`min-h-screen flex flex-col font-sans transition-opacity duration-1000 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {/* Header */}
        <header className={`fixed top-0 w-full z-[100] transition-all duration-500 ${scrolled ? 'bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl py-3 border-b border-slate-200 dark:border-white/5' : 'bg-transparent py-5 border-b border-transparent'}`}>
          <div className="container mx-auto px-6 flex justify-between items-center">
            <a href="#" className="flex items-center gap-2 group">
              <svg className="w-8 h-8 text-neon-cyan group-hover:drop-shadow-[0_0_12px_#00D4FF] transition-all" viewBox="0 0 640 512" fill="currentColor">
                <path d="M634.91 154.88C457.74-8.99 182.19-8.93 5.09 154.88c-6.66 6.16-6.79 16.59-.35 22.98l34.24 33.97c6.14 6.1 16.28 6.25 22.48.51 126.96-117.63 318.66-118.49 446.71 0 6.21 5.74 16.34 5.59 22.48-.51l34.24-33.97c6.44-6.39 6.31-16.82-.35-22.98zM320 352c-35.35 0-64 28.65-64 64s28.65 64 64 64 64-28.65 64-64-28.65-64-64-64zm202.67-83.59c-111.53-103.35-293.78-103.37-405.33 0-6.26 5.8-6.43 15.91-.52 21.79l34.32 34.12c5.82 5.8 15.35 5.82 21.13.02 73.08-67.65 192.47-67.71 265.81 0 5.78 5.79 15.31 5.78 21.13-.02l34.32-34.12c5.78-5.77 5.74-15.99-.52-21.79z"/>
              </svg>
              <span className="text-2xl font-heading font-extrabold tracking-tighter text-slate-900 dark:text-white">Robor<span className="text-neon-cyan">NET</span></span>
            </a>

            <nav className="hidden lg:flex items-center gap-8 font-medium uppercase text-[10px] tracking-widest">
              {['about-network', 'tariffs', 'tv', 'news', 'documents'].map(id => (
                <a key={id} href={`#${id}`} onClick={(e) => {e.preventDefault(); scrollToSection(id);}} className="text-slate-500 dark:text-slate-400 hover:text-neon-cyan dark:hover:text-white transition-colors">
                  {id === 'about-network' ? 'О сети' : id === 'tariffs' ? 'Тарифы' : id === 'tv' ? 'ТВ' : id === 'news' ? 'Новости' : 'Документы'}
                </a>
              ))}
              
              <div className="flex items-center gap-4 ml-4">
                <ThemeToggle />
                <button onClick={() => toggleGeminiChat()} className="text-neon-cyan font-bold hover:scale-105 transition-transform flex items-center gap-1.5 px-3 py-1 bg-neon-cyan/5 rounded-lg">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-cyan"></span>
                  </span>
                  AI ПОМОЩЬ
                </button>
                <a href="http://lk.robornet.ru/" className="bg-neon-cyan text-slate-900 px-6 py-2.5 rounded-full font-bold shadow-neon-cyan hover:scale-105 active:scale-95 transition-all text-[11px] tracking-wider">ЛИЧНЫЙ КАБИНЕТ</a>
              </div>
            </nav>

            {/* Mobile Header Buttons */}
            <div className="flex items-center gap-3 lg:hidden">
              <ThemeToggle />
              <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-900 dark:text-white p-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        <div className={`fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-2xl transition-all duration-500 lg:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col h-full p-8">
            <div className="flex justify-between items-center mb-12">
               <span className="text-2xl font-heading font-extrabold tracking-tighter text-white">Robor<span className="text-neon-cyan">NET</span></span>
               <button onClick={() => setIsMobileMenuOpen(false)} className="w-12 h-12 flex items-center justify-center bg-slate-900 rounded-full text-white text-3xl">&times;</button>
            </div>
            <nav className="flex flex-col gap-6">
              {[
                { id: 'about-network', label: 'О сети' },
                { id: 'tariffs', label: 'Тарифы' },
                { id: 'tv', label: 'Телевидение' },
                { id: 'news', label: 'Новости' },
                { id: 'documents', label: 'Документы' },
                { id: 'faq', label: 'FAQ' }
              ].map(item => (
                <a 
                  key={item.id} 
                  href={`#${item.id}`} 
                  onClick={(e) => { e.preventDefault(); scrollToSection(item.id); }}
                  className="text-3xl font-heading font-extrabold text-white hover:text-neon-cyan transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <div className="h-px bg-white/10 my-4" />
              <button 
                onClick={() => { setIsMobileMenuOpen(false); toggleGeminiChat(); }}
                className="text-neon-cyan text-xl font-bold flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-neon-cyan/10 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                AI Ассистент
              </button>
              <a href="http://lk.robornet.ru/" className="bg-neon-cyan text-slate-900 p-5 rounded-2xl font-heading font-extrabold text-center uppercase tracking-widest mt-4">Личный кабинет</a>
            </nav>
            <div className="mt-auto pt-8 border-t border-white/5 space-y-4">
              <a href={`tel:${CONTACTS.phoneShort}`} className="text-xl font-heading font-bold text-white block">{CONTACTS.phoneShort}</a>
              <p className="text-slate-500 text-sm">{CONTACTS.address}</p>
            </div>
          </div>
        </div>

        {/* Hero */}
        <section id="hero" className="relative h-[100vh] flex items-center overflow-hidden">
          <ThreeHero />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-950 via-transparent pointer-events-none" />
          <div className="container mx-auto px-6 relative z-10">
            <div ref={heroTextRef} className="max-w-4xl transition-transform duration-100 ease-out">
              <h1 className="text-5xl md:text-9xl font-heading font-extrabold leading-[0.9] mb-10 text-slate-900 dark:text-white drop-shadow-2xl">Интернет <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-blue-500 dark:via-white to-neon-cyan">будущего</span></h1>
              <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-12 max-w-2xl leading-relaxed font-medium">Забудьте о задержках. Погрузитесь в мир контента на максимальной скорости с РоборНЭТ.</p>
              <button onClick={() => scrollToSection('tariffs')} className="bg-neon-cyan dark:bg-neon-lime text-white dark:text-slate-900 px-10 py-5 rounded-2xl font-bold text-lg shadow-xl hover:scale-105 transition-all active:scale-95">Выбрать тариф</button>
            </div>
          </div>
        </section>

        {/* About Network Section */}
        <section id="about-network" className="py-32 bg-white dark:bg-slate-950 scroll-mt-20">
          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-3/5 space-y-10 gsap-reveal">
                <div>
                  <span className="text-neon-cyan text-xs font-bold uppercase tracking-[0.3em] mb-4 block">Технологическое превосходство</span>
                  <h2 className="text-4xl md:text-7xl font-heading font-extrabold text-slate-900 dark:text-white mb-8 tracking-tight">О сети RoborNET</h2>
                  <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl leading-relaxed max-w-2xl">Мы построили не просто сеть, а цифровую экосистему. Собственная магистральная инфраструктура в Волгограде позволяет нам предоставлять услуги без посредников.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  {[
                    { title: "FTTB Архитектура", desc: "Оптика в каждый дом" },
                    { title: "Локальные ресурсы", desc: "Минимальный пинг" },
                    { title: "Smart Support", desc: "Умная техподдержка" },
                    { title: "IPv6 Ready", desc: "Будущее сегодня" }
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-5 group">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center text-neon-cyan group-hover:border-neon-cyan group-hover:bg-neon-cyan/10 transition-all duration-500 shadow-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-slate-800 dark:text-white text-lg font-bold tracking-wide">{feat.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:w-2/5 w-full flex justify-center lg:justify-end gsap-reveal">
                <div className="relative w-full max-w-md h-44 md:h-52 rounded-[4rem] bg-slate-50 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center group overflow-hidden shadow-2xl transition-all duration-700 hover:border-neon-cyan/30">
                   <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                   <span className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-[0.4em] mb-3">Статус сети</span>
                   <div className="flex items-center gap-5">
                      <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse shadow-[0_0_20px_#2ECC71]" />
                      <span className="text-5xl md:text-6xl font-heading font-extrabold text-green-500 drop-shadow-[0_0_25px_rgba(46,204,113,0.5)] tracking-tighter">Online</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tariffs */}
        <section id="tariffs" className="py-24 bg-slate-50 dark:bg-slate-950 scroll-mt-20">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl md:text-6xl font-heading font-extrabold mb-16 text-slate-900 dark:text-white text-center">Тарифные планы</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {TARIFFS.map((t) => (
                <article key={t.id} className={`tariff-card gsap-reveal group p-8 rounded-[2.5rem] border bg-white dark:bg-slate-900/40 backdrop-blur-md flex flex-col transition-all duration-500 hover:translate-y-[-10px] ${t.isPopular ? 'border-neon-cyan shadow-xl ring-1 ring-neon-cyan/30' : 'border-slate-200 dark:border-white/5'}`}>
                   <h3 className="text-2xl font-bold mb-4 text-slate-800 dark:text-white">{t.name}</h3>
                   <div className="mb-8"><span className="text-5xl font-extrabold text-slate-900 dark:text-white">{t.price}</span><span className="text-slate-400 ml-2 font-bold">₽/мес</span></div>
                   <div className="mb-8 space-y-3 text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      <p className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1"><span>Скорость</span> <span className="text-slate-900 dark:text-white">{t.speed} Мбит/с</span></p>
                      <p className="flex justify-between"><span>ТВ</span> <span className="text-slate-900 dark:text-white">{t.tvChannels || '—'}</span></p>
                   </div>
                   <button onClick={() => toggleGeminiChat(`Хочу подключить тариф ${t.name}`)} className={`w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${t.isPopular ? 'bg-neon-cyan text-white dark:text-slate-900 shadow-neon-cyan' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-700'}`}>ПОДКЛЮЧИТЬ</button>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* TV Section */}
        <section id="tv" className="py-32 bg-white dark:bg-slate-950 scroll-mt-20 overflow-hidden relative">
          <div className="absolute inset-0 tv-pattern pointer-events-none opacity-40" />
          <div className="container mx-auto px-6 relative z-10">
            <div className="flex flex-col lg:flex-row gap-20 items-center">
              <div className="lg:w-1/3 space-y-10 gsap-reveal">
                <div>
                  <span className="text-neon-cyan text-xs font-bold uppercase tracking-[0.3em] mb-4 block">Интерактивный контент</span>
                  <h2 className="text-4xl md:text-7xl font-heading font-extrabold text-slate-900 dark:text-white mb-6 leading-tight tracking-tight">Больше чем ТВ</h2>
                  <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl leading-relaxed">Погрузитесь в атмосферу кинотеатра у себя дома. Наше ТВ — это свобода выбора: архив за 7 дней, пауза эфира и одновременный просмотр на 5 устройствах.</p>
                </div>
                
                <div className="space-y-4 max-w-sm">
                  {['5 Устройств', '4K & HDR', '7 Дней записи'].map((feature, i) => (
                    <div key={i} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-[2rem] hover:border-neon-cyan/50 transition-all group shadow-sm dark:shadow-xl">
                      <span className="text-slate-700 dark:text-white font-extrabold text-sm uppercase tracking-widest">{feature}</span>
                      <div className="w-3 h-3 rounded-full bg-neon-cyan shadow-[0_0_15px_#00D4FF]" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full gsap-reveal">
                {CHANNELS_DATA.slice(0, 6).map((cat, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => {setSelectedChannelCategory(idx); setIsChannelsModalOpen(true);}}
                    className="group relative h-56 md:h-64 rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-white/10 hover:border-neon-cyan transition-all duration-700"
                  >
                    <div className="absolute inset-0 transition-transform duration-1000 group-hover:scale-110">
                      <img src={cat.img} alt={cat.title} className="w-full h-full object-cover brightness-[0.6] group-hover:brightness-[0.8]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                      <h4 className="text-white font-heading font-extrabold text-sm md:text-lg uppercase tracking-[0.2em] text-center drop-shadow-2xl">{cat.title}</h4>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* News */}
        <section id="news" className="py-32 bg-slate-50 dark:bg-slate-950 scroll-mt-20">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl md:text-8xl font-heading font-extrabold mb-24 text-slate-900 dark:text-white text-center leading-tight tracking-tighter">Новости и события компании</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {NEWS_DATA.slice(0, visibleNewsCount).map((item) => (
                <article key={item.id} onClick={() => openNews(item)} className="news-item-card gsap-reveal cursor-pointer bg-white dark:bg-slate-900/40 p-10 rounded-[3rem] border border-slate-200 dark:border-white/5 flex flex-col h-full hover:shadow-2xl transition-all">
                  <div className="flex justify-between items-center mb-10">
                    <span className={`${item.tagColor} text-white text-[11px] font-bold uppercase tracking-widest px-6 py-2 rounded-full shadow-lg`}>{item.tag}</span>
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-bold tracking-widest">{item.date}</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-heading font-extrabold mb-6 text-slate-800 dark:text-white leading-tight">{item.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-12 line-clamp-4">{item.description}</p>
                  <div className="mt-auto flex items-center text-neon-cyan text-[11px] font-bold uppercase tracking-[0.3em] transition-all">
                    Читать полностью
                  </div>
                </article>
              ))}
            </div>
            
            {visibleNewsCount < NEWS_DATA.length && (
              <div className="mt-20 flex justify-center">
                <button 
                  onClick={() => setVisibleNewsCount(prev => Math.min(prev + 3, NEWS_DATA.length))}
                  className="px-14 py-5 bg-transparent border border-neon-cyan text-neon-cyan rounded-full font-heading font-extrabold text-[12px] uppercase tracking-[0.4em] hover:bg-neon-cyan hover:text-white transition-all shadow-lg"
                >
                  Показать еще
                </button>
              </div>
            )}
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 bg-slate-50 dark:bg-slate-950">
          <div className="container mx-auto px-6 max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-16 text-slate-900 dark:text-white text-center">Часто задаваемые вопросы</h2>
            <div className="space-y-4">
              {FAQ.map((item, index) => (
                <FAQItem 
                  key={index}
                  question={item.question}
                  answer={item.answer}
                  isOpen={openFAQIndex === index}
                  onClick={() => setOpenFAQIndex(openFAQIndex === index ? null : index)}
                />
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
        {/* Official Section */}
        <section id="official" className="py-24 bg-white dark:bg-slate-950">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-16 text-slate-900 dark:text-white text-center tracking-tight">Контакты</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-6xl mx-auto">
               <div className="bg-slate-50 dark:bg-slate-900/50 p-12 rounded-[3.5rem] border border-slate-200 dark:border-white/5 relative overflow-hidden group">
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-10">Офис обслуживания РоборНЭТ</h3>
                  <div className="flex flex-col md:flex-row gap-10 relative z-10">
                     <div className="flex-1 space-y-8">
                        <div className="gap-5">
                           <div className="w-12 h-12 rounded-2xl bg-neon-cyan/10 flex items-center justify-center text-neon-cyan shrink-0">
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                           </div>
                           <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-bold text-lg">{CONTACTS.address}</p>
                        </div>
                        <div className="gap-5">
                           <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           </div>
                           <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-bold text-lg">{CONTACTS.workingHours} <br/> <span className="text-slate-400">{CONTACTS.workingHoursWeekend}</span></p>
                        </div>
                     </div>
                     <div className="w-full md:w-64 h-52 rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl">
                        <img src="https://storage.googleapis.com/uspeshnyy-projects/smit/robotnet.ru/simplemap.png" alt="Карта" className="w-full h-full object-cover dark:grayscale dark:opacity-80" />
                     </div>
                  </div>
               </div>

               <div className="bg-slate-50 dark:bg-slate-900/50 p-12 rounded-[3.5rem] border border-slate-200 dark:border-white/5 flex flex-col justify-center">
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-10">Юридическая информация</h3>
                  <div className="space-y-5 text-slate-500 dark:text-slate-400 font-bold text-base md:text-lg">
                     <p className="text-slate-900 dark:text-white font-extrabold mb-8 text-xl">{CONTACTS.legalName}</p>
                     <div className="flex justify-between border-b border-slate-200 dark:border-white/5 pb-3"><span>ИНН</span><span className="text-slate-900 dark:text-white">{CONTACTS.inn}</span></div>
                     <div className="flex justify-between border-b border-slate-200 dark:border-white/5 pb-3"><span>ОГРН</span><span className="text-slate-900 dark:text-white">{CONTACTS.ogrn}</span></div>
                     <div className="pt-6"><p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-3">Юридический адрес</p><p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-bold">{CONTACTS.legalAddress}</p></div>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* Official Documents - UPDATED WITH ALL 5 DOCS */}
        <section id="documents" className="py-32 bg-white dark:bg-slate-950 scroll-mt-20">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl md:text-6xl font-heading font-extrabold mb-20 text-slate-900 dark:text-white text-center">Официальные документы</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
               {[
                 { title: "Лицензия №1", desc: "Услуги связи по передаче данных", url: "https://storage.googleapis.com/uspeshnyy-projects/smit/robotnet.ru/lic1.jpg" },
                 { title: "Лицензия №2", desc: "Телематические услуги связи", url: "https://storage.googleapis.com/uspeshnyy-projects/smit/robotnet.ru/lic2.jpg" },
                 { title: "Условия договора", desc: "Договор об оказании услуг (PDF)", url: "https://storage.googleapis.com/uspeshnyy-projects/smit/robotnet.ru/%D0%94%D0%BE%D0%B3%D0%BE%D0%B2%D0%BE%D1%80_%D0%9E%D0%A3%D0%A1_%D0%A0%D0%9E%D0%91%D0%9E%D0%A0_11-2022.pdf" },
                 { title: "Согласие на ОПД", desc: "Положение об обработке ПД (PDF)", url: "https://storage.googleapis.com/uspeshnyy-projects/smit/robotnet.ru/%D0%9F%D0%9E%D0%9B%D0%9E%D0%96%D0%95%D0%9D%D0%98%D0%95_%D0%be%D0%B1_%D0%be%D0%B1%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B5_%D0%9F%D0%94.pdf" },
                 { title: "Регламент", desc: "Регламент РоборНЭТ (PDF)", url: "https://storage.googleapis.com/uspeshnyy-projects/smit/robotnet.ru/%D0%A0%D0%B5%D0%B3%D0%BB%D0%B0%D0%BC%D0%B5%D0%BD%D1%82_%D0%A0%D0%9E%D0%91%D0%9E%D0%A0.pdf" }
               ].map((doc, idx) => (
                 <a key={idx} href={doc.url} target="_blank" className="flex items-center gap-6 p-8 bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] border border-slate-200 dark:border-white/5 hover:border-neon-cyan/40 transition-all group shadow-sm dark:shadow-xl">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-neon-cyan transition-all border border-slate-100 dark:border-white/5">
                      <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-neon-cyan transition-colors">{doc.title}</h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">{doc.desc}</p>
                    </div>
                 </a>
               ))}
            </div>
          </div>
        </section>

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
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">© 2011&mdash;2026 РоборНЭТ. Лицензии №163740, №163741. Услуги связи ООО "РОБОР".</p>
              <a href="https://itc34.ru" target="_blank" rel="noopener" className="text-slate-600 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-neon-lime"></span>
                Создание ITConsulting
              </a>
            </div>
          </div>
        </footer>

        <PromoModal isOpen={showPromoModal} onClose={() => setShowPromoModal(false)} />

        {/* Modal for News */}
        {newsModalActive && selectedNews && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-3xl animate-in fade-in" onClick={closeNews}>
            <div className="bg-slate-900 w-full max-w-4xl rounded-[3.5rem] p-10 md:p-16 overflow-y-auto max-h-[90vh] relative shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
              <button onClick={closeNews} className="absolute top-6 right-6 w-14 h-14 flex items-center justify-center bg-slate-800 rounded-full text-4xl text-white hover:bg-neon-coral transition-all hover:scale-110 active:scale-90">&times;</button>
              <h2 className="text-3xl md:text-5xl font-heading font-extrabold mb-10 text-white leading-tight pr-8 tracking-tight">{selectedNews.title}</h2>
              <div className="text-slate-300 text-lg md:text-xl leading-relaxed whitespace-pre-wrap font-medium">{selectedNews.fullText || selectedNews.description}</div>
            </div>
          </div>
        )}

        {/* Modal for Channels */}
        {isChannelsModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/98 backdrop-blur-3xl animate-in fade-in" onClick={() => setIsChannelsModalOpen(false)}>
            <div className="bg-slate-900 w-full max-w-6xl h-[85vh] rounded-[4rem] overflow-hidden flex flex-col border border-white/10 relative shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="p-10 border-b border-white/10 flex justify-between items-center bg-slate-800/20 backdrop-blur-md">
                  <div>
                    <span className="text-neon-cyan text-[10px] font-extrabold uppercase tracking-[0.4em] mb-2 block">Список телеканалов</span>
                    <h2 className="text-3xl font-heading font-extrabold text-white tracking-tight">{CHANNELS_DATA[selectedChannelCategory].title}</h2>
                  </div>
                  <button onClick={() => setIsChannelsModalOpen(false)} className="w-16 h-16 flex items-center justify-center bg-slate-800 rounded-full text-4xl text-white hover:bg-neon-coral transition-all hover:scale-110">&times;</button>
               </div>
               <div className="flex-1 overflow-y-auto p-12 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-8 bg-slate-950/50 custom-scrollbar">
                  {CHANNELS_DATA[selectedChannelCategory].list.map((ch, idx) => (
                    <div key={idx} className="aspect-square bg-slate-800/40 rounded-[2.5rem] flex items-center justify-center p-8 border border-white/5 hover:border-neon-cyan/50 hover:bg-slate-800/60 transition-all shadow-lg group">
                       <img src={ch} alt="Channel" className="max-w-full max-h-full object-contain brightness-110 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}
      </div>
      <GeminiChat />
    </div>
  );
};

export default App;
