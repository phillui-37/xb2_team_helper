SELECT e1.name AS element1, e2.name AS element2, e3.name AS element3
FROM element_chain ec
JOIN element e1 ON e1.id = ec.element1_id
JOIN element e2 ON e2.id = ec.element2_id
JOIN element e3 ON e3.id = ec.element3_id
ORDER BY ec.id;
