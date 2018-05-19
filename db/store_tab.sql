INSERT INTO tablist 
(type, url, artist, name, difficulty, rating, tab_rates, content)
VALUES
($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;