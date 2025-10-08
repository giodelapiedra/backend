-- Add database trigger to enforce one team per team leader
-- This provides an additional layer of security beyond application validation

-- Create function to check team leader constraints
CREATE OR REPLACE FUNCTION check_team_leader_constraints()
RETURNS TRIGGER AS $$
BEGIN
    -- Only apply to team leaders
    IF NEW.role = 'team_leader' THEN
        -- Check if they already have a team
        IF (NEW.team IS NOT NULL AND NEW.team != '') OR 
           (NEW.managed_teams IS NOT NULL AND array_length(NEW.managed_teams, 1) > 0) THEN
            
            -- Check if this is an update and they already had a team
            IF TG_OP = 'UPDATE' AND OLD.role = 'team_leader' THEN
                -- Allow updates to existing team, but prevent adding new teams
                IF (OLD.team IS NOT NULL AND OLD.team != '') AND 
                   (NEW.team IS NOT NULL AND NEW.team != '' AND NEW.team != OLD.team) THEN
                    RAISE EXCEPTION 'Team leader can only have one team. Cannot change from % to %', OLD.team, NEW.team;
                END IF;
                
                -- Prevent adding multiple teams to managed_teams
                IF array_length(NEW.managed_teams, 1) > 1 THEN
                    RAISE EXCEPTION 'Team leader can only manage one team. Current managed teams: %', NEW.managed_teams;
                END IF;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on users table
DROP TRIGGER IF EXISTS team_leader_constraints_trigger ON users;
CREATE TRIGGER team_leader_constraints_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION check_team_leader_constraints();

-- Add comment
COMMENT ON FUNCTION check_team_leader_constraints() IS 
'Enforces one team per team leader rule at database level';

-- Test the trigger (this should fail)
-- INSERT INTO users (id, first_name, last_name, email, role, team, managed_teams) 
-- VALUES ('test-id', 'Test', 'Leader', 'test@example.com', 'team_leader', 'Team A', ARRAY['Team A', 'Team B']);


