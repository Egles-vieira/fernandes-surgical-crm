import { useState } from "react";
import { Search, Plus, Edit, Eye, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface Produto {
  id: string;
  codigo: string;
  nome: string;
  unidade: string;
  grupo: string;
  familia: string;
  fabricante: string;
  registroAnvisa: string;
  ncm: string;
  marca: string;
  procedencia: string;
  familiaGlobal: string;
  precoVenda: number;
  precoCusto: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  podeSerVendido: boolean;
  podeSerComprado: boolean;
  ativo: boolean;
  faturavel: boolean;
  promocao: boolean;
  descontinuado: boolean;
  descricao: string;
}

const produtosMock: Produto[] = [
  {
    id: "1",
    codigo: "ABA001",
    nome: "ABAIXA LINGUA MADEIRA C/100 UNIDADES",
    unidade: "CX",
    grupo: "Descartáveis",
    familia: "Instrumental",
    fabricante: "MED PLUS",
    registroAnvisa: "80149500001",
    ncm: "9018.90.99",
    marca: "Med Plus",
    procedencia: "Nacional",
    familiaGlobal: "Descartáveis Médicos",
    precoVenda: 8.50,
    precoCusto: 5.20,
    estoqueAtual: 150,
    estoqueMinimo: 50,
    podeSerVendido: true,
    podeSerComprado: true,
    ativo: true,
    faturavel: true,
    promocao: false,
    descontinuado: false,
    descricao: "Abaixa língua de madeira, descartável, embalagem com 100 unidades"
  },
  {
    id: "2",
    codigo: "LUV001",
    nome: "LUVA PROCEDIMENTO LATEX TAM M C/100",
    unidade: "CX",
    grupo: "EPI",
    familia: "Proteção",
    fabricante: "SUPERMAX",
    registroAnvisa: "10305410001",
    ncm: "4015.19.00",
    marca: "Supermax",
    procedencia: "Importado",
    familiaGlobal: "EPIs",
    precoVenda: 35.90,
    precoCusto: 22.50,
    estoqueAtual: 15,
    estoqueMinimo: 30,
    podeSerVendido: true,
    podeSerComprado: true,
    ativo: true,
    faturavel: true,
    promocao: true,
    descontinuado: false,
    descricao: "Luva de látex para procedimentos, tamanho M, não estéril, caixa com 100 unidades"
  },
  {
    id: "3",
    codigo: "BIS001",
    nome: "BISTURI DESCARTAVEL N°15 ESTERIL",
    unidade: "UN",
    grupo: "Instrumental",
    familia: "Corte",
    fabricante: "SOLIDOR",
    registroAnvisa: "10310590001",
    ncm: "9018.90.95",
    marca: "Solidor",
    procedencia: "Nacional",
    familiaGlobal: "Instrumental Cirúrgico",
    precoVenda: 2.80,
    precoCusto: 1.65,
    estoqueAtual: 300,
    estoqueMinimo: 100,
    podeSerVendido: true,
    podeSerComprado: true,
    ativo: true,
    faturavel: true,
    promocao: false,
    descontinuado: false,
    descricao: "Bisturi descartável nº 15, lâmina em aço inox, estéril, uso único"
  },
  {
    id: "4",
    codigo: "SER001",
    nome: "SERINGA DESCARTAVEL 10ML S/AGULHA",
    unidade: "UN",
    grupo: "Descartáveis",
    familia: "Injetáveis",
    fabricante: "BD",
    registroAnvisa: "80149500010",
    ncm: "9018.31.10",
    marca: "BD Plastipak",
    procedencia: "Importado",
    familiaGlobal: "Material de Injeção",
    precoVenda: 0.95,
    precoCusto: 0.58,
    estoqueAtual: 5000,
    estoqueMinimo: 1000,
    podeSerVendido: true,
    podeSerComprado: true,
    ativo: true,
    faturavel: true,
    promocao: false,
    descontinuado: false,
    descricao: "Seringa descartável 10ml, estéril, sem agulha, graduada"
  },
  {
    id: "5",
    codigo: "CAT001",
    nome: "CATETER IV PERISEG/AG 22GX25MM",
    unidade: "PC",
    grupo: "Acesso Vascular",
    familia: "Cateteres",
    fabricante: "BD",
    registroAnvisa: "10310590025",
    ncm: "9018.39.99",
    marca: "BD Insyte",
    procedencia: "Importado",
    familiaGlobal: "Dispositivos Vasculares",
    precoVenda: 7.30,
    precoCusto: 4.65,
    estoqueAtual: 200,
    estoqueMinimo: 80,
    podeSerVendido: true,
    podeSerComprado: true,
    ativo: true,
    faturavel: true,
    promocao: false,
    descontinuado: false,
    descricao: "Cateter intravenoso periférico com segurança, calibre 22G x 25mm, estéril"
  },
  {
    id: "6",
    codigo: "MAS001",
    nome: "MASCARA CIRURGICA TRIPLA C/ELASTICO",
    unidade: "CX",
    grupo: "EPI",
    familia: "Proteção Respiratória",
    fabricante: "CREMER",
    registroAnvisa: "80149500030",
    ncm: "6307.90.10",
    marca: "Cremer",
    procedencia: "Nacional",
    familiaGlobal: "EPIs",
    precoVenda: 42.00,
    precoCusto: 28.50,
    estoqueAtual: 80,
    estoqueMinimo: 40,
    podeSerVendido: true,
    podeSerComprado: true,
    ativo: true,
    faturavel: true,
    promocao: false,
    descontinuado: false,
    descricao: "Máscara cirúrgica tripla camada com elástico, caixa com 50 unidades"
  },
  {
    id: "7",
    codigo: "SON001",
    nome: "SONDA URETRAL N°12 ESTERIL",
    unidade: "UN",
    grupo: "Sondas",
    familia: "Sondagem",
    fabricante: "MARK MED",
    registroAnvisa: "10305410020",
    ncm: "9018.39.95",
    marca: "Mark Med",
    procedencia: "Nacional",
    familiaGlobal: "Dispositivos de Sondagem",
    precoVenda: 3.80,
    precoCusto: 2.20,
    estoqueAtual: 120,
    estoqueMinimo: 50,
    podeSerVendido: true,
    podeSerComprado: true,
    ativo: true,
    faturavel: true,
    promocao: false,
    descontinuado: false,
    descricao: "Sonda uretral nº 12, PVC atóxico, estéril, uso único"
  },
  {
    id: "8",
    codigo: "GAZ001",
    nome: "GAZE ESTERIL 11 FIOS 7,5X7,5CM",
    unidade: "PCT",
    grupo: "Curativos",
    familia: "Compressas",
    fabricante: "CREMER",
    registroAnvisa: "80149500040",
    ncm: "3005.90.10",
    marca: "Cremer",
    procedencia: "Nacional",
    familiaGlobal: "Material de Curativo",
    precoVenda: 1.20,
    precoCusto: 0.75,
    estoqueAtual: 800,
    estoqueMinimo: 200,
    podeSerVendido: true,
    podeSerComprado: true,
    ativo: true,
    faturavel: true,
    promocao: false,
    descontinuado: false,
    descricao: "Gaze estéril 11 fios, 7,5 x 7,5cm, pacote com 10 unidades"
  },
  {
    id: "9",
    codigo: "PIN001",
    nome: "PINCA KELLY CURVA 14CM INOX",
    unidade: "UN",
    grupo: "Instrumental",
    familia: "Pinças",
    fabricante: "ABC INSTRUMENTS",
    registroAnvisa: "10310590050",
    ncm: "9018.90.50",
    marca: "ABC",
    procedencia: "Nacional",
    familiaGlobal: "Instrumental Cirúrgico",
    precoVenda: 85.00,
    precoCusto: 52.00,
    estoqueAtual: 25,
    estoqueMinimo: 10,
    podeSerVendido: true,
    podeSerComprado: true,
    ativo: true,
    faturavel: true,
    promocao: false,
    descontinuado: false,
    descricao: "Pinça Kelly curva, 14cm, aço inox cirúrgico, autoclavável"
  },
  {
    id: "10",
    codigo: "EQU001",
    nome: "EQUIPO MACROGOTAS ESTERIL",
    unidade: "UN",
    grupo: "Infusão",
    familia: "Equipos",
    fabricante: "SANOBIOL",
    registroAnvisa: "10310590060",
    ncm: "9018.39.30",
    marca: "Sanobiol",
    procedencia: "Nacional",
    familiaGlobal: "Sistemas de Infusão",
    precoVenda: 4.50,
    precoCusto: 2.80,
    estoqueAtual: 450,
    estoqueMinimo: 150,
    podeSerVendido: true,
    podeSerComprado: true,
    ativo: true,
    faturavel: true,
    promocao: false,
    descontinuado: false,
    descricao: "Equipo para macrogotas, estéril, atóxico, uso único"
  },
  {
    id: "11",
    codigo: "NG035",
    nome: "CAMPO CIRURGICO 60X50 CM PHARMAPLUS",
    unidade: "PC",
    grupo: "Campos",
    familia: "Campos Cirúrgicos",
    fabricante: "PHARMAPLUS",
    registroAnvisa: "10149500070",
    ncm: "3005.90.99",
    marca: "PharmaPlusT",
    procedencia: "Nacional",
    familiaGlobal: "Material Cirúrgico",
    precoVenda: 14.50,
    precoCusto: 9.20,
    estoqueAtual: 100,
    estoqueMinimo: 40,
    podeSerVendido: true,
    podeSerComprado: true,
    ativo: true,
    faturavel: true,
    promocao: false,
    descontinuado: false,
    descricao: "Campo cirúrgico descartável, 60x50cm, estéril, SMS"
  },
];

export default function Produtos() {
  const [produtos] = useState<Produto[]>(produtosMock);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Produto>>({});
  const [isEditing, setIsEditing] = useState(false);

  const filteredProdutos = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.fabricante.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.registroAnvisa.includes(searchTerm)
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const openForm = (produto?: Produto) => {
    if (produto) {
      setFormData(produto);
      setIsEditing(true);
    } else {
      setFormData({
        podeSerVendido: true,
        podeSerComprado: true,
        ativo: true,
        faturavel: true,
        promocao: false,
        descontinuado: false,
      });
      setIsEditing(false);
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData({});
    setIsEditing(false);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Produtos</h1>
          <p className="text-muted-foreground">Gerencie seu catálogo de produtos</p>
        </div>
        <Button onClick={() => openForm()} className="bg-primary hover:bg-primary/90">
          <Plus size={16} className="mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <Input
          placeholder="Buscar por nome, código, fabricante ou ANVISA..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProdutos.map((produto) => (
          <Card key={produto.id} className="p-6 shadow-elegant hover:shadow-lg transition-all">
            <div className="space-y-4">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm leading-tight pr-2">{produto.nome}</h3>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20 flex-shrink-0">
                    {produto.codigo}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {produto.ativo && (
                    <Badge className="text-xs bg-success/10 text-success border-success/20">Ativo</Badge>
                  )}
                  {produto.promocao && (
                    <Badge className="text-xs bg-secondary/10 text-secondary border-secondary/20">Promoção</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fabricante:</span>
                  <span className="font-medium">{produto.fabricante}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ANVISA:</span>
                  <span className="font-mono text-xs">{produto.registroAnvisa}</span>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Preço Venda:</span>
                  <span className="font-bold text-success">{formatCurrency(produto.precoVenda)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Preço Custo:</span>
                  <span className="font-medium">{formatCurrency(produto.precoCusto)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estoque:</span>
                  <span
                    className={`font-semibold ${
                      produto.estoqueAtual <= produto.estoqueMinimo
                        ? "text-destructive"
                        : "text-foreground"
                    }`}
                  >
                    {produto.estoqueAtual} {produto.unidade}
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
                  Ver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openForm(produto)}
                >
                  <Edit size={14} className="mr-1" />
                  Editar
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Produto</DialogTitle>
          </DialogHeader>
          {selectedProduto && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {selectedProduto.ativo && <Badge className="bg-success">Ativo</Badge>}
                {selectedProduto.promocao && <Badge className="bg-secondary">Promoção</Badge>}
                {selectedProduto.faturavel && <Badge variant="outline">Faturável</Badge>}
                {selectedProduto.podeSerVendido && <Badge variant="outline">Pode Vender</Badge>}
                {selectedProduto.podeSerComprado && <Badge variant="outline">Pode Comprar</Badge>}
                {selectedProduto.descontinuado && <Badge variant="destructive">Descontinuado</Badge>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Código</Label>
                  <p className="font-semibold text-success">{selectedProduto.codigo}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Unidade</Label>
                  <p className="font-medium">{selectedProduto.unidade}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <p className="font-medium">{selectedProduto.nome}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Grupo</Label>
                  <p>{selectedProduto.grupo}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Família</Label>
                  <p>{selectedProduto.familia}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fabricante</Label>
                  <p>{selectedProduto.fabricante}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Registro ANVISA</Label>
                  <p className="font-mono text-sm">{selectedProduto.registroAnvisa}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">NCM</Label>
                  <p>{selectedProduto.ncm}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3">Marca e Procedência</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Marca</Label>
                    <p>{selectedProduto.marca}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Procedência</Label>
                    <p>{selectedProduto.procedencia}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Família Global</Label>
                    <p>{selectedProduto.familiaGlobal}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                <Card className="p-4 bg-success/5">
                  <p className="text-xs text-muted-foreground mb-1">Preço Venda</p>
                  <p className="text-lg font-bold text-success">
                    {formatCurrency(selectedProduto.precoVenda)}
                  </p>
                </Card>
                <Card className="p-4 bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Preço Custo</p>
                  <p className="text-lg font-bold">{formatCurrency(selectedProduto.precoCusto)}</p>
                </Card>
                <Card className="p-4 bg-primary/5">
                  <p className="text-xs text-muted-foreground mb-1">Estoque Atual</p>
                  <p className="text-lg font-bold text-primary">
                    {selectedProduto.estoqueAtual} {selectedProduto.unidade}
                  </p>
                </Card>
                <Card className="p-4 bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Estoque Mínimo</p>
                  <p className="text-lg font-bold">
                    {selectedProduto.estoqueMinimo} {selectedProduto.unidade}
                  </p>
                </Card>
              </div>

              {selectedProduto.descricao && (
                <div className="pt-4 border-t">
                  <Label className="text-xs text-muted-foreground">Descrição</Label>
                  <p className="mt-1">{selectedProduto.descricao}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">Informações Básicas</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Código *</Label>
                  <Input
                    value={formData.codigo || ""}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Nome do Produto *</Label>
                  <Input
                    value={formData.nome || ""}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Unidade *</Label>
                  <Input
                    value={formData.unidade || ""}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Grupo</Label>
                  <Input
                    value={formData.grupo || ""}
                    onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Família</Label>
                  <Input
                    value={formData.familia || ""}
                    onChange={(e) => setFormData({ ...formData, familia: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Fabricante *</Label>
                  <Input
                    value={formData.fabricante || ""}
                    onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Registro ANVISA</Label>
                  <Input
                    value={formData.registroAnvisa || ""}
                    onChange={(e) => setFormData({ ...formData, registroAnvisa: e.target.value })}
                  />
                </div>
                <div>
                  <Label>NCM</Label>
                  <Input
                    value={formData.ncm || ""}
                    onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Marca e Procedência */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-primary">Marca e Procedência</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Marca Comercial</Label>
                  <Input
                    value={formData.marca || ""}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Procedência</Label>
                  <Input
                    value={formData.procedencia || ""}
                    onChange={(e) => setFormData({ ...formData, procedencia: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Família Global</Label>
                  <Input
                    value={formData.familiaGlobal || ""}
                    onChange={(e) => setFormData({ ...formData, familiaGlobal: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Preços e Estoque */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-primary">Preços e Estoque</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Preço Venda *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.precoVenda || ""}
                    onChange={(e) => setFormData({ ...formData, precoVenda: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Preço Custo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.precoCusto || ""}
                    onChange={(e) => setFormData({ ...formData, precoCusto: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Estoque Atual</Label>
                  <Input
                    type="number"
                    value={formData.estoqueAtual || ""}
                    onChange={(e) => setFormData({ ...formData, estoqueAtual: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Estoque Mínimo</Label>
                  <Input
                    type="number"
                    value={formData.estoqueMinimo || ""}
                    onChange={(e) => setFormData({ ...formData, estoqueMinimo: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Status do Produto */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-primary">Status do Produto</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="podeSerVendido"
                    checked={formData.podeSerVendido}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, podeSerVendido: checked as boolean })
                    }
                  />
                  <Label htmlFor="podeSerVendido" className="text-sm font-normal cursor-pointer">
                    Pode ser vendido
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="podeSerComprado"
                    checked={formData.podeSerComprado}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, podeSerComprado: checked as boolean })
                    }
                  />
                  <Label htmlFor="podeSerComprado" className="text-sm font-normal cursor-pointer">
                    Pode ser comprado
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked as boolean })}
                  />
                  <Label htmlFor="ativo" className="text-sm font-normal cursor-pointer">
                    Ativo
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="faturavel"
                    checked={formData.faturavel}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, faturavel: checked as boolean })
                    }
                  />
                  <Label htmlFor="faturavel" className="text-sm font-normal cursor-pointer">
                    Faturável
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="promocao"
                    checked={formData.promocao}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, promocao: checked as boolean })
                    }
                  />
                  <Label htmlFor="promocao" className="text-sm font-normal cursor-pointer">
                    Em promoção
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="descontinuado"
                    checked={formData.descontinuado}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, descontinuado: checked as boolean })
                    }
                  />
                  <Label htmlFor="descontinuado" className="text-sm font-normal cursor-pointer">
                    Descontinuado
                  </Label>
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-primary">Descrição</h3>
              <Textarea
                rows={3}
                value={formData.descricao || ""}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição detalhada do produto..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="button" className="bg-primary hover:bg-primary/90">
                {isEditing ? "Salvar Alterações" : "Cadastrar Produto"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
