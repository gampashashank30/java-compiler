-- Fix search_path for upsert_mistake_count function
CREATE OR REPLACE FUNCTION public.upsert_mistake_count(
  p_user_id TEXT,
  p_char_text TEXT,
  p_delta BIGINT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.mistake_counts (user_id, char_text, count, last_seen)
  VALUES (p_user_id, p_char_text, p_delta, now())
  ON CONFLICT (user_id, char_text)
  DO UPDATE SET
    count = mistake_counts.count + p_delta,
    last_seen = now();
END;
$$;