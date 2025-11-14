/**
 * HTML templates for the MDL dashboard
 */

export function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MDL - Metrics Definition Library Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .stat-card h3 {
            color: #667eea;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 0.5rem;
        }
        .stat-card .value {
            font-size: 2.5rem;
            font-weight: bold;
            color: #333;
        }
        .section {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        .section h2 {
            color: #667eea;
            margin-bottom: 1.5rem;
            font-size: 1.8rem;
        }
        .controls {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
        }
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
            transition: all 0.2s;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-primary:hover {
            background: #5568d3;
        }
        .btn-secondary {
            background: #e2e8f0;
            color: #333;
        }
        .btn-secondary:hover {
            background: #cbd5e0;
        }
        input, select {
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 1rem;
        }
        .metric-grid {
            display: grid;
            gap: 1rem;
        }
        .metric-card {
            background: #f9fafb;
            padding: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            transition: all 0.2s;
        }
        .metric-card:hover {
            background: #f0f4ff;
            transform: translateX(5px);
        }
        .metric-card h3 {
            color: #333;
            margin-bottom: 0.5rem;
            font-size: 1.3rem;
        }
        .metric-card .id {
            font-size: 0.85rem;
            color: #666;
            margin-bottom: 0.75rem;
            font-family: monospace;
        }
        .metric-card p {
            color: #555;
            margin-bottom: 0.75rem;
            line-height: 1.5;
        }
        .tags {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-top: 0.75rem;
        }
        .tag {
            background: #667eea;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.85rem;
        }
        .governance-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 0.5rem;
            margin-top: 0.75rem;
            padding-top: 0.75rem;
            border-top: 1px solid #e2e8f0;
            font-size: 0.9rem;
        }
        .governance-info span {
            color: #666;
        }
        .governance-info strong {
            color: #333;
        }
        .empty-state {
            text-align: center;
            padding: 3rem;
            color: #666;
        }
        .empty-state svg {
            width: 100px;
            height: 100px;
            margin-bottom: 1rem;
            opacity: 0.5;
        }
        .loading {
            text-align: center;
            padding: 2rem;
            color: #667eea;
            font-size: 1.2rem;
        }
        .chart-container {
            margin-top: 1rem;
        }
        .bar-chart {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        .bar-item {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .bar-label {
            min-width: 150px;
            font-weight: 500;
            color: #333;
        }
        .bar-container {
            flex: 1;
            height: 30px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
        }
        .bar-fill {
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            transition: width 0.5s ease;
            display: flex;
            align-items: center;
            padding: 0 0.5rem;
            color: white;
            font-size: 0.9rem;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>📊 MDL Dashboard</h1>
            <p>Metrics Definition Library - Governance & Transparency</p>
        </div>
    </div>
    
    <div class="container">
        <div class="stats-grid" id="statsGrid">
            <div class="stat-card">
                <h3>Total Metrics</h3>
                <div class="value" id="totalMetrics">0</div>
            </div>
            <div class="stat-card">
                <h3>Categories</h3>
                <div class="value" id="totalCategories">0</div>
            </div>
            <div class="stat-card">
                <h3>Data Types</h3>
                <div class="value" id="totalDataTypes">0</div>
            </div>
            <div class="stat-card">
                <h3>Owners</h3>
                <div class="value" id="totalOwners">0</div>
            </div>
        </div>

        <div class="section">
            <h2>Metrics by Category</h2>
            <div class="chart-container" id="categoryChart"></div>
        </div>

        <div class="section">
            <h2>Metrics by Data Type</h2>
            <div class="chart-container" id="dataTypeChart"></div>
        </div>

        <div class="section">
            <h2>All Metrics</h2>
            <div class="controls">
                <input type="text" id="searchInput" placeholder="Search metrics..." style="flex: 1; max-width: 400px;">
                <select id="categoryFilter">
                    <option value="">All Categories</option>
                </select>
                <button class="btn btn-primary" onclick="refreshData()">Refresh</button>
            </div>
            <div class="metric-grid" id="metricsGrid">
                <div class="loading">Loading metrics...</div>
            </div>
        </div>
    </div>

    <script>
        let allMetrics = [];
        let stats = {};

        async function fetchData() {
            try {
                const [metricsRes, statsRes] = await Promise.all([
                    fetch('/api/metrics'),
                    fetch('/api/stats')
                ]);
                
                const metricsData = await metricsRes.json();
                const statsData = await statsRes.json();
                
                allMetrics = metricsData.data || [];
                stats = statsData.data || {};
                
                updateStats();
                updateCharts();
                renderMetrics();
            } catch (error) {
                console.error('Error fetching data:', error);
                document.getElementById('metricsGrid').innerHTML = 
                    '<div class="empty-state">Error loading data. Please refresh the page.</div>';
            }
        }

        function updateStats() {
            document.getElementById('totalMetrics').textContent = stats.total || 0;
            document.getElementById('totalCategories').textContent = Object.keys(stats.byCategory || {}).length;
            document.getElementById('totalDataTypes').textContent = Object.keys(stats.byDataType || {}).length;
            document.getElementById('totalOwners').textContent = Object.keys(stats.byOwner || {}).length;
        }

        function updateCharts() {
            renderBarChart('categoryChart', stats.byCategory || {});
            renderBarChart('dataTypeChart', stats.byDataType || {});
            
            // Update category filter
            const categoryFilter = document.getElementById('categoryFilter');
            categoryFilter.innerHTML = '<option value="">All Categories</option>';
            Object.keys(stats.byCategory || {}).forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                categoryFilter.appendChild(option);
            });
        }

        function renderBarChart(containerId, data) {
            const container = document.getElementById(containerId);
            if (Object.keys(data).length === 0) {
                container.innerHTML = '<div class="empty-state">No data available</div>';
                return;
            }

            const maxValue = Math.max(...Object.values(data));
            const html = '<div class="bar-chart">' + 
                Object.entries(data).map(([label, value]) => {
                    const percentage = (value / maxValue) * 100;
                    return \`
                        <div class="bar-item">
                            <div class="bar-label">\${label}</div>
                            <div class="bar-container">
                                <div class="bar-fill" style="width: \${percentage}%">\${value}</div>
                            </div>
                        </div>
                    \`;
                }).join('') + 
                '</div>';
            
            container.innerHTML = html;
        }

        function renderMetrics() {
            const grid = document.getElementById('metricsGrid');
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const categoryFilter = document.getElementById('categoryFilter').value;
            
            let filtered = allMetrics.filter(metric => {
                const matchesSearch = !searchTerm || 
                    metric.name.toLowerCase().includes(searchTerm) ||
                    metric.description.toLowerCase().includes(searchTerm);
                const matchesCategory = !categoryFilter || metric.category === categoryFilter;
                return matchesSearch && matchesCategory;
            });

            if (filtered.length === 0) {
                grid.innerHTML = '<div class="empty-state"><p>No metrics found</p></div>';
                return;
            }

            grid.innerHTML = filtered.map(metric => \`
                <div class="metric-card">
                    <h3>\${metric.name}</h3>
                    <div class="id">ID: \${metric.id}</div>
                    <p>\${metric.description}</p>
                    <div class="tags">
                        <span class="tag">\${metric.category}</span>
                        <span class="tag">\${metric.dataType}</span>
                        \${(metric.tags || []).map(tag => \`<span class="tag">\${tag}</span>\`).join('')}
                    </div>
                    \${metric.governance ? \`
                        <div class="governance-info">
                            <span><strong>Owner:</strong> \${metric.governance.owner || 'N/A'}</span>
                            \${metric.governance.team ? \`<span><strong>Team:</strong> \${metric.governance.team}</span>\` : ''}
                            \${metric.governance.complianceLevel ? \`<span><strong>Compliance:</strong> \${metric.governance.complianceLevel}</span>\` : ''}
                        </div>
                    \` : ''}
                </div>
            \`).join('');
        }

        function refreshData() {
            fetchData();
        }

        // Event listeners
        document.getElementById('searchInput').addEventListener('input', renderMetrics);
        document.getElementById('categoryFilter').addEventListener('change', renderMetrics);

        // Initial load
        fetchData();
    </script>
</body>
</html>`;
}
