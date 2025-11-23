create extension if not exists pg_trgm;

create index if not exists profiles_trgm_idx
  on public.profiles using gin (lower(display_name) gin_trgm_ops);

create or replace function public.search_profiles(p_query text, p_limit int default 20)
returns table (id uuid, display_name text, avatar_url text, score real)
language sql stable as $$
  select p.id, p.display_name, p.avatar_url,
         greatest(
           similarity(lower(p.display_name), lower(p_query)),
           case when lower(p.display_name) like '%'||lower(p_query)||'%' then 1.0 else 0.0 end
         ) as score
  from public.profiles p
  where p.display_name is not null
  order by score desc, p.updated_at desc
  limit coalesce(p_limit, 20);
$$;
