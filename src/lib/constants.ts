import { RecurrenceInterval } from './types';

export const recurrenceIntervalMonths: Record<Exclude<RecurrenceInterval, 'weekly' | 'none' | 'bi-weekly'>, number> = {
  monthly: 1,
  bimonthly: 2,
  '3months': 3,
  '6months': 6,
  '12months': 12,
};
