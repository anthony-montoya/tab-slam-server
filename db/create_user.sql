INSERT INTO users
(auth_id, username, profile_pic)
VALUES
($1, $2, $3)
RETURNING *;