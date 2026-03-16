import { parseISO, addHours } from 'date-fns';

export const getUTC8Date = (dateStr: string) => {
  const date = parseISO(dateStr);
  const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
  return addHours(utcDate, 8);
};

export const translateName = (name: string) => {
  if (!name) return '';
  return name
    .replace(/早上/g, 'Morning')
    .replace(/中午/g, 'Noon')
    .replace(/下午/g, 'Afternoon')
    .replace(/晚上/g, 'Evening');
};
