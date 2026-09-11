SELECT
  b.name blade,
  w.name weapon,
  e1.name element1,
  e2.name element2,
  STRING_AGG(eff.name, ',') effects
FROM blade b
JOIN weapon w ON w.id = b.weapon_id
JOIN element e1 ON e1.id = b.element1_id
LEFT JOIN element e2 ON e2.id = b.element2_id
JOIN driver d ON d.name = $1
JOIN driver_weapon_effect dwe ON dwe.driver_id = d.id AND w.id = dwe.weapon_id
JOIN effect eff ON eff.id = dwe.effect_id
WHERE b.name = $2
GROUP BY b.name, w.name, e1.name, e2.name;