-- Padroniza o número legível da OS sem alterar IDs ou relacionamentos existentes.
-- A sequence existente garante concorrência segura; não usa Math.random.
alter table public.service_orders
  alter column number set default (
    'OS-' || lpad(nextval('public.service_order_number_seq')::text, 6, '0')
  );
