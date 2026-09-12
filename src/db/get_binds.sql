SELECT b.name AS blade, d.name AS driver, bbd.is_fixed
FROM blade_bind_driver bbd
JOIN blade b ON b.id = bbd.blade_id
JOIN driver d ON d.id = bbd.driver_id;
