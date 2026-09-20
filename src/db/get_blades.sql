SELECT
  b.id,
  b.name,
  w.name AS weapon,
  wr.name AS weapon_role,
  e1.name AS element1,
  e2.name AS element2,
  b.advanced_new_game,
  b.aux_core_slots,
  b.can_change_element
FROM blade b
JOIN weapon w ON w.id = b.weapon_id
JOIN role wr ON wr.id = w.role_id
JOIN element e1 ON e1.id = b.element1_id
LEFT JOIN element e2 ON e2.id = b.element2_id
ORDER BY b.id;
