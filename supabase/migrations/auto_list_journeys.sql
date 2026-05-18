-- Auto-list journeys on creation (temporary until OCR verification is ready)
-- This removes the manual ticket_pending -> listed flip requirement

-- Create trigger function
create or replace function public.auto_list_journey()
returns trigger as $$
begin
  -- Set status to 'listed' immediately on insert
  new.status := 'listed';
  return new;
end;
$$ language plpgsql;

-- Drop existing trigger if it exists
drop trigger if exists tg_auto_list_journey on public.journeys;

-- Create trigger
create trigger tg_auto_list_journey
before insert on public.journeys
for each row
execute function public.auto_list_journey();
