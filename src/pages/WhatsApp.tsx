// ============================================
// WhatsApp Page - Interface Principal
// Usa o novo módulo v2 unificado
// ============================================

import { WhatsAppModule } from '@/components/whatsapp/v2';
import { WhatsAppProvider } from '@/contexts/WhatsAppContext';

const WhatsApp = () => {
  return (
    <WhatsAppProvider>
      <WhatsAppModule />
    </WhatsAppProvider>
  );
};

export default WhatsApp;
