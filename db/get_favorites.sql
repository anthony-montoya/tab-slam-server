SELECT tablist.url, tablist.artist, tablist.name, tablist.difficulty, tablist.type, tablist.content, tablist.rating, tablist.tab_rates
FROM tablist
JOIN favorites ON tablist.url = favorites.tab_id
JOIN users ON favorites.user_id = users.auth_id
WHERE users.auth_id = $1;

-- SELECT tab_id FROM favorites
-- WHERE $1 = user_id;



