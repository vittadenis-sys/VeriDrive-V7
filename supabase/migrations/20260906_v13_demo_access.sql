alter table public.customers
  add column if not exists demo_access boolean not null default false;

comment on column public.customers.demo_access is 'Allows this individual B2C customer to create test bookings without Stripe payment.';
