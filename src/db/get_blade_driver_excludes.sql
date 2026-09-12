SELECT b.name AS blade, d.name AS driver
FROM blade_driver_exclude bde
JOIN blade b ON b.id = bde.blade_id
JOIN driver d ON d.id = bde.driver_id;
