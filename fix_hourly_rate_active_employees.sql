-- Fix hourly rate calculation to only consider active employees
-- This ensures that when employees are deactivated, the overhead is redistributed
-- only among active employees, recalculating their hourly rates correctly.

-- Main function that can be called directly via RPC
CREATE OR REPLACE FUNCTION recalculate_hourly_rates()
RETURNS void AS $$
BEGIN
  WITH config AS (
    SELECT AVG(break_even_point) as target_cost 
    FROM finance_roadmap_2026 
    WHERE break_even_point > 0
  ),
  staff_stats AS (
    SELECT 
      SUM(salary) as total_salary, 
      COUNT(*) as staff_count 
    FROM he_time_users 
    WHERE salary > 0 
      AND is_active = true  -- Only count active employees
      AND (type = 'a-indkomst' OR type IS NULL)  -- Exclude freelancers
  ),
  overhead_calc AS (
    SELECT 
      CASE 
        WHEN staff_count > 0 THEN 
          ((SELECT target_cost FROM config) - total_salary) / staff_count
        ELSE 0
      END as overhead_per_person
    FROM staff_stats
  )
  UPDATE he_time_users
  SET hourly_rate = (salary + (SELECT overhead_per_person FROM overhead_calc)) / 160.33
  WHERE salary IS NOT NULL 
    AND is_active = true  -- Only update active employees
    AND (type = 'a-indkomst' OR type IS NULL);  -- Exclude freelancers
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a trigger function if you want automatic recalculation
-- This trigger will fire whenever salary or is_active changes
CREATE OR REPLACE FUNCTION trigger_recalculate_hourly_rates()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the main function
  PERFORM recalculate_hourly_rates();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Optional: Create trigger (uncomment if you want automatic recalculation)
-- DROP TRIGGER IF EXISTS recalculate_rates_trigger ON he_time_users;
-- CREATE TRIGGER recalculate_rates_trigger
--   AFTER INSERT OR UPDATE OF salary, is_active ON he_time_users
--   FOR EACH ROW
--   EXECUTE FUNCTION trigger_recalculate_hourly_rates();

-- If the function body is used directly in a trigger (without CREATE FUNCTION wrapper),
-- use this version instead:
/*
BEGIN
  WITH config AS (
    SELECT AVG(break_even_point) as target_cost 
    FROM finance_roadmap_2026 
    WHERE break_even_point > 0
  ),
  staff_stats AS (
    SELECT 
      SUM(salary) as total_salary, 
      COUNT(*) as staff_count 
    FROM he_time_users 
    WHERE salary > 0 
      AND is_active = true  -- Only count active employees
      AND (type = 'a-indkomst' OR type IS NULL)  -- Exclude freelancers
  ),
  overhead_calc AS (
    SELECT 
      CASE 
        WHEN staff_count > 0 THEN 
          ((SELECT target_cost FROM config) - total_salary) / staff_count
        ELSE 0
      END as overhead_per_person
    FROM staff_stats
  )
  UPDATE he_time_users
  SET hourly_rate = (salary + (SELECT overhead_per_person FROM overhead_calc)) / 160.33
  WHERE salary IS NOT NULL 
    AND is_active = true  -- Only update active employees
    AND (type = 'a-indkomst' OR type IS NULL);  -- Exclude freelancers
  
  RETURN NULL;
END;
*/

