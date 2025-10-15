-- Function to begin transaction
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS void AS $$
BEGIN
    -- Start transaction block
    BEGIN;
END;
$$ LANGUAGE plpgsql;

-- Function to commit transaction
CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS void AS $$
BEGIN
    -- Commit transaction
    COMMIT;
END;
$$ LANGUAGE plpgsql;

-- Function to rollback transaction
CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS void AS $$
BEGIN
    -- Rollback transaction
    ROLLBACK;
END;
$$ LANGUAGE plpgsql;