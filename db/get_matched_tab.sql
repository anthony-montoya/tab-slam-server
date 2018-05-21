SELECT content, url, difficulty, rating, tab_rates, name, artist
FROM tablist
WHERE url = $1;