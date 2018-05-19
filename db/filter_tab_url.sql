SELECT EXISTS
    (SELECT tab_html 
        FROM tablist 
        WHERE tab_url = $1);