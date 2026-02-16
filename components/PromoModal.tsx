
import React from 'react';
import { PROMO_MODAL_DATA } from '../constants/promoData';
import { toggleGeminiChat } from './GeminiChat';

interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PromoModal: React.FC<PromoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 relative shadow-2xl border border-neon-cyan/20 animate-in zoom-in-95 duration-500">
        {/* Mobile-Friendly High-Contrast Close Button with Hover Scaling */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-4xl dark:text-white hover:bg-neon-coral hover:text-white transition-all shadow-xl hover:scale-110 active:scale-90 z-[2100] cursor-pointer"
          aria-label="Закрыть"
        >
          &times;
        </button>
        
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-neon-cyan/10 rounded-3xl flex items-center justify-center mb-6 sm:mb-8 mx-auto mt-4 sm:mt-0">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        
        <div className="text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-neon-lime/10 text-neon-lime text-[10px] font-bold uppercase tracking-widest mb-4">
            {PROMO_MODAL_DATA.badge}
          </span>
          <h3 className="text-2xl sm:text-3xl font-heading font-extrabold mb-4 dark:text-white leading-tight">
            {PROMO_MODAL_DATA.title}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-8 sm:mb-10 text-sm sm:text-base leading-relaxed">
            {PROMO_MODAL_DATA.description}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-neon-cyan text-slate-900 rounded-2xl font-heading font-extrabold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-neon-cyan"
          >
            {PROMO_MODAL_DATA.primaryButton}
          </button>
          <button 
            onClick={() => { onClose(); toggleGeminiChat(); }}
            className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-heading font-extrabold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            {PROMO_MODAL_DATA.secondaryButton}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoModal;
