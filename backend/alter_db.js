require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function alterTable() {
    // Note: Since standard Supabase data API doesn't support raw DDL,
    // we use a workaround by invoking a Postgres function if raw SQL execution via rpc is available.
    // If that fails, we can simply instruct the user to run it via the Supabase dashboard.
    console.log("Attempting to run SQL through RPC...");
    const { data, error } = await supabase.rpc('execute_sql', {
        query: 'ALTER TABLE device_history ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false;'
    });

    if (error) {
        console.error("RPC Error (Might need to be run in dashboard):", error.message);
        console.log("\\n\\nPlease run the following SQL command in your Supabase SQL Editor:");
        console.log("ALTER TABLE device_history ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false;");
    } else {
        console.log("Successfully altered table.", data);
    }
}

alterTable();
