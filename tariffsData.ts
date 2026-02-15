
import { Tariff } from './types';

export const TARIFFS: Tariff[] = [
  { 
    id: '1', 
    name: 'Стандарт', 
    price: 599, 
    speed: 40, 
    tvChannels: '140+', 
    type: 'apartment',
    buttonText: 'ПОДКЛЮЧИТЬ'
  },
  { 
    id: '2', 
    name: 'Оптимум', 
    price: 699, 
    speed: 60, 
    tvChannels: '140+', 
    isPopular: true, 
    type: 'apartment', 
    features: ['Бесплатное подключение'],
    buttonText: 'ПОДКЛЮЧИТЬ СЕЙЧАС'
  },
  { 
    id: '3', 
    name: 'Абсолют', 
    price: 799, 
    speed: 100, 
    tvChannels: '140+', 
    type: 'apartment',
    buttonText: 'ПОДКЛЮЧИТЬ'
  },
  { 
    id: '4', 
    name: 'WiFi Старт', 
    price: 650, 
    speed: 5, 
    nightSpeed: 20, 
    isWireless: true, 
    type: 'house',
    buttonText: 'ПОДРОБНЕЕ'
  }
];
