import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { toDateKey } from '../lib/date';

export default function CalendarView({ entryKeys, selected, onSelect, month, onMonthChange }) {
  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={onSelect}
      month={month}
      onMonthChange={onMonthChange}
      modifiers={{ hasEntry: (day) => entryKeys.has(toDateKey(day)) }}
      modifiersClassNames={{ hasEntry: 'has-entry' }}
    />
  );
}