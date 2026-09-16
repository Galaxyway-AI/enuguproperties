-- Neon Data API uses `anonymous` for unauthenticated requests. Recreating the
-- public listing view in 0015 reset its grants, so restore the explicit public
-- read permission while leaving all private property and account tables locked.
grant select on public.public_properties to anonymous, authenticated;
