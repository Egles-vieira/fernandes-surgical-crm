import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Clock,
  Copy,
  ExternalLink,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { usePropostasLista, PropostaLista } from "@/hooks/usePropostasLista";
import { PropostaStatusBadge } from "./PropostaStatusBadge";

interface PropostasListaTableProps {
  pipelineFilter?: string | null;
  limit?: number;
  showFilters?: boolean;
  showPagination?: boolean;
  compact?: boolean;
}

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}min`;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const statusOptions = [
  { value: "all", label: "Todos os Status" },
  { value: "enviada", label: "Enviada" },
  { value: "visualizada", label: "Visualizada" },
  { value: "aceita", label: "Aceita" },
  { value: "recusada", label: "Recusada" },
  { value: "ganha", label: "Ganha" },
  { value: "perdida", label: "Perdida" },
  { value: "sem_link", label: "Sem Link" },
  { value: "expirada", label: "Expirada" },
];

export function PropostasListaTable({
  pipelineFilter,
  limit,
  showFilters = true,
  showPagination = true,
  compact = false,
}: PropostasListaTableProps) {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState("criado_em");
  const [orderDirection, setOrderDirection] = useState<"asc" | "desc">("desc");

  const pageSize = limit || 50;

  const {
    propostas,
    totalCount,
    totalPages,
    isLoading,
  } = usePropostasLista({
    pipelineFilter,
    statusFilter: statusFilter === "all" ? null : statusFilter,
    searchQuery,
    page,
    pageSize,
    orderBy,
    orderDirection,
  });

  const handleSort = (column: string) => {
    if (orderBy === column) {
      setOrderDirection(orderDirection === "asc" ? "desc" : "asc");
    } else {
      setOrderBy(column);
      setOrderDirection("desc");
    }
    setPage(1);
  };

  const handleCopyLink = async (token: string | null) => {
    if (!token) {
      toast.error("Proposta sem link público");
      return;
    }
    const url = `${window.location.origin}/proposta/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const handleOpenLink = (token: string | null) => {
    if (!token) {
      toast.error("Proposta sem link público");
      return;
    }
    window.open(`/proposta/${token}`, "_blank");
  };

  const SortButton = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium hover:bg-transparent"
      onClick={() => handleSort(column)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    </Button>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {showFilters && (
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-40" />
          </div>
        )}
        <div className="rounded-lg border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, cliente ou nome..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => {
              setStatusFilter(value === "all" ? null : value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[100px]">
                <SortButton column="codigo">Código</SortButton>
              </TableHead>
              <TableHead>
                <SortButton column="cliente_nome">Cliente</SortButton>
              </TableHead>
              {!compact && <TableHead>Vendedor</TableHead>}
              <TableHead>Pipeline</TableHead>
              <TableHead className="text-right">
                <SortButton column="valor">Valor</SortButton>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">
                <SortButton column="total_visualizacoes">Views</SortButton>
              </TableHead>
              {!compact && (
                <TableHead>
                  <SortButton column="atualizado_em">Última Atividade</SortButton>
                </TableHead>
              )}
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {propostas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={compact ? 7 : 9} className="text-center py-8 text-muted-foreground">
                  Nenhuma proposta encontrada
                </TableCell>
              </TableRow>
            ) : (
              propostas.map((proposta) => (
                <PropostaRow
                  key={proposta.id}
                  proposta={proposta}
                  compact={compact}
                  onCopyLink={handleCopyLink}
                  onOpenLink={handleOpenLink}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} de {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface PropostaRowProps {
  proposta: PropostaLista;
  compact: boolean;
  onCopyLink: (token: string | null) => void;
  onOpenLink: (token: string | null) => void;
}

function PropostaRow({ proposta, compact, onCopyLink, onOpenLink }: PropostaRowProps) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">
        {proposta.codigo || "—"}
      </TableCell>
      <TableCell>
        <div className="min-w-0">
          <p className="font-medium truncate">{proposta.cliente_nome || proposta.nome || "—"}</p>
          {proposta.cliente_cnpj && (
            <p className="text-xs text-muted-foreground">{proposta.cliente_cnpj}</p>
          )}
        </div>
      </TableCell>
      {!compact && (
        <TableCell>
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={proposta.vendedor_avatar || undefined} />
              <AvatarFallback className="text-[10px]">
                {getInitials(proposta.vendedor_nome)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate max-w-[100px]">
              {proposta.vendedor_nome || "—"}
            </span>
          </div>
        </TableCell>
      )}
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <Badge
            variant="outline"
            className="w-fit text-xs"
            style={{
              borderColor: proposta.pipeline_cor || undefined,
              backgroundColor: proposta.pipeline_cor ? `${proposta.pipeline_cor}15` : undefined,
            }}
          >
            {proposta.pipeline_nome || "—"}
          </Badge>
          {proposta.nome_estagio && (
            <span
              className="text-[10px]"
              style={{ color: proposta.estagio_cor || undefined }}
            >
              {proposta.nome_estagio}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(proposta.valor)}
      </TableCell>
      <TableCell>
        <PropostaStatusBadge status={proposta.status_proposta} />
      </TableCell>
      <TableCell>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center gap-1 text-sm">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{proposta.total_visualizacoes}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p>{proposta.visualizacoes_unicas} visualizações únicas</p>
              {proposta.tempo_total_segundos > 0 && (
                <p className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Tempo total: {formatTime(proposta.tempo_total_segundos)}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TableCell>
      {!compact && (
        <TableCell className="text-sm text-muted-foreground">
          {proposta.atualizado_em
            ? formatDistanceToNow(new Date(proposta.atualizado_em), {
                addSuffix: true,
                locale: ptBR,
              })
            : "—"}
        </TableCell>
      )}
      <TableCell>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onCopyLink(proposta.public_token)}
                disabled={!proposta.public_token}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copiar link</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onOpenLink(proposta.public_token)}
                disabled={!proposta.public_token}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Abrir proposta</TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}
