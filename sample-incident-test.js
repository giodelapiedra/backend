// Sample Incident Report Data - WITH TEAM FILTERING LOGIC
// This is what the frontend should send when creating an incident

const sampleIncidentData = {
  // Core incident data
  description: "Worker slipped on wet floor in warehouse area while carrying boxes",
  reported_by_id: "27e765a8-d935-4010-9694-38252ce86728", // Site supervisor ID
  worker_id: "cd7aa312-5b1f-4785-855a-37ecf0a66e1d", // Selected unselected worker from filtered team
  severity: "low", // Include severity to prevent "unknown" values
  incident_type: "strain_injury" // Include incident type to prevent "N/A" values
};

// Severity mapping
const severityMapping = {
  'low': 'near_miss',
  'medium': 'first_aid', 
  'high': 'medical_treatment',
  'critical': 'lost_time',
  'fatal': 'fatality'
};

const mappedSeverity = severityMapping[sampleIncidentData.severity] || 'near_miss';

// Incident type mapping
const incidentTypeMapping = {
  'slip_fall': 'slip_fall',
  'strain_injury': 'overexertion',
  'cut_laceration': 'cut_laceration',
  'burn': 'burn',
  'struck_by': 'struck_by',
  'struck_against': 'struck_against',
  'overexertion': 'overexertion',
  'crush': 'crush',
  'other': 'other'
};

const mappedIncidentType = incidentTypeMapping[sampleIncidentData.incident_type] || 'other';

// What the backend will map to (with worker_id column added)
const mappedIncidentData = {
  description: sampleIncidentData.description,
  reported_by: sampleIncidentData.reported_by_id,
  worker_id: sampleIncidentData.worker_id, // Now included after adding column to database
  severity: mappedSeverity, // Mapped from "low" to "near_miss"
  incident_type: mappedIncidentType // Mapped from "strain_injury" to "overexertion"
};
// Note: Additional fields would be added here if they exist in the database

console.log("=== SAMPLE INCIDENT DATA ===");
console.log("Frontend will send:", JSON.stringify(sampleIncidentData, null, 2));
console.log("");
console.log("Severity mapping:", sampleIncidentData.severity, "->", mappedSeverity);
console.log("Incident type mapping:", sampleIncidentData.incident_type, "->", mappedIncidentType);
console.log("");
console.log("Backend will map to:", JSON.stringify(mappedIncidentData, null, 2));
console.log("");
console.log("=== NOTIFICATION DATA ===");
console.log("Case Manager Notification:", {
  recipient_id: "case-manager-id",
  type: "case_assignment",
  title: "New Incident Reported",
  message: "A new incident has been reported and assigned to you. Case: CASE-2025-123456",
  priority: "medium",
  related_incident_id: "incident-id",
  related_case_id: "case-id",
  action_url: "http://localhost:3000/site-supervisor" // ✅ Dashboard view URL
});

console.log("Worker Notification:", {
  recipient_id: "worker-id",
  type: "case_assignment", 
  title: "Incident Case Created",
  message: "A case has been created for your incident. Case: CASE-2025-123456",
  priority: "medium",
  related_incident_id: "incident-id",
  related_case_id: "case-id",
  action_url: "http://localhost:3000/site-supervisor" // ✅ Dashboard view URL
});

console.log("");
console.log("=== AUTOMATIC CASE ID GENERATION ===");
console.log("1. Incident created with basic data");
console.log("2. Case automatically created with generated case_number");
console.log("3. Incident updated with case_id to link them together");
console.log("4. Both incident and case are now linked bidirectionally");
console.log("5. Notifications sent with case information");
console.log("");
console.log("=== TEST INSTRUCTIONS ===");
console.log("1. Run the database structure check SQL");
console.log("2. Run the RLS policies SQL");
console.log("3. Try creating an incident with this data");
console.log("4. Check console logs for any errors");
console.log("5. Notifications will include action URL: http://localhost:3000/site-supervisor (dashboard view)");
