-- Auto-cancel jobs when their "must arrive by" deadline passes
-- This migration creates a function and trigger to mark expired jobs as cancelled

-- Create a function that cancels expired jobs
CREATE OR REPLACE FUNCTION cancel_expired_jobs()
RETURNS void AS $$
BEGIN
  UPDATE jobs
  SET status = 'cancelled'
  WHERE status = 'open'
    AND must_arrive_by IS NOT NULL
    AND must_arrive_by < NOW()
    AND status != 'cancelled';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run when a job is created or updated
-- This checks if the job is already expired at insert time
CREATE OR REPLACE FUNCTION check_job_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.must_arrive_by IS NOT NULL AND NEW.must_arrive_by < NOW() THEN
    NEW.status = 'cancelled';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS job_expiration_trigger ON jobs;

-- Create the trigger on jobs table
CREATE TRIGGER job_expiration_trigger
BEFORE INSERT OR UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION check_job_expiration();

-- Optional: Create a scheduled job to run periodically (requires pg_cron extension)
-- This ensures expired jobs get marked as cancelled even if not updated
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('cancel_expired_jobs', '*/5 * * * *', 'SELECT cancel_expired_jobs()');
