SELECT w.name, r.name AS role
FROM weapon w
JOIN role r ON r.id = w.role_id
ORDER BY w.id;
