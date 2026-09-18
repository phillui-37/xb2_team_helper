-- init, only run once
-- base table
CREATE TABLE role (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    CONSTRAINT uq_role_name UNIQUE (name)
);

CREATE TABLE weapon (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    CONSTRAINT fk_weapon_role
        FOREIGN KEY (role_id) REFERENCES role(id)
);

CREATE TABLE element (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    CONSTRAINT uq_element_name UNIQUE (name)
);

CREATE TABLE effect (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    CONSTRAINT uq_effect_name UNIQUE (name)
);

CREATE TABLE blade (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    weapon_id INTEGER NOT NULL,
    element1_id INTEGER NOT NULL,
    element2_id INTEGER NULL,
    advanced_new_game BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_blade_weapon
        FOREIGN KEY (weapon_id) REFERENCES weapon(id),
    CONSTRAINT fk_blade_element1
        FOREIGN KEY (element1_id) REFERENCES element(id),
    CONSTRAINT fk_blade_element2
        FOREIGN KEY (element2_id) REFERENCES element(id),
    CONSTRAINT ck_blade_distinct_elements
        CHECK (
            element2_id IS NULL
            OR element2_id <> element1_id
        )
);

CREATE TABLE driver (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    can_use_foreign BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_driver_role
        FOREIGN KEY (role_id) REFERENCES role(id)
);

-- special table
CREATE TABLE blade_bind_driver (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    blade_id INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    is_fixed BOOLEAN NOT NULL,
    CONSTRAINT fk_bbd_blade
        FOREIGN KEY (blade_id) REFERENCES blade(id),
    CONSTRAINT fk_bbd_driver
        FOREIGN KEY (driver_id) REFERENCES driver(id),
    CONSTRAINT uq_bbd_driver_blade
        UNIQUE (driver_id, blade_id)
);

CREATE TABLE driver_weapon_effect (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    driver_id INTEGER NOT NULL,
    weapon_id INTEGER NOT NULL,
    effect_id INTEGER NOT NULL,
    CONSTRAINT fk_dwe_driver
        FOREIGN KEY (driver_id) REFERENCES driver(id),
    CONSTRAINT fk_dwe_weapon
        FOREIGN KEY (weapon_id) REFERENCES weapon(id),
    CONSTRAINT fk_dwe_effect
        FOREIGN KEY (effect_id) REFERENCES effect(id),
    CONSTRAINT uq_dwe_driver_weapon_effect
        UNIQUE (driver_id, weapon_id, effect_id)
);

CREATE TABLE element_chain (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    element1_id INTEGER NOT NULL,
    element2_id INTEGER NOT NULL,
    element3_id INTEGER NOT NULL,
    CONSTRAINT fk_ec_element1
        FOREIGN KEY (element1_id) REFERENCES element(id),
    CONSTRAINT fk_ec_element2
        FOREIGN KEY (element2_id) REFERENCES element(id),
    CONSTRAINT fk_ec_element3
        FOREIGN KEY (element3_id) REFERENCES element(id),
    CONSTRAINT uq_element_chain
        UNIQUE (element1_id, element2_id, element3_id)
);

-- Drivers who may never use a blade (assignment + combat).
CREATE TABLE blade_driver_exclude (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    blade_id INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    CONSTRAINT fk_bde_blade
        FOREIGN KEY (blade_id) REFERENCES blade(id),
    CONSTRAINT fk_bde_driver
        FOREIGN KEY (driver_id) REFERENCES driver(id),
    CONSTRAINT uq_bde_blade_driver
        UNIQUE (blade_id, driver_id)
);

-- Blades a foreign-use driver (Rex) still cannot borrow.
CREATE TABLE foreign_blade_exclude (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    blade_id INTEGER NOT NULL,
    CONSTRAINT fk_fbe_blade
        FOREIGN KEY (blade_id) REFERENCES blade(id),
    CONSTRAINT uq_fbe_blade
        UNIQUE (blade_id)
);

-- index
CREATE INDEX idx_bbd_blade
ON blade_bind_driver(blade_id);

CREATE INDEX idx_bbd_fixed_driver_blade
ON blade_bind_driver (driver_id, blade_id)
WHERE is_fixed;

CREATE INDEX idx_bbd_binded_driver_blade
ON blade_bind_driver (driver_id, blade_id)
WHERE NOT is_fixed;

-- view
CREATE VIEW driver_candidate_blade AS
SELECT
    bbd.driver_id,
    bbd.blade_id,
    'FIXED'::TEXT AS source
FROM blade_bind_driver bbd
WHERE bbd.is_fixed

