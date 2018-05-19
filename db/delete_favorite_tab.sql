DELETE FROM favorites
WHERE user_id = $1 AND tab_id = $2;