create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    full_name text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.books (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    recipient text not null,
    occasion text not null,
    recipient_name text not null default '',
    relationship text not null default '',
    memories text not null default '',
    special text not null default '',
    style text not null,
    format text not null,
    extras text not null default 'None',
    photo_paths text[] not null default '{}',
    status text not null default 'draft'
        check (status in ('draft', 'submitted', 'in_progress', 'complete', 'cancelled')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.orders (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete restrict,
    book_id uuid not null references public.books (id) on delete restrict,
    amount_pesewas integer not null check (amount_pesewas > 0),
    currency text not null default 'GHS' check (currency = 'GHS'),
    payment_reference text unique,
    payment_status text not null default 'pending'
        check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
    full_name text not null,
    email text not null,
    phone text not null,
    delivery_address text not null,
    delivery_city text not null,
    delivery_region text not null,
    delivery_notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index books_user_created_at_idx on public.books (user_id, created_at desc);
create index orders_user_created_at_idx on public.orders (user_id, created_at desc);
create index orders_book_id_idx on public.orders (book_id);

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, full_name)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name', '')
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.orders enable row level security;

create policy "Users can read their own profile"
    on public.profiles for select
    to authenticated
    using ((select auth.uid()) = id);

create policy "Users can update their own profile"
    on public.profiles for update
    to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "Users can read their own books"
    on public.books for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy "Users can create their own books"
    on public.books for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy "Users can update their own books"
    on public.books for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Users can delete their own books"
    on public.books for delete
    to authenticated
    using ((select auth.uid()) = user_id);

create policy "Users can read their own orders"
    on public.orders for select
    to authenticated
    using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'book-photos',
    'book-photos',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Users can view photos in their own folder"
    on storage.objects for select
    to authenticated
    using (
        bucket_id = 'book-photos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

create policy "Users can upload photos to their own folder"
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'book-photos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

create policy "Users can delete photos in their own folder"
    on storage.objects for delete
    to authenticated
    using (
        bucket_id = 'book-photos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );
