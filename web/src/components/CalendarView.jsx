import { DayPicker } from 'react-day-picker';
import { toDateKey } from '../lib/date';

export default function CalendarView({ entryKeys, selected, onSelect, month, onMonthChange }) {
  return (
    <div className="card calendar-card">
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        month={month}
        onMonthChange={onMonthChange}
        showOutsideDays
        modifiers={{ hasEntry: (day) => entryKeys.has(toDateKey(day)) }}
        modifiersClassNames={{ hasEntry: 'has-entry' }}
      />
    </div>
  );
}
