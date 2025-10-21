// Manual Overdue Detection Trigger
// This script manually triggers the overdue detection system

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function manualOverdueDetection() {
  console.log('🔧 Manual Overdue Detection Trigger...\n');
  
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const jobId = `manual-overdue-${now.toISOString().split('T')[0]}-${currentHour}-${Date.now()}`;
    
    console.log('⏰ Current Time:', {
      utc: now.toISOString(),
      manila: now.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
      hour: currentHour
    });
    
    // Check for assignments that should be overdue
    const { data: overdueCandidates, error: candidatesError } = await supabaseAdmin
      .from('work_readiness_assignments')
      .select('id, worker_id, assigned_date, due_time, status')
      .eq('status', 'pending')
      .lt('due_time', now.toISOString());
    
    if (candidatesError) {
      console.error('❌ Error fetching overdue candidates:', candidatesError);
      return;
    }
    
    console.log(`\n📋 Found ${overdueCandidates?.length || 0} assignments that should be overdue:`);
    
    if (overdueCandidates?.length === 0) {
      console.log('✅ No assignments need to be marked as overdue.');
      return;
    }
    
    // Show details of assignments that will be marked overdue
    overdueCandidates.forEach(assignment => {
      const dueTime = new Date(assignment.due_time);
      const timeDiff = now - dueTime;
      const hoursPastDue = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutesPastDue = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      console.log(`  - ID: ${assignment.id}`);
      console.log(`    Due: ${dueTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`);
      console.log(`    Past due: ${hoursPastDue}h ${minutesPastDue}m`);
      console.log('');
    });
    
    // Mark assignments as overdue
    console.log('🔄 Marking assignments as overdue...');
    
    const { data: updatedAssignments, error: updateError } = await supabaseAdmin
      .from('work_readiness_assignments')
      .update({ 
        status: 'overdue', 
        updated_at: new Date().toISOString() 
      })
      .eq('status', 'pending')
      .lt('due_time', now.toISOString())
      .select();
    
    if (updateError) {
      console.error('❌ Error marking assignments as overdue:', updateError);
      return;
    }
    
    const markedCount = updatedAssignments?.length || 0;
    console.log(`✅ Successfully marked ${markedCount} assignments as overdue`);
    
    // Record the job completion
    const { error: jobError } = await supabaseAdmin
      .from('system_jobs')
      .insert({
        job_id: jobId,
        job_type: 'manual_overdue_detection',
        status: 'completed',
        processed_count: markedCount,
        created_at: new Date().toISOString()
      });
    
    if (jobError) {
      console.error('❌ Error recording job completion:', jobError);
    } else {
      console.log('📝 Job completion recorded in system_jobs table');
    }
    
    // Show updated assignments
    if (updatedAssignments?.length > 0) {
      console.log('\n📋 Updated Assignments:');
      updatedAssignments.forEach(assignment => {
        const dueTime = new Date(assignment.due_time);
        console.log(`  - ID: ${assignment.id}`);
        console.log(`    Due: ${dueTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`);
        console.log(`    Status: ${assignment.status}`);
        console.log(`    Updated: ${new Date(assignment.updated_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`);
        console.log('');
      });
    }
    
    console.log('\n🎉 Manual overdue detection completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in manual overdue detection:', error);
  }
}

// Run the manual trigger
manualOverdueDetection();

