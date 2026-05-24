
import { Tariff } from './types';

export const TARIFFS: Tariff[] = [
  {
    id: '1',
    name: 'Стандарт',
    price: 699,
    speed: 40,
    tvChannels: '140+',
    type: 'apartment',
    buttonText: 'ПОДКЛЮЧИТЬ'
  },
  {
    id: '2',
    name: 'Оптимум',
    price: 799,
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
    price: 899,
    speed: 100,
    tvChannels: '140+',
    type: 'apartment',
    buttonText: 'ПОДКЛЮЧИТЬ'
  }
];
