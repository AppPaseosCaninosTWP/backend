import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);

const days_map: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  domingo: 7,
};

interface DayData {
  start_date: string;
  start_time: string;
  duration: number;
}

export const generate_days_for_week = (
  days_of_week: string[],
  start_time: string,
  duration: number
): DayData[] => {
  const start_date = dayjs().startOf("day");
  const end_date = start_date.add(7, "day");
  const result: DayData[] = [];

  for (let date = start_date; date.isBefore(end_date); date = date.add(1, "day")) {
    const day_number = date.isoWeekday();
    const day_name = Object.keys(days_map).find(key => days_map[key] === day_number);
    if (day_name && days_of_week.includes(day_name)) {
      result.push({
        start_date: date.format("YYYY-MM-DD"),
        start_time,
        duration,
      });
    }
  }

  return result;
};
