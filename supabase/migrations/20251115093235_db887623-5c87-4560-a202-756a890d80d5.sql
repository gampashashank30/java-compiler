-- Create mistake_counts table to track common coding mistakes per user
CREATE TABLE IF NOT EXISTS public.mistake_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  char_text TEXT NOT NULL,
  count BIGINT DEFAULT 0,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, char_text)
);

-- Enable RLS
ALTER TABLE public.mistake_counts ENABLE ROW LEVEL SECURITY;

-- Create policies for mistake_counts
CREATE POLICY "Users can view their own mistake counts"
  ON public.mistake_counts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own mistake counts"
  ON public.mistake_counts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own mistake counts"
  ON public.mistake_counts FOR UPDATE
  USING (true);

-- Function to upsert mistake counts
CREATE OR REPLACE FUNCTION public.upsert_mistake_count(
  p_user_id TEXT,
  p_char_text TEXT,
  p_delta BIGINT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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