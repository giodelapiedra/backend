-- Get user ID for samward@gmail.com
SELECT id, email, first_name, last_name, role
FROM users
WHERE email = 'samward@gmail.com';

-- Check notifications for this user
SELECT n.*,
       sender.first_name as sender_first_name,
       sender.last_name as sender_last_name,
       sender.email as sender_email
FROM notifications n
LEFT JOIN users sender ON n.sender_id = sender.id
WHERE n.recipient_id = (SELECT id FROM users WHERE email = 'samward@gmail.com')
ORDER BY n.created_at DESC;

-- Check work readiness assignments for this user
SELECT wra.*,
       tl.first_name as team_leader_first_name,
       tl.last_name as team_leader_last_name,
       tl.email as team_leader_email
FROM work_readiness_assignments wra
JOIN users tl ON wra.team_leader_id = tl.id
WHERE wra.worker_id = (SELECT id FROM users WHERE email = 'samward@gmail.com')
ORDER BY wra.created_at DESC;
