SELECT auth_id, username
FROM users
WHERE username = $1;