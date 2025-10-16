SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'categories';

SELECT tgname, pg_get_triggerdef(oid) 
FROM pg_trigger 
WHERE tgrelid = 'products'::regclass;
