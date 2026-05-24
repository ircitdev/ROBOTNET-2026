export interface PromoModalConfig {
  enabled: boolean;
  title: string;
  badge: string;
  description: string;
  primaryButton: string;
  secondaryButton: string;
  delay: number;
}

export const PROMO_MODAL_DATA: PromoModalConfig = {
  enabled: true,
  title: 'Спецпредложение!',
  badge: 'Акция недели',
  description: 'Подключитесь до конца недели и получите месяц интернета на максимальной скорости в подарок! Наши специалисты помогут с выбором.',
  primaryButton: 'Узнать подробнее',
  secondaryButton: 'Спросить ассистента',
  delay: 15000,
};
