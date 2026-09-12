SELECT
  fi.owner_type,
  fi.owner_name,
  fi.persona,
  i.name AS item,
  c.name AS category,
  fi.sort_order
FROM favorite_item fi
JOIN pouch_item i ON i.id = fi.item_id
JOIN pouch_category c ON c.id = i.category_id
ORDER BY fi.owner_type, fi.owner_name, fi.persona, fi.sort_order;
