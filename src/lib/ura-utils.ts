import { Phone, Volume2, Hash, MessageSquare, PhoneForwarded, User, X, Circle } from "lucide-react";

export function formatDuracao(segundos: number | null): string {
  if (!segundos) return "0s";
  
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;
  
  if (horas > 0) {
    return `${horas}h ${minutos}min ${segs}s`;
  }
  if (minutos > 0) {
    return `${minutos}min ${segs}s`;
  }
  return `${segs}s`;
}

export function formatTimestamp(timestamp: string, referenciaInicio: string): string {
  try {
    const diff = new Date(timestamp).getTime() - new Date(referenciaInicio).getTime();
    const segundos = Math.floor(diff / 1000);
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`;
  } catch {
    return "00:00:00";
  }
}

export function getEventIcon(tipo: string) {
  const icons: Record<string, any> = {
    inicio: Phone,
    menu_reproduzido: Volume2,
    opcao_selecionada: Hash,
    mensagem_antes: MessageSquare,
    transferencia: PhoneForwarded,
    atendido: User,
    fim: X,
  };
  return icons[tipo] || Circle;
}

export function getStatusColor(status: string | null): string {
  const colors: Record<string, string> = {
    transferida: "bg-green-500",
    encerrada: "bg-blue-500",
    abandonada: "bg-yellow-500",
    erro: "bg-red-500",
  };
  return colors[status || ""] || "bg-gray-500";
}

export function getStatusLabel(status: string | null): string {
  const labels: Record<string, string> = {
    transferida: "Transferida",
    encerrada: "Encerrada",
    abandonada: "Abandonada",
    erro: "Erro",
  };
  return labels[status || ""] || "Desconhecido";
}
