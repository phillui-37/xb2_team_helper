SELECT d.name AS driver, w.name AS weapon, e.name AS effect
FROM driver_weapon_effect dwe
JOIN driver d ON d.id = dwe.driver_id
JOIN weapon w ON w.id = dwe.weapon_id
JOIN effect e ON e.id = dwe.effect_id;
