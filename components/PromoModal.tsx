
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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] p-10 relative shadow-2xl border border-neon-cyan/20 animate-in zoom-in-95 duration-500">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-xl dark:text-white hover:bg-neon-coral hover:text-white transition-all"
        >
          &times;
        </button>
        
        <div className="w-20 h-20 bg-neon-cyan/10 rounded-3xl flex items-center justify-center mb-8 mx-auto">
          <svg className="w-10 h-10 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        
        <div className="text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-neon-lime/10 text-neon-lime text-[10px] font-bold uppercase tracking-widest mb-4">
            {PROMO_MODAL_DATA.badge}
          </span>
          <h3 className="text-3xl font-heading font-extrabold mb-4 dark:text-white">
            {PROMO_MODAL_DATA.title}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
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
