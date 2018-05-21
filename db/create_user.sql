INSERT INTO users
(auth_id, username, password)
VALUES
($1, $2, $3)
RETURNING auth_id, username;