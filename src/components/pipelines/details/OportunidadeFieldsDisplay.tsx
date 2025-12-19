import { useMemo } from "react";
import { PipelineCustomField } from "@/types/pipelines";
import { KanbanFieldDisplay } from "@/components/pipelines/fields/KanbanFieldDisplay";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface OportunidadeFieldsDisplayProps {
  campos: PipelineCustomField[];
  valores: Record<string, unknown>;
}

interface GrupoCampos {
  nome: string;
  campos: PipelineCustomField[];
}

export function OportunidadeFieldsDisplay({ campos, valores }: OportunidadeFieldsDisplayProps) {
  // Agrupar campos por grupo
  const gruposOrdenados = useMemo(() => {
    const grupos: Record<string, PipelineCustomField[]> = {};
    
    campos.forEach((campo) => {
      const grupo = campo.grupo || "Outros";
      if (!grupos[grupo]) {
        grupos[grupo] = [];
      }
      grupos[grupo].push(campo);
    });

    // Ordenar campos dentro de cada grupo
    Object.values(grupos).forEach((camposGrupo) => {
      camposGrupo.sort((a, b) => a.ordem - b.ordem);
    });

    // Converter para array e ordenar grupos
    const ordemGrupos = ["Informações Principais", "Dados do Negócio", "Qualificação", "Outros"];
    
    return Object.entries(grupos)
      .map(([nome, campos]): GrupoCampos => ({ nome, campos }))
      .sort((a, b) => {
        const idxA = ordemGrupos.indexOf(a.nome);
        const idxB = ordemGrupos.indexOf(b.nome);
        if (idxA === -1 && idxB === -1) return a.nome.localeCompare(b.nome);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
  }, [campos]);

  if (campos.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Nenhum campo customizado configurado
      </div>
    );
  }

  // Verificar se há valores preenchidos
  const temValores = campos.some(
    (campo) => valores[campo.nome_campo] !== null && valores[campo.nome_campo] !== undefined && valores[campo.nome_campo] !== ""
  );

  if (!temValores) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Nenhum campo preenchido
      </div>
    );
  }

  return (
    <Accordion type="multiple" defaultValue={gruposOrdenados.map((g) => g.nome)} className="w-full">
      {gruposOrdenados.map((grupo) => {
        // Filtrar apenas campos que têm valor
        const camposComValor = grupo.campos.filter(
          (campo) => valores[campo.nome_campo] !== null && valores[campo.nome_campo] !== undefined && valores[campo.nome_campo] !== ""
        );

        if (camposComValor.length === 0) return null;

        return (
          <AccordionItem key={grupo.nome} value={grupo.nome}>
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              {grupo.nome}
              <span className="ml-2 text-xs text-muted-foreground">
                ({camposComValor.length})
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2">
                {camposComValor.map((campo) => (
                  <div 
                    key={campo.id} 
                    className={campo.largura === "full" ? "col-span-2" : ""}
                  >
                    <KanbanFieldDisplay
                      field={campo}
                      value={valores[campo.nome_campo]}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
