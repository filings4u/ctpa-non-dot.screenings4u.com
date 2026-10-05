-- Applied live to Supabase project wyezpseboxbmkedvbmyx.
-- Restores/extends the C/TPA customer invoicing model.

create table if not exists public.ctpa_payment_processor_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ctpa_id uuid not null unique references public.ctpas(id) on delete cascade,
  provider text not null default 'stripe',
  status text not null default 'pending' check (status in ('pending','active','disabled')),
  provider_account_id text,
  checkout_slug text unique,
  payments_enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  configured_by uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ctpa_client_invoice_payment_links (
  invoice_id uuid primary key references public.ctpa_client_invoices(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ctpa_client_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ctpa_id uuid not null references public.ctpas(id) on delete cascade,
  employer_id uuid not null references public.employers(id) on delete cascade,
  invoice_id uuid not null references public.ctpa_client_invoices(id) on delete cascade,
  amount numeric not null check (amount > 0),
  currency text not null default 'USD',
  payment_method text not null default 'manual',
  external_reference text,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  received_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Payment processing is an add-on, not bundled with a base C/TPA plan.
update public.plan_features pf
set enabled=false,
    configuration=coalesce(configuration,'{}'::jsonb) || '{"delivery":"add_on"}'::jsonb
from public.plans p, public.feature_catalog f
where pf.plan_id=p.id and pf.feature_id=f.id
  and p.code in ('dot_ctpa_essential','dot_ctpa_professional','dot_ctpa_enterprise')
  and f.code='client_payments';
