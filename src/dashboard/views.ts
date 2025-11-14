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
        .metric-card {
            cursor: pointer;
        }
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            z-index: 1000;
            overflow-y: auto;
            padding: 2rem;
        }
        .modal.active {
            display: flex;
            align-items: flex-start;
            justify-content: center;
        }
        .modal-content {
            background: white;
            border-radius: 12px;
            max-width: 1200px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            margin: 2rem 0;
        }
        .modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 12px 12px 0 0;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .modal-header h2 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        .modal-header .close-btn {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 1.5rem;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        .modal-header .close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        .modal-body {
            padding: 2rem;
        }
        .detail-section {
            margin-bottom: 2rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-section:last-child {
            border-bottom: none;
        }
        .detail-section h3 {
            color: #667eea;
            font-size: 1.3rem;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        .detail-item {
            background: #f9fafb;
            padding: 1rem;
            border-radius: 6px;
        }
        .detail-item label {
            display: block;
            font-size: 0.85rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.5rem;
        }
        .detail-item .value {
            color: #333;
            font-weight: 500;
            font-size: 1rem;
        }
        .code-block {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 1rem;
            border-radius: 6px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.9rem;
            overflow-x: auto;
            margin-top: 0.5rem;
        }
        .list-items {
            list-style: none;
            padding: 0;
        }
        .list-items li {
            background: #f9fafb;
            padding: 0.75rem;
            border-radius: 6px;
            margin-bottom: 0.5rem;
            border-left: 3px solid #667eea;
        }
        .badge-group {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-top: 0.5rem;
        }
        .badge {
            background: #667eea;
            color: white;
            padding: 0.35rem 0.75rem;
            border-radius: 4px;
            font-size: 0.85rem;
            font-weight: 500;
        }
        .badge.success { background: #10b981; }
        .badge.warning { background: #f59e0b; }
        .badge.info { background: #3b82f6; }
        .badge.secondary { background: #6b7280; }
        .threshold-item {
            background: #f9fafb;
            padding: 1rem;
            border-radius: 6px;
            margin-bottom: 0.75rem;
            border-left: 4px solid #667eea;
        }
        .threshold-item.critical { border-left-color: #ef4444; }
        .threshold-item.warning { border-left-color: #f59e0b; }
        .threshold-item.info { border-left-color: #3b82f6; }
        .relationship-card {
            background: #f9fafb;
            padding: 1rem;
            border-radius: 6px;
            margin-bottom: 0.75rem;
        }
        .relationship-card strong {
            color: #667eea;
            display: block;
            margin-bottom: 0.25rem;
        }
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .form-group label {
            font-weight: 500;
            font-size: 0.9rem;
            color: #333;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 1rem;
            font-family: inherit;
        }
        .form-group textarea {
            min-height: 100px;
            resize: vertical;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .form-actions {
            display: flex;
            gap: 1rem;
            margin-top: 2rem;
            justify-content: flex-end;
        }
        .btn-success {
            background: #10b981;
            color: white;
        }
        .btn-success:hover {
            background: #059669;
        }
        .btn-danger {
            background: #ef4444;
            color: white;
        }
        .btn-danger:hover {
            background: #dc2626;
        }
        .btn-small {
            padding: 0.5rem 1rem;
            font-size: 0.9rem;
        }
        .action-buttons {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.75rem;
            padding-top: 0.75rem;
            border-top: 1px solid #e2e8f0;
        }
        .toast {
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 2000;
            display: none;
            align-items: center;
            gap: 0.75rem;
            animation: slideIn 0.3s ease;
        }
        .toast.show {
            display: flex;
        }
        .toast.success {
            border-left: 4px solid #10b981;
        }
        .toast.error {
            border-left: 4px solid #ef4444;
        }
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        .required::after {
            content: ' *';
            color: #ef4444;
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
    
    <!-- Toast Notification -->
    <div class="toast" id="toast">
        <span id="toastMessage"></span>
    </div>

    <!-- Metric Detail Modal -->
    <div class="modal" id="metricModal">
        <div class="modal-content">
            <div class="modal-header">
                <button class="close-btn" onclick="closeMetricDetail()">&times;</button>
                <h2 id="modalMetricName">Metric Name</h2>
                <div class="id" id="modalMetricId">ID: METRIC-XXX</div>
            </div>
            <div class="modal-body" id="modalMetricBody">
                <!-- Content will be dynamically populated -->
            </div>
        </div>
    </div>

    <!-- Import Modal -->
    <div class="modal" id="importModal">
        <div class="modal-content">
            <div class="modal-header">
                <button class="close-btn" onclick="closeImportModal()">&times;</button>
                <h2>Import Metrics</h2>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Select Import Method</label>
                    <select id="importMethod" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem;">
                        <option value="file">Upload JSON/YAML File</option>
                        <option value="paste">Paste JSON/YAML Content</option>
                    </select>
                </div>

                <div id="fileImportSection" style="margin-top: 1.5rem;">
                    <div class="form-group">
                        <label>Choose File</label>
                        <input type="file" id="importFile" accept=".json,.yaml,.yml" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px;">
                    </div>
                    <div style="margin-top: 1rem; padding: 1rem; background: #f9fafb; border-radius: 6px; font-size: 0.9rem; color: #666;">
                        <strong>Supported formats:</strong>
                        <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
                            <li>JSON file with array of metrics</li>
                            <li>JSON file with catalog structure (metrics array inside)</li>
                            <li>YAML file with metrics</li>
                        </ul>
                    </div>
                </div>

                <div id="pasteImportSection" style="margin-top: 1.5rem; display: none;">
                    <div class="form-group">
                        <label>Paste JSON/YAML Content</label>
                        <textarea id="importContent" rows="15" placeholder="Paste your JSON or YAML content here..." style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-family: monospace; font-size: 0.9rem;"></textarea>
                    </div>
                </div>

                <div class="form-group" style="margin-top: 1.5rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="importMerge" checked>
                        <span>Merge with existing metrics (uncheck to replace all)</span>
                    </label>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeImportModal()">Cancel</button>
                    <button type="button" class="btn btn-success" onclick="performImport()">Import Metrics</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Add/Edit Metric Form Modal -->
    <div class="modal" id="formModal">
        <div class="modal-content">
            <div class="modal-header">
                <button class="close-btn" onclick="closeFormModal()">&times;</button>
                <h2 id="formModalTitle">Add New Metric</h2>
            </div>
            <div class="modal-body">
                <form id="metricForm">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="required">Metric ID</label>
                            <input type="text" id="form_metric_id" name="metric_id" required placeholder="METRIC-XXX-XXX">
                        </div>
                        <div class="form-group">
                            <label class="required">Name</label>
                            <input type="text" id="form_name" name="name" required placeholder="Metric name">
                        </div>
                        <div class="form-group">
                            <label>Short Name</label>
                            <input type="text" id="form_short_name" name="short_name" placeholder="metric_short_name">
                        </div>
                        <div class="form-group">
                            <label class="required">Category</label>
                            <select id="form_category" name="category" required>
                                <option value="">Select category...</option>
                                <option value="KPI">KPI</option>
                                <option value="Operational">Operational</option>
                                <option value="Financial">Financial</option>
                                <option value="Quality">Quality</option>
                                <option value="Performance">Performance</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="required">Tier</label>
                            <select id="form_tier" name="tier" required>
                                <option value="">Select tier...</option>
                                <option value="Tier-1">Tier-1</option>
                                <option value="Tier-2">Tier-2</option>
                                <option value="Tier-3">Tier-3</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="required">Business Domain</label>
                            <input type="text" id="form_business_domain" name="business_domain" required placeholder="e.g., Digital Experience">
                        </div>
                        <div class="form-group">
                            <label class="required">Metric Type</label>
                            <select id="form_metric_type" name="metric_type" required>
                                <option value="">Select type...</option>
                                <option value="leading">Leading</option>
                                <option value="lagging">Lagging</option>
                                <option value="operational">Operational</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Tags (comma-separated)</label>
                            <input type="text" id="form_tags" name="tags" placeholder="tag1, tag2, tag3">
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-top: 1rem;">
                        <label class="required">Description</label>
                        <textarea id="form_description" name="description" required placeholder="Detailed description of the metric..."></textarea>
                    </div>

                    <div class="detail-section">
                        <h3>Definition</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Formula</label>
                                <input type="text" id="form_formula" name="formula" placeholder="numerator / denominator">
                            </div>
                            <div class="form-group">
                                <label>Unit</label>
                                <input type="text" id="form_unit" name="unit" placeholder="e.g., %, count, ms">
                            </div>
                            <div class="form-group">
                                <label>Expected Direction</label>
                                <select id="form_expected_direction" name="expected_direction">
                                    <option value="">Select direction...</option>
                                    <option value="increase">Increase</option>
                                    <option value="decrease">Decrease</option>
                                    <option value="stable">Stable</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Calculation Frequency</label>
                                <input type="text" id="form_calculation_frequency" name="calculation_frequency" placeholder="e.g., daily, hourly">
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>Governance</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Owner Team</label>
                                <input type="text" id="form_owner_team" name="owner_team" placeholder="e.g., data_engineering">
                            </div>
                            <div class="form-group">
                                <label>Technical Owner</label>
                                <input type="text" id="form_technical_owner" name="technical_owner" placeholder="e.g., john.doe">
                            </div>
                            <div class="form-group">
                                <label>Business Owner</label>
                                <input type="text" id="form_business_owner" name="business_owner" placeholder="e.g., jane.smith">
                            </div>
                            <div class="form-group">
                                <label>Status</label>
                                <select id="form_status" name="status">
                                    <option value="active">Active</option>
                                    <option value="draft">Draft</option>
                                    <option value="deprecated">Deprecated</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeFormModal()">Cancel</button>
                        <button type="submit" class="btn btn-success">Save Metric</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="container">
        <div class="stats-grid" id="statsGrid">
            <div class="stat-card">
                <h3>Total Metrics</h3>
                <div class="value" id="totalMetrics">0</div>
            </div>
            <div class="stat-card">
                <h3>Objectives</h3>
                <div class="value" id="totalObjectives">0</div>
            </div>
            <div class="stat-card">
                <h3>Business Domains</h3>
                <div class="value" id="totalDomains">0</div>
            </div>
            <div class="stat-card">
                <h3>Owner Teams</h3>
                <div class="value" id="totalOwners">0</div>
            </div>
        </div>

        <div class="section">
            <h2>Business Domains</h2>
            <div id="domainsGrid" class="stats-grid"></div>
        </div>

        <div class="section">
            <h2>Objectives & Key Results</h2>
            <div id="objectivesGrid" class="metric-grid"></div>
        </div>

        <div class="section">
            <h2>Metrics by Business Domain</h2>
            <div class="chart-container" id="domainChart"></div>
        </div>

        <div class="section">
            <h2>Metrics by Tier</h2>
            <div class="chart-container" id="tierChart"></div>
        </div>

        <div class="section">
            <h2>All Metrics</h2>
            <div class="controls">
                <input type="text" id="searchInput" placeholder="Search metrics..." style="flex: 1; max-width: 400px;">
                <select id="categoryFilter">
                    <option value="">All Categories</option>
                </select>
                <button class="btn btn-success" onclick="openAddMetricForm()">+ Add Metric</button>
                <button class="btn btn-secondary" onclick="openImportModal()">📥 Import</button>
                <button class="btn btn-secondary" onclick="exportMetrics()">📤 Export</button>
                <button class="btn btn-primary" onclick="refreshData()">Refresh</button>
            </div>
            <div class="metric-grid" id="metricsGrid">
                <div class="loading">Loading metrics...</div>
            </div>
        </div>
    </div>

    <script>
        let allMetrics = [];
        let allObjectives = [];
        let allDomains = [];
        let stats = {};

        async function fetchData() {
            try {
                const [metricsRes, statsRes, domainsRes, objectivesRes] = await Promise.all([
                    fetch('/api/metrics'),
                    fetch('/api/stats'),
                    fetch('/examples/sample-domains.json').catch(() => ({ json: async () => ({ domains: [] }) })),
                    fetch('/examples/sample-objectives.json').catch(() => ({ json: async () => ({ objectives: [] }) }))
                ]);
                
                const metricsData = await metricsRes.json();
                const statsData = await statsRes.json();
                const domainsData = await domainsRes.json();
                const objectivesData = await objectivesRes.json();
                
                allMetrics = metricsData.data || [];
                allDomains = domainsData.domains || [];
                allObjectives = objectivesData.objectives || [];
                stats = statsData.data || {};
                
                // Update objectives count
                stats.objectives = allObjectives.length;
                
                updateStats();
                updateCharts();
                renderDomains();
                renderMetrics();
            } catch (error) {
                console.error('Error fetching data:', error);
                document.getElementById('metricsGrid').innerHTML = 
                    '<div class="empty-state">Error loading data. Please refresh the page.</div>';
            }
        }

        function updateStats() {
            document.getElementById('totalMetrics').textContent = stats.total || 0;
            document.getElementById('totalObjectives').textContent = stats.objectives || 0;
            document.getElementById('totalDomains').textContent = Object.keys(stats.byDomain || {}).length;
            document.getElementById('totalOwners').textContent = Object.keys(stats.byOwner || {}).length;
        }

        function updateCharts() {
            renderBarChart('domainChart', stats.byBusinessDomain || {});
            renderBarChart('tierChart', stats.byTier || {});
            
            // Update category filter - extract unique categories from metrics
            const categoryFilter = document.getElementById('categoryFilter');
            categoryFilter.innerHTML = '<option value="">All Categories</option>';
            const categories = new Set(allMetrics.map(m => m.category).filter(Boolean));
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                categoryFilter.appendChild(option);
            });
            
            // Render objectives
            renderObjectives(allObjectives || []);
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
                    <div onclick="showMetricDetail('\${metric.metric_id}')" style="cursor: pointer;">
                        <h3>\${metric.name}</h3>
                        <div class="id">ID: \${metric.metric_id}</div>
                        <p>\${metric.description}</p>
                        <div class="tags">
                            <span class="tag">\${metric.tier}</span>
                            <span class="tag">\${metric.business_domain}</span>
                            <span class="tag">\${metric.metric_type}</span>
                            \${(metric.tags || []).map(tag => \`<span class="tag">\${tag}</span>\`).join('')}
                        </div>
                        \${metric.governance ? \`
                            <div class="governance-info">
                                <span><strong>Owner Team:</strong> \${metric.governance.owner_team || 'N/A'}</span>
                                <span><strong>Technical Owner:</strong> \${metric.governance.technical_owner || 'N/A'}</span>
                                <span><strong>Classification:</strong> \${metric.governance.data_classification || 'N/A'}</span>
                                <span><strong>Status:</strong> \${metric.governance.status || 'N/A'}</span>
                            </div>
                        \` : ''}
                        \${metric.definition ? \`
                            <div class="governance-info" style="border-top: 1px solid #e2e8f0; margin-top: 0.75rem; padding-top: 0.75rem;">
                                <span><strong>Formula:</strong> \${metric.definition.formula}</span>
                                <span><strong>Unit:</strong> \${metric.definition.unit}</span>
                                <span><strong>Direction:</strong> \${metric.definition.expected_direction}</span>
                            </div>
                        \` : ''}
                    </div>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); openEditMetricForm('\${metric.metric_id}')">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); deleteMetric('\${metric.metric_id}', '\${metric.name}')">Delete</button>
                    </div>
                </div>
            \`).join('');
        }

        function renderDomains() {
            const grid = document.getElementById('domainsGrid');
            
            if (allDomains.length === 0) {
                grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><p>No domains defined</p></div>';
                return;
            }

            grid.innerHTML = allDomains.map(domain => {
                const metricsInDomain = allMetrics.filter(m => m.business_domain === domain.name);
                return \`
                    <div class="stat-card" style="border-left: 4px solid \${domain.color || '#667eea'};">
                        <h3 style="color: \${domain.color || '#667eea'};">\${domain.name}</h3>
                        <div class="value">\${metricsInDomain.length}</div>
                        <p style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">\${domain.description}</p>
                        <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; font-size: 0.85rem;">
                            <div style="margin-bottom: 0.25rem;"><strong>Owner:</strong> \${domain.owner_team}</div>
                            <div style="margin-bottom: 0.25rem;"><strong>Tiers:</strong> \${domain.tier_focus.join(', ')}</div>
                            <div><strong>Areas:</strong> \${domain.key_areas.slice(0, 3).join(', ')}\${domain.key_areas.length > 3 ? '...' : ''}</div>
                        </div>
                    </div>
                \`;
            }).join('');
        }

        function renderObjectives(objectives) {
            const grid = document.getElementById('objectivesGrid');
            
            if (objectives.length === 0) {
                grid.innerHTML = '<div class="empty-state"><p>No objectives found</p></div>';
                return;
            }

            grid.innerHTML = objectives.map(obj => {
                const priorityColors = {
                    high: '#ef4444',
                    medium: '#f59e0b',
                    low: '#10b981'
                };
                const priorityColor = priorityColors[obj.priority] || '#6b7280';

                return \`
                <div class="metric-card" style="border-left: 4px solid \${priorityColor};">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h3>\${obj.name}</h3>
                            <div class="id">ID: \${obj.objective_id}</div>
                        </div>
                        <span class="badge" style="background: \${priorityColor};">\${obj.priority ? obj.priority.toUpperCase() : 'MEDIUM'}</span>
                    </div>
                    <p style="margin-top: 0.5rem;">\${obj.description}</p>
                    <div class="governance-info" style="margin-top: 0.75rem;">
                        <span><strong>Owner:</strong> \${obj.owner_team}</span>
                        <span><strong>Status:</strong> \${obj.status}</span>
                        <span><strong>Pillar:</strong> \${obj.strategic_pillar || 'N/A'}</span>
                    </div>
                    <div class="governance-info">
                        <span><strong>Start:</strong> \${obj.timeframe.start}</span>
                        <span><strong>End:</strong> \${obj.timeframe.end}</span>
                    </div>
                    \${obj.key_results && obj.key_results.length > 0 ? \`
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;">
                            <strong style="display: block; margin-bottom: 0.75rem;">Key Results (\${obj.key_results.length}):</strong>
                            \${obj.key_results.map(kr => {
                                const current = kr.current_value ?? kr.baseline_value;
                                const range = Math.abs(kr.target_value - kr.baseline_value);
                                const progress = range > 0 ? Math.min(100, Math.abs(current - kr.baseline_value) / range * 100) : 0;
                                const isOnTrack = kr.direction === 'increase' 
                                    ? current >= (kr.baseline_value + range * 0.5)
                                    : current <= (kr.baseline_value - range * 0.5);
                                const progressColor = isOnTrack ? '#10b981' : '#f59e0b';

                                return \`
                                    <div style="margin-bottom: 1rem; padding: 0.75rem; background: #f9fafb; border-radius: 6px;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                            <strong style="font-size: 0.95rem;">\${kr.name}</strong>
                                            <span class="badge \${isOnTrack ? 'success' : 'warning'}" style="font-size: 0.8rem;">
                                                \${Math.round(progress)}%
                                            </span>
                                        </div>
                                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem;">
                                            \${kr.baseline_value} \${kr.unit} → <strong>\${current} \${kr.unit}</strong> → \${kr.target_value} \${kr.unit} (\${kr.direction})
                                        </div>
                                        <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                                            <div style="width: \${progress}%; height: 100%; background: \${progressColor}; transition: width 0.3s;"></div>
                                        </div>
                                        \${kr.metric_ids && kr.metric_ids.length > 0 ? \`
                                            <div style="margin-top: 0.5rem; font-size: 0.85rem;">
                                                <span style="color: #667eea;">📊 Metrics: \${kr.metric_ids.join(', ')}</span>
                                            </div>
                                        \` : ''}
                                    </div>
                                \`;
                            }).join('')}
                        </div>
                    \` : ''}
                </div>
                \`;
            }).join('');
        }

        function refreshData() {
            fetchData();
        }

        // Metric Detail View Functions
        function showMetricDetail(metricId) {
            const metric = allMetrics.find(m => m.metric_id === metricId);
            if (!metric) return;

            document.getElementById('modalMetricName').textContent = metric.name;
            document.getElementById('modalMetricId').innerHTML = \`
                ID: \${metric.metric_id}
                <div style="float: right;">
                    <button class="btn btn-secondary btn-small" onclick="closeMetricDetail(); openEditMetricForm('\${metric.metric_id}')" style="margin-right: 0.5rem;">Edit</button>
                    <button class="btn btn-danger btn-small" onclick="closeMetricDetail(); deleteMetric('\${metric.metric_id}', '\${metric.name}')">Delete</button>
                </div>
            \`;
            
            const body = document.getElementById('modalMetricBody');
            body.innerHTML = renderMetricDetail(metric);
            
            document.getElementById('metricModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeMetricDetail() {
            document.getElementById('metricModal').classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        function renderMetricDetail(metric) {
            let html = '';

            // Basic Information
            html += \`
                <div class="detail-section">
                    <h3>📋 Basic Information</h3>
                    <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 1rem;">\${metric.description}</p>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Short Name</label>
                            <div class="value">\${metric.short_name || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <label>Category</label>
                            <div class="value">\${metric.category}</div>
                        </div>
                        <div class="detail-item">
                            <label>Tier</label>
                            <div class="value">\${metric.tier}</div>
                        </div>
                        <div class="detail-item">
                            <label>Business Domain</label>
                            <div class="value">\${metric.business_domain}</div>
                        </div>
                        <div class="detail-item">
                            <label>Metric Type</label>
                            <div class="value">\${metric.metric_type}</div>
                        </div>
                        <div class="detail-item">
                            <label>Tags</label>
                            <div class="badge-group">
                                \${(metric.tags || []).map(tag => \`<span class="badge">\${tag}</span>\`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            \`;

            // Strategic Alignment
            if (metric.alignment) {
                html += \`
                    <div class="detail-section">
                        <h3>🎯 Strategic Alignment</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Objective ID</label>
                                <div class="value">\${metric.alignment.objective_id || 'N/A'}</div>
                            </div>
                            <div class="detail-item">
                                <label>Key Result ID</label>
                                <div class="value">\${metric.alignment.key_result_id || 'N/A'}</div>
                            </div>
                            <div class="detail-item">
                                <label>Business Priority</label>
                                <div class="value">\${metric.alignment.business_priority || 'N/A'}</div>
                            </div>
                            <div class="detail-item">
                                <label>Strategic Theme</label>
                                <div class="value">\${metric.alignment.strategic_theme || 'N/A'}</div>
                            </div>
                        </div>
                        \${metric.alignment.impacted_stakeholders && metric.alignment.impacted_stakeholders.length > 0 ? \`
                            <div style="margin-top: 1rem;">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Impacted Stakeholders:</label>
                                <div class="badge-group">
                                    \${metric.alignment.impacted_stakeholders.map(s => \`<span class="badge info">\${s}</span>\`).join('')}
                                </div>
                            </div>
                        \` : ''}
                    </div>
                \`;
            }

            // Definition
            if (metric.definition) {
                html += \`
                    <div class="detail-section">
                        <h3>📐 Definition & Formula</h3>
                        <div class="detail-item">
                            <label>Formula</label>
                            <div class="code-block">\${metric.definition.formula}</div>
                        </div>
                        <div class="detail-grid" style="margin-top: 1rem;">
                            <div class="detail-item">
                                <label>Unit</label>
                                <div class="value">\${metric.definition.unit}</div>
                            </div>
                            <div class="detail-item">
                                <label>Expected Direction</label>
                                <div class="value">\${metric.definition.expected_direction}</div>
                            </div>
                            <div class="detail-item">
                                <label>Calculation Frequency</label>
                                <div class="value">\${metric.definition.calculation_frequency}</div>
                            </div>
                            <div class="detail-item">
                                <label>Aggregation Method</label>
                                <div class="value">\${metric.definition.aggregation_method || 'N/A'}</div>
                            </div>
                        </div>
                        \${metric.definition.business_logic ? \`
                            <div style="margin-top: 1rem;">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Business Logic:</label>
                                <p style="background: #f9fafb; padding: 1rem; border-radius: 6px; line-height: 1.6;">\${metric.definition.business_logic}</p>
                            </div>
                        \` : ''}
                    </div>
                \`;
            }

            // Data Sources
            if (metric.data) {
                html += \`
                    <div class="detail-section">
                        <h3>💾 Data Sources & Quality</h3>
                \`;
                
                if (metric.data.sources && metric.data.sources.length > 0) {
                    html += \`
                        <label style="display: block; margin-bottom: 0.75rem; font-weight: 500;">Data Sources:</label>
                        <ul class="list-items">
                            \${metric.data.sources.map(source => \`
                                <li>
                                    <strong>\${source.name}</strong> (\${source.type})
                                    \${source.table_name ? \`<br/><span style="font-family: monospace; font-size: 0.9rem;">\${source.table_name}</span>\` : ''}
                                    \${source.refresh_schedule ? \`<br/><span style="font-size: 0.9rem; color: #666;">Refresh: \${source.refresh_schedule}</span>\` : ''}
                                </li>
                            \`).join('')}
                        </ul>
                    \`;
                }

                html += \`
                    <div class="detail-grid" style="margin-top: 1rem;">
                        <div class="detail-item">
                            <label>Data Quality SLA</label>
                            <div class="value">\${metric.data.data_quality_sla || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <label>Historical Retention</label>
                            <div class="value">\${metric.data.historical_data_retention || 'N/A'}</div>
                        </div>
                    </div>
                    </div>
                \`;
            }

            // Governance
            if (metric.governance) {
                html += \`
                    <div class="detail-section">
                        <h3>🛡️ Governance & Ownership</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Owner Team</label>
                                <div class="value">\${metric.governance.owner_team}</div>
                            </div>
                            <div class="detail-item">
                                <label>Technical Owner</label>
                                <div class="value">\${metric.governance.technical_owner}</div>
                            </div>
                            <div class="detail-item">
                                <label>Business Owner</label>
                                <div class="value">\${metric.governance.business_owner || 'N/A'}</div>
                            </div>
                            <div class="detail-item">
                                <label>Status</label>
                                <div class="value"><span class="badge success">\${metric.governance.status}</span></div>
                            </div>
                            <div class="detail-item">
                                <label>Data Classification</label>
                                <div class="value">\${metric.governance.data_classification}</div>
                            </div>
                            <div class="detail-item">
                                <label>Approval Required</label>
                                <div class="value">\${metric.governance.approval_required ? 'Yes' : 'No'}</div>
                            </div>
                        </div>
                        \${metric.governance.change_log && metric.governance.change_log.length > 0 ? \`
                            <div style="margin-top: 1rem;">
                                <label style="display: block; margin-bottom: 0.75rem; font-weight: 500;">Change History:</label>
                                <ul class="list-items">
                                    \${metric.governance.change_log.slice(0, 5).map(change => \`
                                        <li>
                                            <strong>\${change.date}</strong> - \${change.author}<br/>
                                            <span style="font-size: 0.9rem;">\${change.description}</span>
                                        </li>
                                    \`).join('')}
                                </ul>
                            </div>
                        \` : ''}
                    </div>
                \`;
            }

            // Dimensions
            if (metric.dimensions && metric.dimensions.length > 0) {
                html += \`
                    <div class="detail-section">
                        <h3>📊 Dimensions</h3>
                        <ul class="list-items">
                            \${metric.dimensions.map(dim => \`
                                <li>
                                    <strong>\${dim.name}</strong>
                                    \${dim.values && dim.values.length > 0 ? \`
                                        <br/><span style="font-size: 0.9rem;">Values: \${dim.values.join(', ')}</span>
                                    \` : ''}
                                    \${dim.hierarchy_level ? \`<br/><span style="font-size: 0.85rem; color: #666;">Hierarchy Level: \${dim.hierarchy_level}</span>\` : ''}
                                </li>
                            \`).join('')}
                        </ul>
                    </div>
                \`;
            }

            // Targets and Alerts
            if (metric.targets_and_alerts) {
                html += \`
                    <div class="detail-section">
                        <h3>🎯 Targets & Alerts</h3>
                \`;

                if (metric.targets_and_alerts.thresholds && metric.targets_and_alerts.thresholds.length > 0) {
                    html += \`
                        <label style="display: block; margin-bottom: 0.75rem; font-weight: 500;">Thresholds:</label>
                        \${metric.targets_and_alerts.thresholds.map(threshold => \`
                            <div class="threshold-item \${threshold.severity}">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <strong>\${threshold.name}</strong>
                                    <span class="badge \${threshold.severity}">\${threshold.severity.toUpperCase()}</span>
                                </div>
                                <div style="margin-top: 0.5rem; font-size: 0.9rem;">
                                    Condition: <code>\${threshold.condition}</code><br/>
                                    Value: \${threshold.value} \${metric.definition?.unit || ''}
                                </div>
                            </div>
                        \`).join('')}
                    \`;
                }

                if (metric.targets_and_alerts.alert_rules && metric.targets_and_alerts.alert_rules.length > 0) {
                    html += \`
                        <label style="display: block; margin-bottom: 0.75rem; margin-top: 1rem; font-weight: 500;">Alert Rules:</label>
                        <ul class="list-items">
                            \${metric.targets_and_alerts.alert_rules.map(rule => \`
                                <li>
                                    <strong>\${rule.name}</strong><br/>
                                    <span style="font-size: 0.9rem;">Notify: \${rule.notification_channels.join(', ')}</span>
                                </li>
                            \`).join('')}
                        </ul>
                    \`;
                }

                html += \`</div>\`;
            }

            // Visualization
            if (metric.visualization) {
                html += \`
                    <div class="detail-section">
                        <h3>📈 Visualization</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Preferred Chart Type</label>
                                <div class="value">\${metric.visualization.preferred_chart_type}</div>
                            </div>
                            <div class="detail-item">
                                <label>Default Time Range</label>
                                <div class="value">\${metric.visualization.default_time_range || 'N/A'}</div>
                            </div>
                        </div>
                        \${metric.visualization.dashboard_locations && metric.visualization.dashboard_locations.length > 0 ? \`
                            <div style="margin-top: 1rem;">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Dashboard Locations:</label>
                                <div class="badge-group">
                                    \${metric.visualization.dashboard_locations.map(loc => \`<span class="badge secondary">\${loc}</span>\`).join('')}
                                </div>
                            </div>
                        \` : ''}
                    </div>
                \`;
            }

            // Relationships
            if (metric.relationships) {
                html += \`
                    <div class="detail-section">
                        <h3>🔗 Relationships</h3>
                \`;

                if (metric.relationships.parent_metrics && metric.relationships.parent_metrics.length > 0) {
                    html += \`
                        <div class="relationship-card">
                            <strong>Parent Metrics:</strong>
                            <div class="badge-group" style="margin-top: 0.5rem;">
                                \${metric.relationships.parent_metrics.map(id => \`<span class="badge">\${id}</span>\`).join('')}
                            </div>
                        </div>
                    \`;
                }

                if (metric.relationships.child_metrics && metric.relationships.child_metrics.length > 0) {
                    html += \`
                        <div class="relationship-card">
                            <strong>Child Metrics:</strong>
                            <div class="badge-group" style="margin-top: 0.5rem;">
                                \${metric.relationships.child_metrics.map(id => \`<span class="badge">\${id}</span>\`).join('')}
                            </div>
                        </div>
                    \`;
                }

                if (metric.relationships.related_metrics && metric.relationships.related_metrics.length > 0) {
                    html += \`
                        <div class="relationship-card">
                            <strong>Related Metrics:</strong>
                            <div class="badge-group" style="margin-top: 0.5rem;">
                                \${metric.relationships.related_metrics.map(id => \`<span class="badge info">\${id}</span>\`).join('')}
                            </div>
                        </div>
                    \`;
                }

                html += \`</div>\`;
            }

            // Operational Usage
            if (metric.operational_usage) {
                html += \`
                    <div class="detail-section">
                        <h3>⚙️ Operational Usage</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>API Endpoint</label>
                                <div class="value" style="font-family: monospace; font-size: 0.9rem;">\${metric.operational_usage.api_endpoint || 'N/A'}</div>
                            </div>
                            <div class="detail-item">
                                <label>Automation Enabled</label>
                                <div class="value">\${metric.operational_usage.automation_enabled ? 'Yes' : 'No'}</div>
                            </div>
                        </div>
                        \${metric.operational_usage.example_queries && metric.operational_usage.example_queries.length > 0 ? \`
                            <div style="margin-top: 1rem;">
                                <label style="display: block; margin-bottom: 0.75rem; font-weight: 500;">Example Queries:</label>
                                \${metric.operational_usage.example_queries.map(query => \`
                                    <div style="margin-bottom: 1rem;">
                                        <strong style="display: block; margin-bottom: 0.5rem;">\${query.name}</strong>
                                        <div class="code-block">\${query.query}</div>
                                        \${query.description ? \`<p style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">\${query.description}</p>\` : ''}
                                    </div>
                                \`).join('')}
                            </div>
                        \` : ''}
                    </div>
                \`;
            }

            // Metadata
            if (metric.metadata) {
                html += \`
                    <div class="detail-section">
                        <h3>📝 Metadata</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Created At</label>
                                <div class="value">\${new Date(metric.metadata.created_at).toLocaleString()}</div>
                            </div>
                            <div class="detail-item">
                                <label>Created By</label>
                                <div class="value">\${metric.metadata.created_by}</div>
                            </div>
                            <div class="detail-item">
                                <label>Last Updated</label>
                                <div class="value">\${new Date(metric.metadata.last_updated).toLocaleString()}</div>
                            </div>
                            <div class="detail-item">
                                <label>Last Updated By</label>
                                <div class="value">\${metric.metadata.last_updated_by}</div>
                            </div>
                            <div class="detail-item">
                                <label>Version</label>
                                <div class="value">\${metric.metadata.version}</div>
                            </div>
                        </div>
                        \${metric.metadata.documentation_url ? \`
                            <div style="margin-top: 1rem;">
                                <a href="\${metric.metadata.documentation_url}" target="_blank" class="btn btn-primary">
                                    View Full Documentation →
                                </a>
                            </div>
                        \` : ''}
                    </div>
                \`;
            }

            return html;
        }

        // Import/Export Functions
        function openImportModal() {
            document.getElementById('importModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeImportModal() {
            document.getElementById('importModal').classList.remove('active');
            document.body.style.overflow = 'auto';
            document.getElementById('importFile').value = '';
            document.getElementById('importContent').value = '';
            document.getElementById('importMerge').checked = true;
        }

        // Toggle import method
        document.addEventListener('DOMContentLoaded', function() {
            const importMethod = document.getElementById('importMethod');
            if (importMethod) {
                importMethod.addEventListener('change', function() {
                    const fileSection = document.getElementById('fileImportSection');
                    const pasteSection = document.getElementById('pasteImportSection');
                    
                    if (this.value === 'file') {
                        fileSection.style.display = 'block';
                        pasteSection.style.display = 'none';
                    } else {
                        fileSection.style.display = 'none';
                        pasteSection.style.display = 'block';
                    }
                });
            }
        });

        async function performImport() {
            const method = document.getElementById('importMethod').value;
            const merge = document.getElementById('importMerge').checked;
            let content = '';

            try {
                if (method === 'file') {
                    const fileInput = document.getElementById('importFile');
                    if (!fileInput.files || !fileInput.files[0]) {
                        showToast('Please select a file to import', 'error');
                        return;
                    }
                    
                    const file = fileInput.files[0];
                    content = await file.text();
                } else {
                    content = document.getElementById('importContent').value.trim();
                    if (!content) {
                        showToast('Please paste content to import', 'error');
                        return;
                    }
                }

                // Parse content (try JSON first, then YAML)
                let data;
                try {
                    data = JSON.parse(content);
                } catch (e) {
                    // If JSON parsing fails, try to parse as YAML (simple conversion)
                    showToast('YAML parsing not fully supported in browser. Please use JSON format or convert to JSON first.', 'error');
                    return;
                }

                // Extract metrics array
                let metrics = [];
                if (Array.isArray(data)) {
                    metrics = data;
                } else if (data.metrics && Array.isArray(data.metrics)) {
                    metrics = data.metrics;
                } else if (data.data && Array.isArray(data.data.metrics)) {
                    metrics = data.data.metrics;
                } else {
                    showToast('Invalid format. Expected array of metrics or catalog structure.', 'error');
                    return;
                }

                if (metrics.length === 0) {
                    showToast('No metrics found in the imported data', 'error');
                    return;
                }

                // Import metrics
                let successCount = 0;
                let errorCount = 0;
                const errors = [];

                for (const metric of metrics) {
                    try {
                        // Check if metric exists
                        const exists = allMetrics.some(m => m.metric_id === metric.metric_id);
                        
                        if (exists && merge) {
                            // Update existing metric
                            const response = await fetch(\`/api/metrics/\${metric.metric_id}\`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(metric)
                            });
                            
                            const result = await response.json();
                            if (result.success) {
                                successCount++;
                            } else {
                                errorCount++;
                                errors.push(\`\${metric.metric_id}: \${result.error}\`);
                            }
                        } else if (!exists) {
                            // Create new metric
                            const response = await fetch('/api/metrics', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(metric)
                            });
                            
                            const result = await response.json();
                            if (result.success) {
                                successCount++;
                            } else {
                                errorCount++;
                                errors.push(\`\${metric.metric_id}: \${result.error}\`);
                            }
                        }
                    } catch (error) {
                        errorCount++;
                        errors.push(\`\${metric.metric_id}: \${error.message}\`);
                    }
                }

                // Show results
                if (errorCount === 0) {
                    showToast(\`Successfully imported \${successCount} metrics!\`, 'success');
                } else {
                    showToast(\`Imported \${successCount} metrics with \${errorCount} errors. Check console for details.\`, 'error');
                    console.error('Import errors:', errors);
                }

                closeImportModal();
                await fetchData();
            } catch (error) {
                showToast(\`Import error: \${error.message}\`, 'error');
            }
        }

        function exportMetrics() {
            const format = prompt('Export format: Enter "json" or "yaml" (json is recommended)', 'json');
            
            if (!format || (format !== 'json' && format !== 'yaml')) {
                if (format !== null) {
                    showToast('Invalid format. Please choose json or yaml.', 'error');
                }
                return;
            }

            // Create catalog structure with all metrics
            const catalog = {
                version: '1.0.0',
                last_updated: new Date().toISOString(),
                objectives: [],
                metrics: allMetrics
            };

            let content, filename, mimeType;

            if (format === 'json') {
                content = JSON.stringify(catalog, null, 2);
                filename = \`mdl-metrics-export-\${new Date().toISOString().split('T')[0]}.json\`;
                mimeType = 'application/json';
            } else {
                // Simple YAML conversion (for basic structure)
                content = convertToYAML(catalog);
                filename = \`mdl-metrics-export-\${new Date().toISOString().split('T')[0]}.yaml\`;
                mimeType = 'text/yaml';
            }

            // Create download link
            const blob = new Blob([content], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            showToast(\`Exported \${allMetrics.length} metrics as \${format.toUpperCase()}\`, 'success');
        }

        // Simple YAML converter (basic implementation)
        function convertToYAML(obj, indent = 0) {
            const spaces = '  '.repeat(indent);
            let yaml = '';

            for (const [key, value] of Object.entries(obj)) {
                if (value === null || value === undefined) {
                    yaml += \`\${spaces}\${key}: null\\n\`;
                } else if (Array.isArray(value)) {
                    yaml += \`\${spaces}\${key}:\\n\`;
                    if (value.length === 0) {
                        yaml += \`\${spaces}  []\\n\`;
                    } else {
                        value.forEach(item => {
                            if (typeof item === 'object' && item !== null) {
                                yaml += \`\${spaces}  -\\n\`;
                                yaml += convertToYAML(item, indent + 2).split('\\n').map(line => 
                                    line ? \`\${spaces}  \${line}\` : ''
                                ).join('\\n');
                            } else {
                                yaml += \`\${spaces}  - \${item}\\n\`;
                            }
                        });
                    }
                } else if (typeof value === 'object') {
                    yaml += \`\${spaces}\${key}:\\n\`;
                    yaml += convertToYAML(value, indent + 1);
                } else if (typeof value === 'string' && (value.includes(':') || value.includes('\\n') || value.includes('#'))) {
                    yaml += \`\${spaces}\${key}: "\${value.replace(/"/g, '\\\\"')}"\\n\`;
                } else {
                    yaml += \`\${spaces}\${key}: \${value}\\n\`;
                }
            }

            return yaml;
        }

        // Form Modal Functions
        let isEditMode = false;
        let editingMetricId = null;

        function openAddMetricForm() {
            isEditMode = false;
            editingMetricId = null;
            document.getElementById('formModalTitle').textContent = 'Add New Metric';
            document.getElementById('metricForm').reset();
            document.getElementById('form_metric_id').disabled = false;
            document.getElementById('form_status').value = 'active';
            document.getElementById('formModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function openEditMetricForm(metricId) {
            const metric = allMetrics.find(m => m.metric_id === metricId);
            if (!metric) return;

            isEditMode = true;
            editingMetricId = metricId;
            document.getElementById('formModalTitle').textContent = 'Edit Metric';
            
            // Populate form fields
            document.getElementById('form_metric_id').value = metric.metric_id;
            document.getElementById('form_metric_id').disabled = true;
            document.getElementById('form_name').value = metric.name;
            document.getElementById('form_short_name').value = metric.short_name || '';
            document.getElementById('form_category').value = metric.category || '';
            document.getElementById('form_tier').value = metric.tier;
            document.getElementById('form_business_domain').value = metric.business_domain;
            document.getElementById('form_metric_type').value = metric.metric_type;
            document.getElementById('form_tags').value = (metric.tags || []).join(', ');
            document.getElementById('form_description').value = metric.description;
            
            // Definition fields
            if (metric.definition) {
                document.getElementById('form_formula').value = metric.definition.formula || '';
                document.getElementById('form_unit').value = metric.definition.unit || '';
                document.getElementById('form_expected_direction').value = metric.definition.expected_direction || '';
                document.getElementById('form_calculation_frequency').value = metric.definition.calculation_frequency || '';
            }
            
            // Governance fields
            if (metric.governance) {
                document.getElementById('form_owner_team').value = metric.governance.owner_team || '';
                document.getElementById('form_technical_owner').value = metric.governance.technical_owner || '';
                document.getElementById('form_business_owner').value = metric.governance.business_owner || '';
                document.getElementById('form_status').value = metric.governance.status || 'active';
            }

            document.getElementById('formModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeFormModal() {
            document.getElementById('formModal').classList.remove('active');
            document.body.style.overflow = 'auto';
            document.getElementById('metricForm').reset();
            isEditMode = false;
            editingMetricId = null;
        }

        // Toast notification
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            const toastMessage = document.getElementById('toastMessage');
            
            toastMessage.textContent = message;
            toast.className = \`toast show \${type}\`;
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        // Form submission
        document.getElementById('metricForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const metricData = {
                metric_id: formData.get('metric_id'),
                name: formData.get('name'),
                short_name: formData.get('short_name'),
                description: formData.get('description'),
                category: formData.get('category'),
                tier: formData.get('tier'),
                business_domain: formData.get('business_domain'),
                metric_type: formData.get('metric_type'),
                tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()).filter(Boolean) : [],
                definition: {
                    formula: formData.get('formula') || undefined,
                    unit: formData.get('unit') || undefined,
                    expected_direction: formData.get('expected_direction') || undefined,
                    calculation_frequency: formData.get('calculation_frequency') || undefined
                },
                governance: {
                    owner_team: formData.get('owner_team') || undefined,
                    technical_owner: formData.get('technical_owner') || undefined,
                    business_owner: formData.get('business_owner') || undefined,
                    status: formData.get('status') || 'active',
                    data_classification: 'internal',
                    approval_required: false
                },
                metadata: {
                    created_at: new Date().toISOString(),
                    created_by: 'dashboard_user',
                    last_updated: new Date().toISOString(),
                    last_updated_by: 'dashboard_user',
                    version: '1.0.0'
                }
            };

            try {
                let response;
                if (isEditMode) {
                    response = await fetch(\`/api/metrics/\${editingMetricId}\`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(metricData)
                    });
                } else {
                    response = await fetch('/api/metrics', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(metricData)
                    });
                }

                const result = await response.json();
                
                if (result.success) {
                    showToast(\`Metric \${isEditMode ? 'updated' : 'created'} successfully!\`, 'success');
                    closeFormModal();
                    await fetchData();
                } else {
                    showToast(\`Error: \${result.error}\`, 'error');
                }
            } catch (error) {
                showToast(\`Error: \${error.message}\`, 'error');
            }
        });

        // Delete metric
        async function deleteMetric(metricId, metricName) {
            if (!confirm(\`Are you sure you want to delete "\${metricName}"? This action cannot be undone.\`)) {
                return;
            }

            try {
                const response = await fetch(\`/api/metrics/\${metricId}\`, {
                    method: 'DELETE'
                });

                const result = await response.json();
                
                if (result.success) {
                    showToast('Metric deleted successfully!', 'success');
                    await fetchData();
                } else {
                    showToast(\`Error: \${result.error}\`, 'error');
                }
            } catch (error) {
                showToast(\`Error: \${error.message}\`, 'error');
            }
        }

        // Close modal on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeMetricDetail();
                closeFormModal();
                closeImportModal();
            }
        });

        // Close modal when clicking outside
        document.getElementById('metricModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeMetricDetail();
            }
        });

        document.getElementById('formModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeFormModal();
            }
        });

        document.getElementById('importModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeImportModal();
            }
        });

        // Event listeners
        document.getElementById('searchInput').addEventListener('input', renderMetrics);
        document.getElementById('categoryFilter').addEventListener('change', renderMetrics);

        // Initial load
        fetchData();
    </script>
</body>
</html>`;
}
