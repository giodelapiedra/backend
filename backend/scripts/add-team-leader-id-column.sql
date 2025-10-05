-- Add team_leader_id column to users table
-- This enables team leader-member relationships

-- Add the team_leader_id column
ALTER TABLE users 
ADD COLUMN team_leader_id UUID REFERENCES users(id);

-- Add an index for better query performance
CREATE INDEX idx_users_team_leader_id ON users(team_leader_id);

-- Add a comment to describe the column
COMMENT ON COLUMN users.team_leader_id IS 'ID of the team leader who manages this user';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;