UNION ALL

SELECT
    bbd.driver_id,
    bbd.blade_id,
    'BINDED'::TEXT AS source
FROM blade_bind_driver bbd
JOIN driver d
  ON d.id = bbd.driver_id
JOIN blade b
  ON b.id = bbd.blade_id
JOIN weapon w
  ON w.id = b.weapon_id
 AND w.role_id = d.role_id
WHERE NOT bbd.is_fixed
  
UNION ALL

SELECT
    d.id AS driver_id,
    b.id as blade_id,
    'FREE'::TEXT as source
FROM driver d
JOIN weapon w
  ON w.role_id = d.role_id
JOIN blade b
  ON b.weapon_id = w.id
WHERE NOT EXISTS (
    SELECT 1
    FROM blade_bind_driver bbd
    WHERE bbd.blade_id = b.id
);

CREATE VIEW driver_blade_combination AS
SELECT
    c1.driver_id,
    c1.blade_id AS blade1_id,
    c2.blade_id AS blade2_id,
    c3.blade_id AS blade3_id
FROM driver_candidate_blade c1
JOIN driver_candidate_blade c2
    ON c2.driver_id = c1.driver_id
   AND c2.blade_id > c1.blade_id
JOIN driver_candidate_blade c3
    ON c3.driver_id = c1.driver_id
   AND c3.blade_id > c2.blade_id;

CREATE VIEW valid_driver_blade_combination AS
WITH eligible_driver AS (
    SELECT bbd.driver_id
    FROM blade_bind_driver bbd
    WHERE bbd.is_fixed
    GROUP BY bbd.driver_id
    HAVING COUNT(*) BETWEEN 1 AND 3
)
SELECT c.*
FROM driver_blade_combination c
JOIN eligible_driver ed
  ON ed.driver_id = c.driver_id
WHERE NOT EXISTS (
    SELECT 1
    FROM blade_bind_driver fixed
    WHERE fixed.driver_id = c.driver_id
      AND fixed.is_fixed
      AND fixed.blade_id NOT IN (
        c.blade1_id,
        c.blade2_id,
        c.blade3_id
      )
);

-- data
INSERT INTO role (name)
VALUES
    ('Attacker'),
    ('Tank'),
    ('Healer');

INSERT INTO weapon (name, role_id)
SELECT w.name, r.id
FROM (
  VALUES
    ('seihai', 'Attacker'),
    ('suzaku', 'Attacker'),
    ('saika', 'Attacker'),
    ('ball', 'Healer'),
    ('katana', 'Tank'),
    ('cannon', 'Attacker'),
    ('hana shield', 'Tank'),
    ('hana arms', 'Tank'),
    ('hana saber', 'Attacker'),
    ('axe', 'Attacker'),
    ('hammer', 'Tank'),
    ('whip', 'Tank'),
    ('lance', 'Attacker'),
    ('uchigatana', 'Tank'),
    ('twin rings', 'Healer'),
    ('claws', 'Healer'),
    ('nia', 'Healer'),
    ('shulk', 'Attacker'),
    ('elma', 'Attacker'),
    ('calamity scythe', 'Healer'),
    ('cobra bardiche', 'Attacker'),
    ('infinity fans', 'Tank'),
    ('brilliant twinblades', 'Attacker'),
    ('decimation cannon', 'Attacker'),
    ('rockrending gauntlets', 'Tank'),
    ('sword tonfa', 'Tank')
) AS w(name, role_name)
JOIN role r on r.name = w.role_name;

INSERT INTO element (name)
VALUES ('fire'), ('water'), ('wind'), ('ice'), ('electricity'), ('earth'), ('dark'), ('light');

INSERT INTO effect (name)
VALUES ('break'), ('topple'), ('launch'), ('smash');

