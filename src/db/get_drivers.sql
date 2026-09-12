SELECT d.id, d.name, r.name AS role, d.can_use_foreign
FROM driver d
JOIN role r ON r.id = d.role_id
ORDER BY d.id;
