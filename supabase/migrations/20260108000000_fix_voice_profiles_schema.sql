-- Add missing columns to voice_profiles
ALTER TABLE voice_profiles 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS elevenlabs_voice_id TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_id ON voice_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_profiles_elevenlabs_id ON voice_profiles(elevenlabs_voice_id);

-- Enable RLS
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'voice_profiles' AND policyname = 'Users can view their own voice profiles'
    ) THEN
        CREATE POLICY "Users can view their own voice profiles"
        ON voice_profiles FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'voice_profiles' AND policyname = 'Users can insert their own voice profiles'
    ) THEN
        CREATE POLICY "Users can insert their own voice profiles"
        ON voice_profiles FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'voice_profiles' AND policyname = 'Users can update their own voice profiles'
    ) THEN
        CREATE POLICY "Users can update their own voice profiles"
        ON voice_profiles FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'voice_profiles' AND policyname = 'Users can delete their own voice profiles'
    ) THEN
        CREATE POLICY "Users can delete their own voice profiles"
        ON voice_profiles FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END $$;
