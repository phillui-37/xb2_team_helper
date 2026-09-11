# target
to build a utility website to calculate possible team of xenoblade2

# xb2 background
- 1 team has 3 driver
- 1 driver has 3 blade
- there are 3 kinds of blade
    - fixed: bind to driver, driver must use it
    - binded: bind to driver, driver can use it
    - free: available to all drivers
- there are 8 elements of blade: dark, light, fire, water, earth, electricity, wind, ice
    - blade has at least 1 element, some have 2
- there are numerous kind of weapon which bind to blade
    - different driver can have different effect depends on weapon
- there are total 4 weapon effect
    - weapon may have 0-2 effects
- elements has element chain which required 3 elements together
    - some chain may have duplicated elements

# data
already in `src/db/init_db.sql`

# requirement
- web ui that allow to select driver,blades
- all 4 weapon effects must be provided in a team
    - has option that provide 2 blade that has same effect as redunduncy, which is total 8 blade has the 4 effects, 2 blade has same effect
- all 8 elements must be contained
- all fixed blade must be auto filled to driver blade slots and cannot be changed
- all availables blade should be refreshed when a blade is selected
- No auto calculation, has a calculate button to provide result out of driver/blade part
    - the calculation based on user assigned blades and selected driver