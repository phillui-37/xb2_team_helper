SELECT
  fc.owner_type,
  fc.owner_name,
  fc.persona,
  c.name AS category,
  c.buff_key,
  fc.sort_order
FROM favorite_category fc
JOIN pouch_category c ON c.id = fc.category_id
ORDER BY fc.owner_type, fc.owner_name, fc.persona, fc.sort_order;
