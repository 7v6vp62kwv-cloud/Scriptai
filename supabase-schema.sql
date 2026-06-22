-- Run this entire file in your Supabase SQL editor
-- (Supabase dashboard → SQL Editor → New Query → paste → Run)

-- ── Profiles table ──
CREATE TABLE IF NOT EXISTS public.profiles (
  id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Auto-create profile on signup (with 3 free credits) ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, credits)
  VALUES (NEW.id, 3)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Deduct 1 credit ──
CREATE OR REPLACE FUNCTION public.deduct_credit(uid UUID)
RETURNS VOID AS $$
  UPDATE public.profiles
  SET credits = credits - 1
  WHERE id = uid AND credits > 0;
$$ LANGUAGE sql SECURITY DEFINER;

-- ── Add credits after payment ──
CREATE OR REPLACE FUNCTION public.add_credits(uid UUID, amount INTEGER)
RETURNS VOID AS $$
  UPDATE public.profiles
  SET credits = credits + amount
  WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER;

-- ── Row Level Security ──
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- ── Creator profiles table ──
-- Stores the user's personal details so they don't re-enter them each time
CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  series     TEXT,
  goal       TEXT,
  whoami     TEXT,
  struggles  TEXT,
  motivation TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security for creator_profiles ──
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own creator profile"
  ON public.creator_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own creator profile"
  ON public.creator_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own creator profile"
  ON public.creator_profiles FOR UPDATE
  USING (auth.uid() = id);
