import { useState } from "react";
import { Search, Plus, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Grid3x3, List, Upload, Download, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProdutos } from "@/hooks/useProdutos";
import { Tables } from "@/integrations/supabase/types";

type Produto = Tables<"produtos">;
type ViewMode = "grid" | "list";

export default function Produtos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { produtos, isLoading } = useProdutos();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const filteredProdutos = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.referencia_interna.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.narrativa && p.narrativa.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredProdutos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedProdutos = filteredProdutos.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleExportToExcel = () => {
    // Prepare data for export
    const exportData = produtos.map(p => ({
      'Referência Interna': p.referencia_interna,
      'Nome': p.nome,
      'Unidade Medida': p.unidade_medida,
      'NCM': p.ncm,
      'Preço Venda': p.preco_venda,
      'Custo': p.custo,
      'Quantidade em Mãos': p.quantidade_em_maos,
      'Estoque Mínimo (DTR)': p.dtr,
      'Marcadores': p.marcadores_produto ? p.marcadores_produto.join(', ') : '',
      'Narrativa': p.narrativa || '',
      'Cód. Trib. ICMS': p.cod_trib_icms,
      'Alíquota IPI': p.aliquota_ipi,
      'Qtd CR': p.qtd_cr,
      'ICMS SP %': p.icms_sp_percent,
      'Grupo Estoque': p.grupo_estoque,
      'Quantidade Prevista': p.quantidade_prevista,
      'Lote Múltiplo': p.lote_multiplo,
      'Responsável': p.responsavel || '',
      'Previsão Chegada': p.previsao_chegada || '',
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const columnWidths = [
      { wch: 20 }, // Referência Interna
      { wch: 40 }, // Nome
      { wch: 15 }, // Unidade Medida
      { wch: 12 }, // NCM
      { wch: 15 }, // Preço Venda
      { wch: 15 }, // Custo
      { wch: 18 }, // Quantidade em Mãos
      { wch: 20 }, // Estoque Mínimo
      { wch: 30 }, // Marcadores
      { wch: 50 }, // Narrativa
      { wch: 18 }, // Cód. Trib. ICMS
      { wch: 15 }, // Alíquota IPI
      { wch: 10 }, // Qtd CR
      { wch: 12 }, // ICMS SP %
      { wch: 15 }, // Grupo Estoque
      { wch: 20 }, // Quantidade Prevista
      { wch: 15 }, // Lote Múltiplo
      { wch: 20 }, // Responsável
      { wch: 18 }, // Previsão Chegada
    ];
    ws['!cols'] = columnWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');

    // Generate file name with current date
    const date = new Date().toISOString().split('T')[0];
    const fileName = `produtos_${date}.xlsx`;

    // Download file
    XLSX.writeFile(wb, fileName);
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      // Check for product references in multiple tables
      const [
        { data: vendasItens, error: vendasError },
        { data: ediCotacoesItens, error: ediCotacoesError },
        { data: ediVinculos, error: ediVinculosError }
      ] = await Promise.all([
        supabase.from('vendas_itens').select('produto_id'),
        supabase.from('edi_cotacoes_itens').select('produto_id'),
        supabase.from('edi_produtos_vinculo').select('produto_id')
      ]);

      if (vendasError) throw vendasError;
      if (ediCotacoesError) throw ediCotacoesError;
      if (ediVinculosError) throw ediVinculosError;

      // Combine all referenced product IDs
      const produtosReferenciadosIds = new Set<string>();
      
      vendasItens?.forEach(item => {
        if (item.produto_id) produtosReferenciadosIds.add(item.produto_id);
      });
      
      ediCotacoesItens?.forEach(item => {
        if (item.produto_id) produtosReferenciadosIds.add(item.produto_id);
      });
      
      ediVinculos?.forEach(item => {
        if (item.produto_id) produtosReferenciadosIds.add(item.produto_id);
      });

      const produtosSemReferencia = produtos.filter(
        p => !produtosReferenciadosIds.has(p.id)
      );

      if (produtosSemReferencia.length === 0) {
        toast({
          title: "Não é possível excluir",
          description: "Todos os produtos estão sendo usados em vendas ou portais EDI. Remova as referências primeiro.",
          variant: "destructive",
        });
        setShowDeleteDialog(false);
        setIsDeleting(false);
        return;
      }

      // Delete only products without references
      const { error } = await supabase
        .from('produtos')
        .delete()
        .in('id', produtosSemReferencia.map(p => p.id));

      if (error) throw error;

      const produtosNaoExcluidos = produtos.length - produtosSemReferencia.length;

      toast({
        title: "Produtos excluídos",
        description: produtosNaoExcluidos > 0
          ? `${produtosSemReferencia.length} produtos excluídos. ${produtosNaoExcluidos} produtos não foram excluídos pois estão em uso (vendas ou portais EDI).`
          : `${produtosSemReferencia.length} produtos foram excluídos com sucesso.`,
        variant: produtosNaoExcluidos > 0 ? "default" : "default",
      });

      setShowDeleteDialog(false);
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir produtos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Produtos</h1>
          <p className="text-muted-foreground">
            {filteredProdutos.length > 0 ? (
              <>Mostrando {startIndex + 1}-{Math.min(endIndex, filteredProdutos.length)} de {filteredProdutos.length} produtos</>
            ) : (
              <>Nenhum produto encontrado</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={handleExportToExcel}
            disabled={produtos.length === 0}
          >
            <Download size={16} className="mr-2" />
            Exportar Excel
          </Button>
          <Button onClick={() => navigate('/importar-produtos')}>
            <Upload size={16} className="mr-2" />
            Importar Produtos
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => setShowDeleteDialog(true)}
            disabled={produtos.length === 0}
          >
            <Trash2 size={16} className="mr-2" />
            Excluir Todos
          </Button>
          <div className="flex items-center gap-2 border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 p-0"
            >
              <Grid3x3 size={16} />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 p-0"
            >
              <List size={16} />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Itens:</span>
            <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="36">36</SelectItem>
                <SelectItem value="48">48</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <Input
          placeholder="Buscar por nome, código ou descrição..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-10"
        />
      </div>

      {/* Grid */}
      {filteredProdutos.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="text-muted-foreground" size={40} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
          <p className="text-muted-foreground mb-6">
            {produtos.length === 0
              ? "Importe seus produtos para começar"
              : "Tente ajustar os filtros de busca"}
          </p>
          {produtos.length === 0 && (
            <Button onClick={() => window.location.href = '/importar-produtos'}>
              <Plus size={16} className="mr-2" />
              Importar Produtos
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
              {displayedProdutos.map((produto) => (
                <Card key={produto.id} className="p-6 shadow-elegant hover:shadow-lg transition-all hover-scale">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-sm leading-tight pr-2">{produto.nome}</h3>
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20 flex-shrink-0">
                          {produto.referencia_interna}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {produto.marcadores_produto && produto.marcadores_produto.map((marcador, idx) => (
                          <Badge key={idx} className="text-xs bg-secondary/10 text-secondary border-secondary/20">
                            {marcador}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">NCM:</span>
                        <span className="font-mono text-xs">{produto.ncm}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Unidade:</span>
                        <span className="font-medium">{produto.unidade_medida}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Preço Venda:</span>
                        <span className="font-bold text-success">{formatCurrency(produto.preco_venda)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Preço Custo:</span>
                        <span className="font-medium">{formatCurrency(produto.custo)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Estoque:</span>
                        <span
                          className={`font-semibold ${
                            produto.quantidade_em_maos <= produto.dtr
                              ? "text-destructive"
                              : "text-foreground"
                          }`}
                        >
                          {produto.quantidade_em_maos} {produto.unidade_medida}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedProduto(produto);
                          setShowDetails(true);
                        }}
                      >
                        <Eye size={14} className="mr-1" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* List View - Table Format */}
          {viewMode === "list" && (
            <Card className="animate-fade-in">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Nome do Produto</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Marcadores</TableHead>
                    <TableHead className="text-right">Preço Venda</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Previsto</TableHead>
                    <TableHead className="text-center">Unidade</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedProdutos.map((produto) => (
                    <TableRow key={produto.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{produto.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          {produto.referencia_interna}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {produto.marcadores_produto && produto.marcadores_produto.slice(0, 2).map((marcador, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {marcador}
                            </Badge>
                          ))}
                          {produto.marcadores_produto && produto.marcadores_produto.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{produto.marcadores_produto.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-success">
                        {formatCurrency(produto.preco_venda)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(produto.custo)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-semibold ${
                            produto.quantidade_em_maos <= produto.dtr
                              ? "text-destructive"
                              : "text-foreground"
                          }`}
                        >
                          {produto.quantidade_em_maos}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {produto.quantidade_prevista}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{produto.unidade_medida}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProduto(produto);
                            setShowDetails(true);
                          }}
                        >
                          <Eye size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Professional Pagination */}
          {totalPages > 1 && (
            <Card className="p-4 shadow-elegant">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft size={16} />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} />
                  </Button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, idx) => (
                      page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
                      ) : (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page as number)}
                          className="min-w-[40px]"
                        >
                          {page}
                        </Button>
                      )
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight size={16} />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight size={16} />
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  {filteredProdutos.length} produtos no total
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Produto</DialogTitle>
          </DialogHeader>
          {selectedProduto && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-2">{selectedProduto.nome}</h3>
                <Badge className="bg-success/10 text-success border-success/20">
                  {selectedProduto.referencia_interna}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">NCM</p>
                  <p className="font-mono text-sm">{selectedProduto.ncm}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unidade</p>
                  <p className="font-medium">{selectedProduto.unidade_medida}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Preço Venda</p>
                  <p className="font-bold text-success">{formatCurrency(selectedProduto.preco_venda)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Custo</p>
                  <p className="font-medium">{formatCurrency(selectedProduto.custo)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estoque Atual</p>
                  <p className="font-semibold">{selectedProduto.quantidade_em_maos} {selectedProduto.unidade_medida}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">DTR (Dias de Reposição)</p>
                  <p className="font-medium">{selectedProduto.dtr}</p>
                </div>
              </div>

              {selectedProduto.marcadores_produto && selectedProduto.marcadores_produto.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Marcadores</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduto.marcadores_produto.map((marcador, idx) => (
                      <Badge key={idx} variant="outline">{marcador}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduto.narrativa && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Descrição</p>
                  <p className="text-sm">{selectedProduto.narrativa}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão de Produtos</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Isso irá excluir permanentemente os produtos que <strong>não estão sendo usados em vendas</strong>.
              </p>
              <p>
                <span className="font-bold text-destructive">{produtos.length} produtos</span> no total.
              </p>
              <p className="text-xs text-muted-foreground">
                Produtos que estão em vendas não serão excluídos para manter a integridade dos dados.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAll();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
