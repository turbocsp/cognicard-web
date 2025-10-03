interface CardSrsData {
  srs_repetition: number;
  srs_ease_factor: number;
  srs_interval_minutes: number;
}

interface SrsSettings {
  lapse_interval_minutes: number;
  initial_step_1_minutes: number;
  initial_step_2_minutes: number;
  easy_bonus_multiplier: number;
}

// A função agora recebe as configurações do usuário para fazer o cálculo
export const calculateNextIntervals = (
  card: CardSrsData,
  settings: SrsSettings
) => {
  const intervals: { [key: number]: number } = {};

  for (const quality of [0, 3, 4, 5]) {
    let newEaseFactor =
      card.srs_ease_factor +
      (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newEaseFactor < 1.3) newEaseFactor = 1.3;

    let newRepetition = card.srs_repetition + 1;
    let newInterval;

    if (quality < 3) {
      newRepetition = 0;
      newInterval = settings.lapse_interval_minutes;
    } else {
      if (newRepetition === 1) {
        newInterval = settings.initial_step_1_minutes;
      } else if (newRepetition === 2) {
        newInterval = settings.initial_step_2_minutes;
      } else {
        newInterval = Math.ceil(
          card.srs_interval_minutes * card.srs_ease_factor
        );
      }
      // Aplica o bônus de "Fácil"
      if (quality === 5) {
        newInterval = Math.ceil(newInterval * settings.easy_bonus_multiplier);
      }
    }
    intervals[quality] = newInterval;
  }
  return intervals;
};

// A função de formatação agora é muito mais inteligente
export const formatInterval = (minutes: number): string => {
  if (minutes < 1) return "< 1m";
  if (minutes < 60) return `${minutes}m`;

  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h`;

  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d`;

  const months = days / 30;
  if (months < 12) return `${Math.round(months)}mo`;

  const years = days / 365;
  return `${Math.round(years)}a`;
};
