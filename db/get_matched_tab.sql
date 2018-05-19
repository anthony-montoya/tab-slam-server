-- SELECT content, difficulty, rating, tab_rates, name, artist
-- FROM tablist
-- WHERE url = $1;

SELECT * FROM tablist
WHERE url = $1;