import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateDividerProps {
  date: Date;
}

export function DateDivider({ date }: DateDividerProps) {
  const getDateLabel = (date: Date): string => {
    if (isToday(date)) {
      return 'Hoje';
    }
    if (isYesterday(date)) {
      return 'Ontem';
    }
    return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <div className="flex items-center justify-center my-6 sticky top-0 z-10">
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm text-slate-600 dark:text-slate-300 text-[11px] font-semibold uppercase tracking-wider px-4 py-1.5 rounded-lg shadow-sm border border-slate-200/50 dark:border-slate-700/50">
        {getDateLabel(date)}
      </div>
    </div>
  );
}
