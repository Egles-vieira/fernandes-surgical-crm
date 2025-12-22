import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PropostaHeader } from "@/components/proposta-publica/PropostaHeader";
import { PropostaApresentacao } from "@/components/proposta-publica/PropostaApresentacao";
import { PropostaEscopo } from "@/components/proposta-publica/PropostaEscopo";
import { PropostaTabelaPrecos } from "@/components/proposta-publica/PropostaTabelaPrecos";
import { PropostaTermos } from "@/components/proposta-publica/PropostaTermos";
import { PropostaFooter } from "@/components/proposta-publica/PropostaFooter";
import { usePropostaTrackingOportunidade } from "@/components/proposta-publica/usePropostaTrackingOportunidade";
import { useState } from "react";
import { PropostaAceitarDialogOportunidade } from "@/components/proposta-publica/PropostaAceitarDialogOportunidade";
import { PropostaRecusarDialogOportunidade } from "@/components/proposta-publica/PropostaRecusarDialogOportunidade";

export default function PropostaPublicaOportunidade() {
  const { token } = useParams<{ token: string }>();
  const [aceitarOpen, setAceitarOpen] = useState(false);
  const [recusarOpen, setRecusarOpen] = useState(false);

  console.log('🔍 [PropostaPublicaOportunidade] Renderizando com token:', token);

  const { data: propostaData, isLoading, error } = useQuery({
    queryKey: ['proposta-publica-oportunidade', token],
    queryFn: async () => {
      if (!token) throw new Error('Token não fornecido');

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/buscar-proposta-publica-oportunidade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ token }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao carregar proposta');
      }

      const data = await response.json();

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    enabled: !!token,
    staleTime: 30000,
  });

  // Tracking para oportunidades
  const trackingTokenId = propostaData?.id || '';
  const trackingOportunidadeId = propostaData?.oportunidade?.id || '';
  
  console.log('🔍 [PropostaPublicaOportunidade] Dados para tracking:', { 
    tokenId: trackingTokenId, 
    oportunidadeId: trackingOportunidadeId,
    isLoading,
    hasData: !!propostaData 
  });

  const { trackClick } = usePropostaTrackingOportunidade(
    trackingTokenId,
    trackingOportunidadeId
  );

  const handleAceitar = () => { 
    trackClick('aceitar_click', 'btn-aceitar'); 
    setAceitarOpen(true); 
  };
  
  const handleRecusar = () => { 
    trackClick('recusar_click', 'btn-recusar'); 
    setRecusarOpen(true); 
  };
  
  const handleWhatsApp = () => {
    trackClick('whatsapp_click', 'btn-whatsapp');
    const phone = propostaData?.vendedor?.telefone || propostaData?.vendedor?.celular;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${cleanPhone}`, '_blank');
    }
  };
  
  const handleDownloadPDF = () => { 
    trackClick('download_pdf', 'btn-download'); 
  };

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

  const { venda, itens, vendedor, oportunidade } = propostaData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <PropostaHeader 
          numeroProposta={oportunidade?.codigo || oportunidade?.nome_oportunidade?.slice(0, 20) || 'Proposta'} 
          vendedor={vendedor} 
        />
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-32">
        <section data-section="apresentacao">
          <PropostaApresentacao 
            cliente={venda?.clientes}
            vendedor={vendedor}
            mensagemPersonalizada={propostaData.mensagem_personalizada}
            dataCriacao={oportunidade?.criado_em}
            validadeAte={oportunidade?.validade_proposta || propostaData.expira_em}
          />
        </section>

        <section data-section="escopo">
          <PropostaEscopo observacoes={oportunidade?.descricao || venda?.observacoes} />
        </section>

        {propostaData.mostrar_precos && (
          <section data-section="precos">
            <PropostaTabelaPrecos 
              itens={itens}
              mostrarDescontos={propostaData.mostrar_descontos}
              valorFrete={0}
              valorTotal={oportunidade?.valor || venda?.valor_total}
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

      <PropostaAceitarDialogOportunidade 
        open={aceitarOpen} 
        onOpenChange={setAceitarOpen} 
        tokenId={propostaData.id} 
        oportunidadeId={oportunidade?.id} 
      />
      <PropostaRecusarDialogOportunidade 
        open={recusarOpen} 
        onOpenChange={setRecusarOpen} 
        tokenId={propostaData.id} 
        oportunidadeId={oportunidade?.id} 
      />
    </div>
  );
}
