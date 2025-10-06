-- Fix work_readiness table by adding missing columns and updating constraints
-- Run this in your Supabase SQL editor

-- First, check if the table exists and what columns it has
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'work_readiness' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing constraints
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.work_readiness'::regclass;

-- Add missing columns if they don't exist
ALTER TABLE public.work_readiness 
ADD COLUMN IF NOT EXISTS fatigue_level INTEGER,
ADD COLUMN IF NOT EXISTS pain_discomfort TEXT,
ADD COLUMN IF NOT EXISTS pain_areas TEXT[],
ADD COLUMN IF NOT EXISTS readiness_level TEXT,
ADD COLUMN IF NOT EXISTS mood TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'submitted';

-- Add constraints to ensure data integrity (only if they don't exist)
DO $$ 
BEGIN
    -- Drop ALL existing fatigue_level constraints
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname LIKE '%fatigue_level%' 
        AND conrelid = 'public.work_readiness'::regclass
    ) THEN
        -- Drop all fatigue level constraints
        ALTER TABLE public.work_readiness 
        DROP CONSTRAINT IF EXISTS work_readiness_fatigue_level_check;
        ALTER TABLE public.work_readiness 
        DROP CONSTRAINT IF EXISTS check_fatigue_level;
    END IF;
    
    -- Add new fatigue_level constraint for 0-10 scale
    ALTER TABLE public.work_readiness 
    ADD CONSTRAINT work_readiness_fatigue_level_check 
    CHECK (fatigue_level >= 0 AND fatigue_level <= 10);

    -- Add pain_discomfort constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_pain_discomfort' 
        AND conrelid = 'public.work_readiness'::regclass
    ) THEN
        ALTER TABLE public.work_readiness 
        ADD CONSTRAINT check_pain_discomfort 
        CHECK (pain_discomfort IN ('yes', 'no'));
    END IF;

    -- Add readiness_level constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_readiness_level' 
        AND conrelid = 'public.work_readiness'::regclass
    ) THEN
        ALTER TABLE public.work_readiness 
        ADD CONSTRAINT check_readiness_level 
        CHECK (readiness_level IN ('fit', 'minor', 'not_fit'));
    END IF;

    -- Add mood constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_mood' 
        AND conrelid = 'public.work_readiness'::regclass
    ) THEN
        ALTER TABLE public.work_readiness 
        ADD CONSTRAINT check_mood 
        CHECK (mood IN ('excellent', 'good', 'okay', 'poor', 'terrible'));
    END IF;

    -- Add status constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_status' 
        AND conrelid = 'public.work_readiness'::regclass
    ) THEN
        ALTER TABLE public.work_readiness 
        ADD CONSTRAINT check_status 
        CHECK (status IN ('submitted', 'pending', 'reviewed'));
    END IF;
END $$;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'work_readiness' 
AND table_schema = 'public'
ORDER BY ordinal_position;
