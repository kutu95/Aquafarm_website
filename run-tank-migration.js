const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔄 Running tank component type migration...');
    
    // Since we can't run DDL directly, let's test if 'tank' is already accepted
    console.log('🔍 Testing if tank component type is already accepted...');
    
    // Try to insert a test record with tank type
    const { data: testInsert, error: testError } = await supabase
      .from('greenhouse_layout')
      .insert({
        name: 'TEST_TANK_MIGRATION',
        component_type: 'tank',
        x_position: 0,
        y_position: 0,
        width: 1,
        height: 1,
        color: '#FF5722',
        status: 'active',
        layer_order: 3,
        metadata: {}
      })
      .select();
    
    if (testError) {
      if (testError.code === '23514') {
        console.log('❌ Tank component type is NOT yet supported in the database');
        console.log('📋 You need to run this SQL migration manually in your Supabase dashboard:');
        console.log('');
        console.log('-- Drop existing constraint');
        console.log('ALTER TABLE greenhouse_layout DROP CONSTRAINT IF EXISTS greenhouse_layout_component_type_check;');
        console.log('');
        console.log('-- Add new constraint with tank support');
        console.log('ALTER TABLE greenhouse_layout ADD CONSTRAINT greenhouse_layout_component_type_check');
        console.log('CHECK (component_type IN (\'greenhouse\', \'growbed\', \'fishtank\', \'tank\', \'pump\', \'sensor\', \'pipe\', \'valve\', \'filter\', \'other\'));');
        console.log('');
        console.log('-- Update comment');
        console.log('COMMENT ON COLUMN greenhouse_layout.component_type IS \'Component type: greenhouse, growbed, fishtank, tank, pump, sensor, pipe, valve, filter, or other\';');
        console.log('');
        console.log('🔗 Go to: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/sql/new');
        console.log('📝 Copy and paste the SQL commands above');
        console.log('🚀 Then you can add tank components!');
      } else {
        console.error('❌ Unexpected error:', testError);
      }
      return;
    }
    
    console.log('✅ Tank component type is already supported!');
    
    // Clean up the test record
    console.log('🧹 Cleaning up test record...');
    const { error: deleteError } = await supabase
      .from('greenhouse_layout')
      .delete()
      .eq('name', 'TEST_TANK_MIGRATION');
    
    if (deleteError) {
      console.log('⚠️  Warning: Could not clean up test record:', deleteError);
    } else {
      console.log('✅ Test record cleaned up');
    }
    
    console.log('🎉 Tank component type is ready to use!');
    console.log('🚀 You can now add tank components to your greenhouse map!');
    
  } catch (error) {
    console.error('❌ Migration check failed:', error);
  }
}

runMigration();
