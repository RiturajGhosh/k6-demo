import http from 'k6/http';
import { check, sleep } from 'k6'; // Or use standard k6 imports
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

export const options = {
  stages: [
    { duration: '10s', target: 1 },
    { duration: '10s', target: 2 },
    { duration: '10s', target: 0 },
  ],
};

export default function () {
  const res = http.get('https://test-api.k6.io/public/crocodiles/');
  check(res, { 'status was 200': (r) => r.status === 200 });
}

// Custom handleSummary to generate a stunning standalone HTML report
export function handleSummary(data) {
  // Extract key metrics safely with fallbacks
  const metrics = data.metrics;
  const totalReqs = metrics.http_reqs ? metrics.http_reqs.values.count : 0;
  const failedReqs = metrics.http_req_failed ? metrics.http_req_failed.values.passes : 0;
  const successRate = totalReqs > 0 ? (((totalReqs - failedReqs) / totalReqs) * 100).toFixed(2) : 100;
  
  const avgDuration = metrics.http_req_duration ? metrics.http_req_duration.values.avg.toFixed(2) : 0;
  const p90Duration = metrics.http_req_duration ? metrics.http_req_duration.values['p(90)'].toFixed(2) : 0;
  const p95Duration = metrics.http_req_duration ? metrics.http_req_duration.values['p(95)'].toFixed(2) : 0;
  const maxDuration = metrics.http_req_duration ? metrics.http_req_duration.values.max.toFixed(2) : 0;
  const minDuration = metrics.http_req_duration ? metrics.http_req_duration.values.min.toFixed(2) : 0;

  const dataBytesRecv = metrics.data_received ? (metrics.data_received.values.count / 1024 / 1024).toFixed(2) : 0;
  const dataBytesSent = metrics.data_sent ? (metrics.data_sent.values.count / 1024 / 1024).toFixed(2) : 0;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>k6 Performance Test Report</title>
        <!-- Tailwind CSS CDN -->
        <script src="https://cdn.tailwindcss.com"></script>
        <!-- Chart.js CDN -->
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Inter', sans-serif; }
        </style>
    </head>
    <body class="bg-slate-900 text-slate-100 min-h-screen py-10 px-4 sm:px-8">
        <div class="max-w-7xl mx-auto space-y-8">
            
            <!-- Header Section -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                <div>
                    <div class="flex items-center space-x-3">
                        <span class="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-full border border-indigo-500/30">k6 Load Test</span>
                        <span class="text-slate-400 text-sm">Generated: ${new Date().toLocaleString()}</span>
                    </div>
                    <h1 class="text-3xl font-bold tracking-tight text-white mt-2">Test Execution Report</h1>
                </div>
                <div class="mt-4 md:mt-0 flex space-x-4">
                    <div class="text-right">
                        <p class="text-xs text-slate-400">Success Rate</p>
                        <p class="text-2xl font-bold text-emerald-400">${successRate}%</p>
                    </div>
                </div>
            </div>

            <!-- Metric Cards Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div class="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
                    <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Requests</p>
                    <p class="text-3xl font-extrabold text-white mt-2">${totalReqs.toLocaleString()}</p>
                    <span class="text-xs text-slate-400 mt-1 block">Failed: <span class="text-rose-400 font-semibold">${failedReqs}</span></span>
                </div>
                <div class="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
                    <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Avg Response Time</p>
                    <p class="text-3xl font-extrabold text-indigo-400 mt-2">${avgDuration} <span class="text-sm font-normal text-slate-400">ms</span></p>
                    <span class="text-xs text-slate-400 mt-1 block">Min: ${minDuration} ms</span>
                </div>
                <div class="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
                    <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">95th Percentile (p95)</p>
                    <p class="text-3xl font-extrabold text-amber-400 mt-2">${p95Duration} <span class="text-sm font-normal text-slate-400">ms</span></p>
                    <span class="text-xs text-slate-400 mt-1 block">p90: ${p90Duration} ms</span>
                </div>
                <div class="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
                    <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Network Transferred</p>
                    <p class="text-3xl font-extrabold text-cyan-400 mt-2">${dataBytesRecv} <span class="text-sm font-normal text-slate-400">MB</span></p>
                    <span class="text-xs text-slate-400 mt-1 block">Sent: ${dataBytesSent} MB</span>
                </div>
            </div>

            <!-- Charts Section -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Response Time Distribution Chart -->
                <div class="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl lg:col-span-2">
                    <h2 class="text-lg font-semibold text-white mb-4">Response Time Latencies</h2>
                    <div class="h-72 flex items-center justify-center">
                        <canvas id="latencyChart"></canvas>
                    </div>
                </div>

                <!-- Pass/Fail breakdown -->
                <div class="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col justify-between">
                    <div>
                        <h2 class="text-lg font-semibold text-white mb-2">Request Status</h2>
                        <p class="text-xs text-slate-400 mb-6">Overall breakdown of valid vs failed requests.</p>
                        <div class="h-48 flex items-center justify-center">
                            <canvas id="statusChart"></canvas>
                        </div>
                    </div>
                    <div class="mt-4 pt-4 border-t border-slate-700 flex justify-between text-sm">
                        <span class="text-slate-400">Max Latency:</span>
                        <span class="font-bold text-rose-400">${maxDuration} ms</span>
                    </div>
                </div>
            </div>

            <!-- Footer info -->
            <div class="text-center text-xs text-slate-500 pt-4">
                Powered by k6 &bull; Custom Interactive HTML Template
            </div>
        </div>

        <!-- Script to render charts using injected data -->
        <script>
            // Latency Bar Chart
            const latencyCtx = document.getElementById('latencyChart').getContext('2d');
            new Chart(latencyCtx, {
                type: 'bar',
                data: {
                    labels: ['Min', 'Average', 'P90', 'P95', 'Max'],
                    datasets: [{
                        label: 'Duration (ms)',
                        data: [${minDuration}, ${avgDuration}, ${p90Duration}, ${p95Duration}, ${maxDuration}],
                        backgroundColor: [
                            'rgba(52, 211, 153, 0.6)',
                            'rgba(129, 140, 248, 0.6)',
                            'rgba(251, 191, 36, 0.6)',
                            'rgba(244, 63, 94, 0.6)',
                            'rgba(239, 68, 68, 0.6)'
                        ],
                        borderColor: [
                            'rgb(52, 211, 153)',
                            'rgb(129, 140, 248)',
                            'rgb(251, 191, 36)',
                            'rgb(244, 63, 94)',
                            'rgb(239, 68, 68)'
                        ],
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { color: '#94a3b8' }
                        },
                        x: { 
                            grid: { display: false },
                            ticks: { color: '#94a3b8' }
                        }
                    }
                }
            });

            // Status Doughnut Chart
            const statusCtx = document.getElementById('statusChart').getContext('2d');
            new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Successful', 'Failed'],
                    datasets: [{
                        data: [${totalReqs - failedReqs}, ${failedReqs}],
                        backgroundColor: ['rgba(52, 211, 153, 0.8)', 'rgba(244, 63, 94, 0.8)'],
                        borderColor: ['rgb(52, 211, 153)', 'rgb(244, 63, 94)'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#94a3b8', boxWidth: 12 }
                        }
                    }
                }
            });
        </script>
    </body>
    </html>
  `;

  return {
    'index.html': htmlContent, // This creates index.html in your folder automatically
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}