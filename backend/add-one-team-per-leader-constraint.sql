-- Add database constraint to enforce one team per team leader
-- This prevents bypassing the application-level validation

-- First, let's check current team leaders with multiple teams
SELECT 
    id,
    first_name,
    last_name,
    email,
    team,
    managed_teams,
    array_length(managed_teams, 1) as managed_teams_count
FROM users 
WHERE role = 'team_leader' 
AND (
    (team IS NOT NULL AND team != '') 
    OR 
    (managed_teams IS NOT NULL AND array_length(managed_teams, 1) > 0)
)
ORDER BY managed_teams_count DESC NULLS LAST;

-- Add a check constraint to prevent multiple teams per team leader
-- This ensures that a team leader can only have one team in the 'team' field
-- and can only manage one team in the 'managed_teams' array

ALTER TABLE users 
ADD CONSTRAINT one_team_per_leader_check 
CHECK (
    role != 'team_leader' OR 
    (
        -- If they have a team, it should be the only one
        (team IS NULL OR team = '') OR
        (
            team IS NOT NULL AND team != '' AND
            (managed_teams IS NULL OR array_length(managed_teams, 1) <= 1)
        )
    )
);

-- Add a comment to document the constraint
COMMENT ON CONSTRAINT one_team_per_leader_check ON users IS 
'Ensures each team leader can only have one team to prevent bypassing application validation';

-- Verify the constraint was added
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    consrc as constraint_definition
FROM pg_constraint 
WHERE conname = 'one_team_per_leader_check';
