import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

export const options = {
  stages: [
    { duration: '5s', target: 5 },
    { duration: '10s', target: 10 },
    { duration: '5s', target: 0 },
  ],
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)'],
};

export default function () {
  const res = http.get('https://test-api.k6.io/public/crocodiles/');
  check(res, { 'status is 200': (r) => r.status === 200 });
  //sleep(1);
}

export function handleSummary(data) {
  const jsonString = JSON.stringify(data);

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>k6 Load Test Results</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #ffffff; color: #111827; margin: 0; padding: 40px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { text-align: center; font-size: 1.5rem; font-weight: 600; margin-bottom: 30px; color: #111827; }
        h2 { font-size: 1.25rem; font-weight: 600; text-align: center; margin-top: 40px; margin-bottom: 16px; color: #1f2937; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 0.875rem; }
        th { text-align: left; padding: 10px 12px; font-weight: 600; color: #4b5563; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb; }
        td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .grid-row { display: flex; gap: 40px; flex-wrap: wrap; }
        .grid-col { flex: 1; min-width: 300px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>k6 Load Test Report</h1>
        
        <!-- Trends Section -->
        <h2>Trends</h2>
        <table>
            <thead>
                <tr>
                    <th>metric</th>
                    <th>avg</th>
                    <th>max</th>
                    <th>med</th>
                    <th>min</th>
                    <th>p90</th>
                    <th>p95</th>
                    <th>p99</th>
                </tr>
            </thead>
            <tbody id="trends-body"></tbody>
        </table>

        <div class="grid-row">
            <!-- Counters Section -->
            <div class="grid-col">
                <h2>Counters</h2>
                <table>
                    <thead>
                        <tr>
                            <th>metric</th>
                            <th>count</th>
                            <th>rate</th>
                        </tr>
                    </thead>
                    <tbody id="counters-body"></tbody>
                </table>
            </div>

            <!-- Rates & Gauges Section -->
            <div class="grid-col">
                <h2>Rates</h2>
                <table>
                    <thead>
                        <tr>
                            <th>metric</th>
                            <th>rate</th>
                        </tr>
                    </thead>
                    <tbody id="rates-body"></tbody>
                </table>

                <h2>Gauges</h2>
                <table>
                    <thead>
                        <tr>
                            <th>metric</th>
                            <th>value</th>
                        </tr>
                    </thead>
                    <tbody id="gauges-body"></tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        const data = ${jsonString};

        // Helper formatters matching k6 text output conventions
        function formatDuration(ms) {
            if (ms === undefined || ms === null) return '-';
            if (ms >= 1000) return (ms / 1000).toFixed(0) + 's';
            if (ms >= 1) return ms.toFixed(0) + 'ms';
            if (ms >= 0.001) return (ms * 1000).toFixed(0) + 'µs';
            return ms.toFixed(0) + 'ms';
        }

        function formatBytes(bytes) {
            if (bytes === undefined || bytes === null) return '-';
            if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
            if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' kB';
            return bytes + ' B';
        }

        function formatRate(val, isData = false) {
            if (val === undefined || val === null) return '-';
            if (isData) {
                if (val >= 1024 * 1024) return (val / (1024 * 1024)).toFixed(2) + ' MB/s';
                if (val >= 1024) return (val / 1024).toFixed(1) + ' kB/s';
                return val.toFixed(0) + ' B/s';
            }
            return val.toFixed(2) + '/s';
        }

        function renderReport() {
            const metrics = data.metrics || {};

            // 1. Trends Table
            const trendKeys = [
                'http_req_blocked', 'http_req_connecting', 'http_req_duration', 
                'http_req_receiving', 'http_req_sending', 'http_req_tls_handshaking', 
                'http_req_waiting', 'iteration_duration'
            ];
            document.getElementById('trends-body').innerHTML = trendKeys.map(key => {
                const m = metrics[key]?.values;
                if (!m) return '';
                return \`<tr>
                    <td>\${key}</td>
                    <td>\${formatDuration(m.avg)}</td>
                    <td>\${formatDuration(m.max)}</td>
                    <td>\${formatDuration(m.med)}</td>
                    <td>\${formatDuration(m.min)}</td>
                    <td>\${formatDuration(m['p(90)'])}</td>
                    <td>\${formatDuration(m['p(95)'])}</td>
                    <td>\${formatDuration(m['p(99)'])}</td>
                </tr>\`;
            }).join('');

            // 2. Counters Table
            const counterKeys = ['data_received', 'data_sent', 'http_reqs', 'iterations'];
            document.getElementById('counters-body').innerHTML = counterKeys.map(key => {
                const m = metrics[key]?.values;
                if (!m) return '';
                const isData = key.includes('data');
                const countStr = isData ? formatBytes(m.count) : m.count.toLocaleString();
                const rateStr = formatRate(m.rate, isData);
                return \`<tr>
                    <td>\${key}</td>
                    <td>\${countStr}</td>
                    <td>\${rateStr}</td>
                </tr>\`;
            }).join('');

            // 3. Rates Table
            const rateKeys = ['checks', 'http_req_failed'];
            document.getElementById('rates-body').innerHTML = rateKeys.map(key => {
                const m = metrics[key]?.values;
                if (!m) return '';
                let rateVal = '0.0%';
                if (m.rate !== undefined) {
                    rateVal = (m.rate * 100).toFixed(1) + '%';
                } else if (m.passes !== undefined && (m.passes + m.fails) > 0) {
                    rateVal = ((m.passes / (m.passes + m.fails)) * 100).toFixed(1) + '%';
                }
                return \`<tr>
                    <td>\${key}</td>
                    <td>\${rateVal}</td>
                </tr>\`;
            }).join('');

            // 4. Gauges Table
            const gaugeKeys = ['vus', 'vus_max'];
            document.getElementById('gauges-body').innerHTML = gaugeKeys.map(key => {
                const m = metrics[key]?.values;
                if (!m) return '';
                return \`<tr>
                    <td>\${key}</td>
                    <td>\${m.value}</td>
                </tr>\`;
            }).join('');
        }

        window.addEventListener('DOMContentLoaded', renderReport);
    </script>
</body>
</html>`;

  return {
    'index.html': htmlContent,
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}