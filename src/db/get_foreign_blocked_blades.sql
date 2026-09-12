SELECT b.name AS blade
FROM foreign_blade_exclude fbe
JOIN blade b ON b.id = fbe.blade_id;