INSERT INTO blade (name, weapon_id, element1_id, element2_id)
SELECT b.name, w.id, e1.id, e2.id
FROM (
    VALUES
        ('seihai', 'seihai', 'fire', 'light'),
        ('suzaku', 'suzaku', 'wind', NULL),
        ('pyauko', 'twin rings', 'water', NULL),
        ('hana jd', 'hana saber', 'ice', NULL),
        ('hana jk', 'hana arms', 'fire', NULL),
        ('hana js', 'hana shield', 'earth', NULL),
        ('saika', 'saika', 'electricity', NULL),
        ('kaguduchi', 'whip', 'fire', NULL),
        ('wadatumi', 'katana', 'water', NULL),
        ('nia', 'nia', 'water', NULL),
        ('boreas', 'ball', 'wind', NULL),
        ('crossette', 'ball', 'fire', NULL),
        ('dahlla', 'ball', 'ice', NULL),
        ('floren', 'ball', 'earth', NULL),
        ('vess', 'ball', 'electricity', NULL),
        ('azami', 'cannon', 'dark', NULL),
        ('herald', 'cannon', 'electricity', NULL),
        ('kosmos', 'cannon', 'light', NULL),
        ('sheba', 'cannon', 'water', NULL),
        ('agate', 'axe', 'earth', NULL),
        ('dagas', 'axe', 'fire', NULL),
        ('gorg', 'axe', 'water', NULL),
        ('telos', 'axe', 'dark', NULL),
        ('zanobia', 'axe', 'wind', NULL),
        ('adenine', 'claws', 'wind', NULL),
        ('kora', 'claws', 'electricity', NULL),
        ('nim', 'claws', 'earth', NULL),
        ('ursula', 'claws', 'ice', NULL),
        ('perun', 'lance', 'ice', NULL),
        ('praxis', 'lance', 'water', NULL),
        ('vale', 'lance', 'dark', NULL),
        ('wulfric', 'lance', 'earth', NULL),
        ('electra', 'hammer', 'electricity', NULL),
        ('finch', 'hammer', 'wind', NULL),
        ('godfrey', 'hammer', 'ice', NULL),
        ('kasandra', 'hammer', 'dark', NULL),
        ('poppibuster', 'hammer', 'light', NULL),
        ('newt', 'katana', 'fire', NULL),
        ('perceval', 'katana', 'dark', NULL),
        ('theory', 'katana', 'ice', NULL),
        ('momo', 'ball', 'light', 'dark'),
        ('fiora', 'twin rings', 'wind', NULL),
        ('shulk', 'shulk', 'light', NULL),
        ('elma', 'elma', 'dark', NULL),
        ('kamuya', 'uchigatana', 'light', NULL)
) AS b(name, w_name, e1, e2)
join weapon w on w.name = b.w_name
join element e1 on e1.name = b.e1
left join element e2 on e2.name = b.e2;

-- Advanced New Game (New Game Plus) Torna blades.
INSERT INTO blade (name, weapon_id, element1_id, element2_id, advanced_new_game)
SELECT b.name, w.id, e1.id, e2.id, TRUE
FROM (
    VALUES
        ('yoshitsune', 'calamity scythe', 'electricity', NULL),
        ('benkei', 'cobra bardiche', 'earth', NULL),
        ('satahiko', 'infinity fans', 'dark', NULL),
        ('kamui', 'brilliant twinblades', 'electricity', NULL),
        ('ragou', 'decimation cannon', 'fire', NULL),
        ('ootsuchi', 'rockrending gauntlets', 'earth', NULL),
        ('zantetsu', 'sword tonfa', 'wind', NULL)
) AS b(name, w_name, e1, e2)
join weapon w on w.name = b.w_name
join element e1 on e1.name = b.e1
left join element e2 on e2.name = b.e2;

INSERT INTO driver (name, role_id, can_use_foreign)
SELECT d.name, r.id, d.can_use_foreign
FROM (
    VALUES
        ('rex', 'Attacker', TRUE),
        ('nia', 'Healer', FALSE),
        ('merefu', 'Tank', FALSE),
        ('zig', 'Attacker', FALSE),
        ('tora', 'Tank', FALSE)
) AS d(name, r_name, can_use_foreign)
join role r on r.name = d.r_name;

INSERT INTO blade_bind_driver (blade_id, driver_id, is_fixed)
SELECT b.id, d.id, x.is_fixed
FROM (
  VALUES
    ('seihai', 'rex', TRUE),
    ('suzaku', 'rex', FALSE),
    ('pyauko', 'nia', TRUE),
    ('hana js', 'tora', TRUE),
    ('hana jk', 'tora', TRUE),
    ('hana jd', 'tora', TRUE),
    ('saika', 'zig', TRUE),
    ('kaguduchi', 'merefu', TRUE),
    ('wadatumi', 'merefu', FALSE),
    ('nia', 'rex', FALSE),
    ('poppibuster', 'rex', FALSE),
    ('poppibuster', 'merefu', FALSE),
    ('poppibuster', 'zig', FALSE),
    ('poppibuster', 'nia', FALSE)
) AS x(b_name, d_name, is_fixed)
JOIN blade b ON b.name = x.b_name
JOIN driver d ON d.name = x.d_name;

