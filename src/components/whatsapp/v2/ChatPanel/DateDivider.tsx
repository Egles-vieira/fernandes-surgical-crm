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
    <div className="flex items-center justify-center my-4">
      <div className="bg-muted/80 text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
        {getDateLabel(date)}
      </div>
    </div>
  );
}
