import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// ==========================================
// INIT STAGE
// ==========================================
// Purpose: Load files, import modules, initialize configuration options, 
// and define test scenarios, define global variables. 
// - This runs ONCE per Virtual User (VU) before the test starts.
// - Network requests and data generation are generally not allowed here.
export const options = {
  stages: [
    { duration: '10s', target: 2 }, // Ramp up to 2 VUs
    { duration: '20s', target: 2 }, // Stay at 2 VUs
    { duration: '10s', target: 0 }, // Ramp down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must be below 500ms
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(90)', 'p(95)'],
};

console.log('--- INIT STAGE: Test configuration and global variables initialized{} ---', __VU);


// ==========================================
// SETUP STAGE
// ==========================================
// Purpose: Run initialization tasks *once* before any VUs start executing.
// - Ideal for fetching auth tokens, seeding test databases, or preparing 
//   global state.
// - Whatever this function returns is automatically passed as an argument 
//   to both the 'default' and 'teardown' stages.
// - Whatever object setup() returns must be serialized into JSON and copied brand-new to every single Virtual User, 
// so it is not a good place to store large datasets or sensitive information that should not be duplicated across VUs.
export function setup() {
  console.log('--- SETUP STAGE: Preparing test environment ---');
  
  // Example: Simulating fetching an auth token or global setup data
  const initialData = {
    authToken: 'sample-secret-token-12345',
    testStartTime: new Date().toISOString(),
  };

  return initialData;
}

// ==========================================
// DEFAULT (VU) STAGE
// ==========================================
// Purpose: The core load-testing logic executed repeatedly by each VU 
// according to the defined options/scenarios.
// - Receives the `data` object returned by the setup stage.
// - This is where you make HTTP requests, run checks, and simulate user behavior.
export default function (data) {
  // You can access the data passed from setup()
  const token = data.authToken;

  // Example HTTP GET request with headers
  const res = http.get('https://test-api.k6.io/public/crocodiles/', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  // Validate response
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response body is not empty': (r) => r.body.length > 0,
  });

  // Simulate user think-time between requests
  //sleep(1);
}

// ==========================================
// TEARDOWN STAGE
// ==========================================
// Purpose: Run cleanup tasks *once* after all VUs have finished executing.
// - Ideal for deleting test records created during setup/default, 
//   revoking tokens, or logging test completion.
// - Receives the `data` object returned by the setup stage.
export function teardown(data) {
  console.log('--- TEARDOWN STAGE: Cleaning up test data ---');
  console.log(`Test started at: ${data.testStartTime}`);
  
  // Example: Call an endpoint to clean up mock data or revoke token
  // http.post('https://test-api.k6.io/cleanup', { token: data.authToken });
}


// ==========================================
// CUSTOM HANDLE SUMMARY STAGE
// ==========================================
// Purpose: Override k6's default end-of-test output processing.
// - Executes ONCE at the absolute end of the test run.
// - Takes raw metric summary data (`data`) as input and returns an object 
//   mapping output destinations (e.g., files, stdout) to formatted content.
//
// Key Use Cases:
// 1. Exporting test results as JSON/HTML/JUnit XML reports for CI/CD pipelines.
// 2. Sending test metrics to webhook endpoints (Slack, Microsoft Teams, Datadog).
// 3. Customizing or suppressing standard terminal log output.
export function handleSummary(data) {
  console.log('--- HANDLE SUMMARY STAGE: Processing end-of-test metrics ---');

  return {
    // Use Case A: Print formatted summary to terminal (stdout)
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),

    // Use Case B: Save raw JSON metrics for auditing or custom dashboards
    'summary.json': JSON.stringify(data, null, 2),

    // Use Case C: Generate a standalone HTML report (if html Report library is used)
   // 'summary.html': htmlReport(data),
  };
}