-- Adds Rent/Price/Term/TI/Building/Space#/Size to the universal Sites/Deals
-- table (used by both Clients and Listings) — previously these fields only
-- existed on the Listings-only Leasing Report. Safe, additive.
alter table deals add column if not exists deal_type text;
alter table deals add column if not exists building text;
alter table deals add column if not exists space_num text;
alter table deals add column if not exists size text;
alter table deals add column if not exists rent text;
alter table deals add column if not exists price text;
alter table deals add column if not exists term text;
alter table deals add column if not exists ti_allowance text;
alter table deals add column if not exists notes text;