-- Poppibuster cannot be assigned to / used by Tora.
INSERT INTO blade_driver_exclude (blade_id, driver_id)
SELECT b.id, d.id
FROM (
    VALUES
        ('poppibuster', 'tora')
) AS x(b_name, d_name)
JOIN blade b ON b.name = x.b_name
JOIN driver d ON d.name = x.d_name;

-- Rex can use others' blades except Poppi α / QT / QTπ.
INSERT INTO foreign_blade_exclude (blade_id)
SELECT b.id
FROM (
    VALUES
        ('hana js'),
        ('hana jk'),
        ('hana jd')
) AS x(b_name)
JOIN blade b ON b.name = x.b_name;

insert into driver_weapon_effect (driver_id, weapon_id, effect_id)
select d.id, w.id, e.id
from (
    VALUES
        ('rex', 'seihai', 'topple'),
        ('rex', 'katana', 'break'),
        ('rex', 'suzaku', 'smash'),
        ('rex', 'axe', 'launch'),
        ('rex', 'lance', 'break'),
        ('rex', 'uchigatana', 'smash'),
        ('zig', 'saika', 'launch'),
        ('zig', 'cannon', 'break'),
        ('zig', 'axe', 'topple'),
        ('zig', 'claws', 'topple'),
        ('zig', 'lance', 'smash'),
        ('zig', 'shulk', 'launch'),
        ('zig', 'hammer', 'launch'),
        ('zig', 'uchigatana', 'smash'),
        ('tora', 'hana shield', 'topple'),
        ('tora', 'hana arms', 'smash'),
        ('tora', 'hana saber', 'break'),
        ('tora', 'hana saber', 'launch'),
        ('merefu', 'katana', 'smash'),
        ('merefu', 'cannon', 'break'),
        ('merefu', 'claws', 'break'),
        ('merefu', 'lance', 'smash'),
        ('merefu', 'whip', 'break'),
        ('merefu', 'shulk', 'topple'),
        ('merefu', 'hammer', 'launch'),
        ('merefu', 'uchigatana', 'smash'),
        ('nia', 'cannon', 'break'),
        ('nia', 'twin rings', 'break'),
        ('nia', 'elma', 'break'),
        ('nia', 'axe', 'topple'),
        ('nia', 'claws', 'launch'),
        ('nia', 'uchigatana', 'smash')
) as x(d_name, w_name, e_name)
join driver d on d.name = x.d_name
join weapon w on w.name = x.w_name
join effect e on e.name = x.e_name;

-- NG+ unique weapons reuse Driver Combo arts of their animation type.
INSERT INTO driver_weapon_effect (driver_id, weapon_id, effect_id)
SELECT dwe.driver_id, dst.id, dwe.effect_id
FROM (
    VALUES
        ('calamity scythe', 'axe'),
        ('cobra bardiche', 'lance'),
        ('infinity fans', 'twin rings'),
        ('brilliant twinblades', 'twin rings'),
        ('decimation cannon', 'cannon'),
        ('rockrending gauntlets', 'claws'),
        ('sword tonfa', 'claws')
) AS map(dst_name, src_name)
JOIN weapon src ON src.name = map.src_name
JOIN weapon dst ON dst.name = map.dst_name
JOIN driver_weapon_effect dwe ON dwe.weapon_id = src.id;

insert into element_chain (element1_id, element2_id, element3_id)
select e1.id, e2.id, e3.id
from (
    VALUES
        ('fire', 'fire', 'fire'),
        ('fire', 'fire', 'light'),
        ('fire', 'water', 'fire'),
        ('fire', 'water', 'ice'),
        ('water', 'water', 'water'),
        ('water', 'water', 'dark'),
        ('water', 'earth', 'wind'),
        ('wind', 'wind', 'earth'),
        ('wind', 'wind', 'electricity'),
        ('wind', 'ice', 'ice'),
        ('earth', 'fire', 'wind'),
        ('earth', 'fire', 'earth'),
        ('earth', 'earth', 'electricity'),
        ('electricity', 'fire', 'wind'),
        ('electricity', 'fire', 'ice'),
        ('electricity', 'electricity', 'water'),
        ('ice', 'ice', 'earth'),
        ('ice', 'ice', 'dark'),
        ('ice', 'water', 'wind'),
        ('light', 'light', 'light'),
        ('light', 'light', 'water'),
        ('light', 'electricity', 'fire'),
        ('dark', 'dark', 'dark'),
        ('dark', 'dark', 'earth'),
        ('dark', 'light', 'electricity')
) as x(e_name1, e_name2, e_name3)
join element e1 on e1.name = x.e_name1
join element e2 on e2.name = x.e_name2
join element e3 on e3.name = x.e_name3;
