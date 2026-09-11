SELECT
  d.name as driver,
  ARRAY_AGG(b.name) as blades
FROM driver d
JOIN blade_bind_driver bbd ON bbd.driver_id = d.id AND bbd.is_fixed
JOIN blade b ON bbd.blade_id = b.id
WHERE d.name = $1
GROUP BY d.name;