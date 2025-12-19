-- Adicionar novos valores ao enum custom_field_tipo para campos especiais
ALTER TYPE custom_field_tipo ADD VALUE IF NOT EXISTS 'select_tipo_pedido';
ALTER TYPE custom_field_tipo ADD VALUE IF NOT EXISTS 'select_condicao_pagamento';
ALTER TYPE custom_field_tipo ADD VALUE IF NOT EXISTS 'select_tipo_frete';