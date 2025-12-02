import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PropostaHeader } from "@/components/proposta-publica/PropostaHeader";
import { PropostaApresentacao } from "@/components/proposta-publica/PropostaApresentacao";
import { PropostaEscopo } from "@/components/proposta-publica/PropostaEscopo";
import { PropostaTabelaPrecos } from "@/components/proposta-publica/PropostaTabelaPrecos";
import { PropostaTermos } from "@/components/proposta-publica/PropostaTermos";
import { PropostaFooter } from "@/components/proposta-publica/PropostaFooter";
import { usePropostaTracking } from "@/components/proposta-publica/usePropostaTracking";
import { useState } from "react";
import { PropostaAceitarDialog } from "@/components/proposta-publica/PropostaAceitarDialog";
import { PropostaRecusarDialog } from "@/components/proposta-publica/PropostaRecusarDialog";

export default function PropostaPublica() {
  const { token } = useParams<{ token: string }>();
  const [aceitarOpen, setAceitarOpen] = useState(false);
  const [recusarOpen, setRecusarOpen] = useState(false);

  const { data: propostaData, isLoading, error } = useQuery({
    queryKey: ['proposta-publica', token],
    queryFn: async () => {
      if (!token) throw new Error('Token não fornecido');

      const { data: tokenData, error: tokenError } = await supabase
        .from('propostas_publicas_tokens')
        .select('*')
        .eq('public_token', token)
        .eq('ativo', true)
        .single();

      if (tokenError) throw tokenError;
      if (!tokenData) throw new Error('Proposta não encontrada');

      if (tokenData.expira_em && new Date(tokenData.expira_em) < new Date()) {
        throw new Error('Esta proposta expirou');
      }

      // Buscar venda separadamente
      const { data: venda } = await supabase
        .from('vendas')
        .select('*, clientes:cliente_id(nome_abrev, nome_emit, cgc)')
        .eq('id', tokenData.venda_id)
        .single();

      // Buscar itens
      const { data: itens } = await supabase
        .from('vendas_itens')
        .select('*, produtos:produto_id(nome, referencia_interna, unidade_medida)')
        .eq('venda_id', tokenData.venda_id);

      // Buscar vendedor
      const { data: vendedor } = venda?.vendedor_id ? await supabase
        .from('perfis_usuario')
        .select('primeiro_nome, sobrenome, telefone, celular')
        .eq('id', venda.vendedor_id)
        .single() : { data: null };

      return { ...tokenData, venda, itens: itens || [], vendedor };
    },
    enabled: !!token,
    staleTime: 30000,
  });

  const { trackClick } = usePropostaTracking(
    propostaData?.id || '',
    propostaData?.venda_id || ''
  );

  const handleAceitar = () => { trackClick('aceitar_click', 'btn-aceitar'); setAceitarOpen(true); };
  const handleRecusar = () => { trackClick('recusar_click', 'btn-recusar'); setRecusarOpen(true); };
  const handleWhatsApp = () => {
    trackClick('whatsapp_click', 'btn-whatsapp');
    const phone = propostaData?.vendedor?.telefone || propostaData?.vendedor?.celular;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${cleanPhone}`, '_blank');
    }
  };
  const handleDownloadPDF = () => { trackClick('download_pdf', 'btn-download'); };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !propostaData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Proposta Indisponível</h1>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Proposta não encontrada.'}
          </p>
        </Card>
      </div>
    );
  }

  const { venda, itens, vendedor } = propostaData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <PropostaHeader numeroProposta={venda?.id?.slice(0, 8).toUpperCase()} vendedor={vendedor} />
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-32">
        <section data-section="apresentacao">
          <PropostaApresentacao 
            cliente={venda?.clientes as any}
            vendedor={vendedor}
            mensagemPersonalizada={propostaData.mensagem_personalizada}
            dataCriacao={venda?.created_at}
            validadeAte={propostaData.expira_em}
          />
        </section>

        <section data-section="escopo">
          <PropostaEscopo observacoes={venda?.observacoes} />
        </section>

        {propostaData.mostrar_precos && (
          <section data-section="precos">
            <PropostaTabelaPrecos 
              itens={itens as any}
              mostrarDescontos={propostaData.mostrar_descontos}
              valorFrete={venda?.frete_valor}
              valorTotal={venda?.valor_final}
            />
          </section>
        )}

        <section data-section="termos">
          <PropostaTermos />
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t shadow-lg z-40">
        <PropostaFooter 
          onAceitar={propostaData.permitir_aceitar ? handleAceitar : undefined}
          onRecusar={propostaData.permitir_recusar ? handleRecusar : undefined}
          onWhatsApp={handleWhatsApp}
          onDownloadPDF={propostaData.permitir_download_pdf ? handleDownloadPDF : undefined}
        />
      </footer>

      <PropostaAceitarDialog open={aceitarOpen} onOpenChange={setAceitarOpen} tokenId={propostaData.id} vendaId={propostaData.venda_id} />
      <PropostaRecusarDialog open={recusarOpen} onOpenChange={setRecusarOpen} tokenId={propostaData.id} vendaId={propostaData.venda_id} />
    </div>
  );
}
