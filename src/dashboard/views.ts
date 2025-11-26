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
    <script src="https://d3js.org/d3.v7.min.js"></script>
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
        .chart-section {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .chart-section h2 {
            margin-top: 0;
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
            color: #333;
            text-align: center;
        }
        .chart-container {
            margin-top: 1rem;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        #sunburstChart {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #sunburstChart svg {
            max-width: 100%;
            height: auto;
        }
        .sunburst-tooltip {
            position: absolute;
            padding: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.2s;
        }
        .sunburst-center-text {
            text-align: center;
            font-size: 14px;
            color: #666;
            margin-top: 1rem;
        }
        .sunburst-legend {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            justify-content: center;
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e2e8f0;
        }
        .sunburst-legend-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .sunburst-legend-color {
            width: 16px;
            height: 16px;
            border-radius: 3px;
        }
        .sunburst-legend-label {
            font-size: 0.9rem;
            color: #4a5568;
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
        .key-result-item {
            background: #f9fafb;
            padding: 1rem;
            border-radius: 6px;
            margin-bottom: 1rem;
            border-left: 3px solid #667eea;
            position: relative;
        }
        .key-result-item h4 {
            margin-bottom: 0.75rem;
            color: #667eea;
            font-size: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .remove-kr-btn {
            background: #ef4444;
            color: white;
            border: none;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
        }
        .remove-kr-btn:hover {
            background: #dc2626;
        }
        .icon-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 6px;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        .icon-btn:hover {
            background: rgba(0, 0, 0, 0.05);
        }
        .icon-btn.primary {
            color: #667eea;
        }
        .icon-btn.primary:hover {
            background: rgba(102, 126, 234, 0.1);
        }
        .icon-btn.success {
            color: #10b981;
        }
        .icon-btn.success:hover {
            background: rgba(16, 185, 129, 0.1);
        }
        .icon-btn.danger {
            color: #ef4444;
        }
        .icon-btn.danger:hover {
            background: rgba(239, 68, 68, 0.1);
        }
        .icon-btn svg {
            width: 20px;
            height: 20px;
        }
        .icon-btn-large {
            padding: 0.75rem 1.5rem;
            background: #667eea;
            color: white;
            border-radius: 6px;
        }
        .icon-btn-large:hover {
            background: #5568d3;
        }
        .icon-btn-large svg {
            width: 18px;
            height: 18px;
            margin-right: 0.5rem;
        }
        .tooltip {
            visibility: hidden;
            position: absolute;
            z-index: 1000;
            background: #1f2937;
            color: white;
            padding: 0.5rem 0.75rem;
            border-radius: 6px;
            font-size: 0.85rem;
            white-space: nowrap;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%) translateY(-5px);
            opacity: 0;
            transition: opacity 0.2s, transform 0.2s;
            pointer-events: none;
        }
        .tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: #1f2937;
        }
        .icon-btn:hover .tooltip {
            visibility: visible;
            opacity: 1;
            transform: translateX(-50%) translateY(-8px);
        }
        
        /* Format selection buttons */
        .format-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1.5rem 1rem;
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            color: #334155;
        }
        .format-btn:hover {
            border-color: #667eea;
            background: #f8f9ff;
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(102, 126, 234, 0.1);
        }
        .format-btn.selected {
            border-color: #667eea;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .format-btn.selected svg {
            stroke: white;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="container" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h1>📊 MDL Dashboard</h1>
                <p>Metrics Definition Library - Governance & Transparency</p>
                <div id="storageIndicator" style="margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.9;"></div>
            </div>
            <div style="display: flex; gap: 1rem;">
                <button class="icon-btn icon-btn-large" onclick="openSettings()" style="background: rgba(255,255,255,0.2); color: white;">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                </button>
                <button id="manageUsersBtn" class="icon-btn icon-btn-large" onclick="window.location.href='/admin/users'" style="background: rgba(255,255,255,0.2); color: white; display: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Manage Users
                </button>
                <button class="icon-btn icon-btn-large" onclick="logout()" style="background: rgba(255,255,255,0.2); color: white;">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                </button>
            </div>
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
                <h2>Import Data</h2>
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
                    <div style="margin-top: 1rem; padding: 1rem; background: #e0f2fe; border-left: 4px solid #0ea5e9; border-radius: 6px; font-size: 0.9rem; color: #0c4a6e;">
                        <strong>📥 Universal Import - Supports All Templates:</strong>
                        <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
                            <li><strong>Metrics:</strong> template-metric.json/yaml or sample-metrics files</li>
                            <li><strong>Domains:</strong> template-domain.json/yaml (requires database)</li>
                            <li><strong>Objectives:</strong> template-objective.json/yaml (requires database)</li>
                            <li><strong>Mixed:</strong> Files with multiple data types</li>
                        </ul>
                        <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem;">💡 System automatically detects data type and imports to correct storage.</p>
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
                    <button type="button" class="btn btn-success" onclick="performImport()">Import Data</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Download Objective Report Modal -->
    <div class="modal" id="downloadObjectiveModal">
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <button class="close-btn" onclick="closeDownloadObjectiveModal()">&times;</button>
                <h2>Download Objective Report</h2>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 1.5rem;">
                    <p style="color: #666; margin-bottom: 1rem;">Generate a comprehensive report for this objective including all key results and metrics.</p>
                    <div style="background: #f9fafb; padding: 1rem; border-radius: 6px; border-left: 4px solid #667eea;">
                        <strong id="downloadObjectiveName" style="display: block; margin-bottom: 0.5rem;"></strong>
                        <span id="downloadObjectiveId" style="font-size: 0.9rem; color: #666;"></span>
                    </div>
                </div>

                <div class="form-group">
                    <label>Select Format</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-top: 0.75rem;">
                        <button type="button" class="format-btn" onclick="selectDownloadFormat('pdf')" data-format="pdf">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 32px; height: 32px; margin-bottom: 0.5rem;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <div style="font-weight: 600;">PDF</div>
                            <div style="font-size: 0.8rem;">Portable Document</div>
                        </button>
                        <button type="button" class="format-btn" onclick="selectDownloadFormat('docx')" data-format="docx">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 32px; height: 32px; margin-bottom: 0.5rem;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div style="font-weight: 600;">Word</div>
                            <div style="font-size: 0.8rem; ">Microsoft Word</div>
                        </button>
                        <button type="button" class="format-btn" onclick="selectDownloadFormat('md')" data-format="md">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 32px; height: 32px; margin-bottom: 0.5rem;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <div style="font-weight: 600;">Markdown</div>
                            <div style="font-size: 0.8rem; ">Plain Text</div>
                        </button>
                    </div>
                </div>

                <input type="hidden" id="selectedObjectiveId">
                <input type="hidden" id="selectedDownloadFormat" value="md">

                <div class="form-actions" style="margin-top: 2rem;">
                    <button type="button" class="btn btn-secondary" onclick="closeDownloadObjectiveModal()">Cancel</button>
                    <button type="button" class="btn btn-success" onclick="downloadObjectiveReport()">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 20px; height: 20px; margin-right: 0.5rem;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Report
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Add/Edit Domain Form Modal -->
    <div class="modal" id="domainFormModal">
        <div class="modal-content">
            <div class="modal-header">
                <button class="close-btn" onclick="closeDomainFormModal()">&times;</button>
                <h2 id="domainFormModalTitle">Add New Domain</h2>
            </div>
            <div class="modal-body">
                <form id="domainForm">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="required">Domain ID</label>
                            <input type="text" id="dom_domain_id" name="domain_id" required placeholder="DOMAIN-001">
                        </div>
                        <div class="form-group">
                            <label class="required">Name</label>
                            <input type="text" id="dom_name" name="name" required placeholder="Domain name">
                        </div>
                        <div class="form-group">
                            <label class="required">Owner Team</label>
                            <input type="text" id="dom_owner_team" name="owner_team" required placeholder="e.g., product_team">
                        </div>
                        <div class="form-group">
                            <label class="required">Contact Email</label>
                            <input type="email" id="dom_contact_email" name="contact_email" required placeholder="team@company.com">
                        </div>
                        <div class="form-group">
                            <label class="required">Color (Hex)</label>
                            <input type="color" id="dom_color" name="color" required value="#667eea">
                        </div>
                        <div class="form-group">
                            <label>Tier Focus (comma-separated)</label>
                            <input type="text" id="dom_tier_focus" name="tier_focus" placeholder="Tier-1, Tier-2">
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-top: 1rem;">
                        <label class="required">Description</label>
                        <textarea id="dom_description" name="description" required placeholder="Detailed description of the domain..."></textarea>
                    </div>

                    <div class="form-group" style="margin-top: 1rem;">
                        <label>Key Areas (comma-separated)</label>
                        <textarea id="dom_key_areas" name="key_areas" rows="3" placeholder="Area 1, Area 2, Area 3"></textarea>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeDomainFormModal()">Cancel</button>
                        <button type="submit" class="btn btn-success">Save Domain</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Add/Edit Objective Form Modal -->
    <div class="modal" id="objectiveFormModal">
        <div class="modal-content">
            <div class="modal-header">
                <button class="close-btn" onclick="closeObjectiveFormModal()">&times;</button>
                <h2 id="objectiveFormModalTitle">Add New Objective</h2>
            </div>
            <div class="modal-body">
                <form id="objectiveForm">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="required">Objective ID</label>
                            <input type="text" id="obj_objective_id" name="objective_id" required placeholder="OBJ-001">
                        </div>
                        <div class="form-group">
                            <label class="required">Name</label>
                            <input type="text" id="obj_name" name="name" required placeholder="Objective name">
                        </div>
                        <div class="form-group">
                            <label class="required">Owner Team</label>
                            <input type="text" id="obj_owner_team" name="owner_team" required placeholder="e.g., product_team">
                        </div>
                        <div class="form-group">
                            <label class="required">Status</label>
                            <select id="obj_status" name="status" required>
                                <option value="active">Active</option>
                                <option value="draft">Draft</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Strategic Pillar</label>
                            <input type="text" id="obj_strategic_pillar" name="strategic_pillar" placeholder="e.g., Customer Experience">
                        </div>
                        <div class="form-group">
                            <label>Priority</label>
                            <select id="obj_priority" name="priority">
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="required">Start Date</label>
                            <input type="date" id="obj_start_date" name="start_date" required>
                        </div>
                        <div class="form-group">
                            <label class="required">End Date</label>
                            <input type="date" id="obj_end_date" name="end_date" required>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-top: 1rem;">
                        <label class="required">Description</label>
                        <textarea id="obj_description" name="description" required placeholder="Detailed description of the objective..."></textarea>
                    </div>

                    <div class="detail-section">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h3 style="margin: 0;">Key Results</h3>
                            <button type="button" class="icon-btn icon-btn-large" onclick="addKeyResult()" style="background: #10b981;">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                </svg>
                                Add Key Result
                            </button>
                        </div>
                        <div id="keyResultsContainer"></div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeObjectiveFormModal()">Cancel</button>
                        <button type="submit" class="btn btn-success">Save Objective</button>
                    </div>
                </form>
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
                            <select id="form_business_domain" name="business_domain" required>
                                <option value="">Select business domain...</option>
                            </select>
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
                                <input type="text" id="form_formula" name="formula" placeholder="numerator / denominator" pattern=".*" title="Use metric IDs, operators (+, -, *, /), and parentheses">
                                <div style="font-size: 0.85rem; color: #666; margin-top: 0.25rem;">💡 Example: (METRIC-001 + METRIC-002) / METRIC-003</div>
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

    <!-- Settings Modal -->
    <div class="modal" id="settingsModal">
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <button class="close-btn" onclick="closeSettings()">&times;</button>
                <h2>⚙️ Settings</h2>
            </div>
            <div class="modal-body">
                <div class="detail-section">
                    <h3>Application Information</h3>
                    <div style="display: grid; grid-template-columns: 200px 1fr; gap: 1rem; margin-top: 1rem;">
                        <div style="font-weight: 600;">Version:</div>
                        <div id="appVersion">1.0.0</div>
                        
                        <div style="font-weight: 600;">Build:</div>
                        <div id="appBuild">Production</div>
                        
                        <div style="font-weight: 600;">Environment:</div>
                        <div id="appEnvironment">Desktop App</div>
                    </div>
                </div>

                <div class="detail-section" style="margin-top: 2rem;">
                    <h3>Data Storage Configuration</h3>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <div onclick="selectStorageType('local')" style="cursor: pointer; display: flex; align-items: center; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 6px; transition: border-color 0.2s;" onmouseover="this.style.borderColor='#667eea'" onmouseout="if(!document.getElementById('storageLocal').checked) this.style.borderColor='#e2e8f0'">
                            <input type="radio" name="storageType" value="local" id="storageLocal" checked style="margin-right: 1rem; width: 20px; height: 20px;">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.25rem;">📁 Local File Storage</div>
                                <div style="color: #666; font-size: 0.9rem;">Store metrics in local JSON files (.mdl/metrics.json)</div>
                                <div style="color: #10b981; font-size: 0.85rem; margin-top: 0.5rem;">✓ No setup required • ✓ Fast • ✓ Portable</div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <div onclick="selectStorageType('database')" style="cursor: pointer; display: flex; align-items: center; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 6px; transition: border-color 0.2s;" onmouseover="this.style.borderColor='#667eea'" onmouseout="if(!document.getElementById('storageDatabase').checked) this.style.borderColor='#e2e8f0'">
                            <input type="radio" name="storageType" value="database" id="storageDatabase" style="margin-right: 1rem; width: 20px; height: 20px;">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.25rem;">🗄️ Database Storage</div>
                                <div style="color: #666; font-size: 0.9rem;">PostgreSQL database connection</div>
                                <div style="color: #10b981; font-size: 0.85rem; margin-top: 0.5rem;">✓ PostgreSQL support available • Run scripts/db-setup.sql first</div>
                            </div>
                        </div>
                    </div>

                    <div id="databaseConfig" style="padding: 1.5rem; background: #f9fafb; border-radius: 6px; margin-top: 1rem; display: none;">
                        <h4 style="margin-bottom: 0.5rem;">Database Configuration</h4>
                        <p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">
                            Configure your PostgreSQL database connection. Make sure the database exists and is accessible.
                        </p>
                        
                        <div class="form-group" style="margin-bottom: 1rem; display: none;">
                            <label>Database Type</label>
                            <select id="dbType" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px;">
                                <option value="postgresql" selected>PostgreSQL</option>
                            </select>
                        </div>

                        <div class="form-grid">
                            <div class="form-group">
                                <label>Host</label>
                                <input type="text" id="dbHost" placeholder="localhost" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px;">
                            </div>
                            <div class="form-group">
                                <label>Port</label>
                                <input type="text" id="dbPort" placeholder="5432" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px;">
                            </div>
                        </div>

                        <div class="form-group" style="margin-top: 1rem;">
                            <label>Database Name</label>
                            <input type="text" id="dbName" placeholder="mdl_metrics" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px;">
                        </div>

                        <div class="form-grid" style="margin-top: 1rem;">
                            <div class="form-group">
                                <label>Username</label>
                                <input type="text" id="dbUser" placeholder="username" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px;">
                            </div>
                            <div class="form-group">
                                <label>Password</label>
                                <input type="password" id="dbPassword" placeholder="password" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px;">
                            </div>
                        </div>

                        <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                            <button class="btn btn-secondary" onclick="testDatabaseConnection()">Test Connection</button>
                            <div id="dbConnectionStatus" style="display: flex; align-items: center; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.9rem;"></div>
                        </div>
                    </div>

                    <div style="margin-top: 2rem; padding: 1rem; background: #eff6ff; border-left: 4px solid #667eea; border-radius: 6px;">
                        <div style="font-weight: 600; color: #667eea; margin-bottom: 0.5rem;">💡 Current Storage</div>
                        <div id="currentStorageInfo" style="color: #374151; font-size: 0.9rem;">
                            Using local file storage: <code style="background: white; padding: 0.25rem 0.5rem; border-radius: 3px; font-family: monospace;">.mdl/metrics.json</code>
                        </div>
                    </div>
                </div>

                <div class="detail-section" style="margin-top: 2rem;">
                    <h3>Performance & Caching</h3>
                    <p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">
                        Configure Redis cache for improved performance. Falls back to .env settings if not configured here.
                    </p>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: flex; align-items: center; cursor: pointer; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 6px;">
                            <input type="checkbox" id="redisEnabled" style="margin-right: 1rem; width: 20px; height: 20px;" onchange="toggleRedisConfig()">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.25rem;">⚡ Enable Redis Cache</div>
                                <div style="color: #666; font-size: 0.9rem;">Improves API performance with 80%+ cache hit rate</div>
                            </div>
                        </label>
                    </div>

                    <div id="redisConfig" style="padding: 1.5rem; background: #f9fafb; border-radius: 6px; display: none;">
                        <h4 style="margin-bottom: 0.5rem;">Redis Configuration</h4>
                        <p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">
                            Configure your Redis connection. Leave empty to use .env defaults.
                        </p>
                        
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Host</label>
                                <input type="text" id="redisHost" placeholder="localhost (from .env)" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px;">
                            </div>
                            <div class="form-group">
                                <label>Port</label>
                                <input type="text" id="redisPort" placeholder="6379 (from .env)" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px;">
                            </div>
                        </div>

                        <div class="form-grid" style="margin-top: 1rem;">
                            <div class="form-group">
                                <label>Password (Optional)</label>
                                <input type="password" id="redisPassword" placeholder="Leave empty if no password" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px;">
                            </div>
                            <div class="form-group">
                                <label>Database Number</label>
                                <input type="number" id="redisDb" placeholder="0 (from .env)" min="0" max="15" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px;">
                            </div>
                        </div>

                        <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                            <button class="btn btn-secondary" onclick="testRedisConnection()">Test Connection</button>
                            <div id="redisConnectionStatus" style="display: none; align-items: center; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.9rem;"></div>
                        </div>
                    </div>

                    <div style="margin-top: 1.5rem; padding: 1rem; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
                        <div style="font-weight: 600; color: #92400e; margin-bottom: 0.5rem;">ℹ️ Optional Feature</div>
                        <div style="color: #78350f; font-size: 0.9rem;">
                            Redis caching is optional. If Redis is not available, the application will function normally with database-only performance.
                            Settings here override .env defaults when enabled.
                        </div>
                    </div>
                </div>

                <div class="detail-section" style="margin-top: 2rem;">
                    <h3>About MDL</h3>
                    <p style="color: #666; line-height: 1.6;">
                        MDL (Metrics Definition Library) is a comprehensive application to store and manage Metric Definitions 
                        with support for multiple interfaces (API, CLI, config files), OPA policy generation, and visualization 
                        dashboard for transparency and governance.
                    </p>
                    <div style="margin-top: 1rem;">
                        <a href="https://github.com/S-Analytics/MDL" target="_blank" style="color: #667eea; text-decoration: none;">
                            📚 Documentation
                        </a>
                        <span style="margin: 0 1rem; color: #ccc;">|</span>
                        <a href="https://github.com/S-Analytics/MDL/issues" target="_blank" style="color: #667eea; text-decoration: none;">
                            🐛 Report Issue
                        </a>
                    </div>
                </div>

                <div class="form-actions" style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="closeSettings()">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="saveSettings()">Save Settings</button>
                </div>
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0;">Business Domains</h2>
                <button class="icon-btn icon-btn-large" onclick="openAddDomainForm()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Domain
                </button>
            </div>
            <div id="domainsGrid" class="stats-grid"></div>
        </div>

        <div class="section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0;">Objectives & Key Results</h2>
                <button class="icon-btn icon-btn-large" onclick="openAddObjectiveForm()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Objective
                </button>
            </div>
            <div id="objectivesGrid" class="metric-grid"></div>
        </div>

        <div class="section">
            <div class="chart-section">
                <h2>Metrics Distribution: Tier → Business Domain</h2>
                <div class="chart-container">
                    <div id="sunburstChart"></div>
                    <div class="sunburst-center-text" id="sunburstCenterText">
                        Hover over segments to explore
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>All Metrics</h2>
            <div class="controls">
                <input type="text" id="searchInput" placeholder="Search metrics..." style="flex: 1; max-width: 400px;">
                <select id="categoryFilter">
                    <option value="">All Categories</option>
                </select>
                <button class="icon-btn icon-btn-large" onclick="openAddMetricForm()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Metric
                </button>
                <button class="icon-btn icon-btn-large" onclick="openImportModal()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import
                </button>
                <button class="icon-btn icon-btn-large" onclick="exportMetrics()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export
                </button>
                <button class="icon-btn icon-btn-large" onclick="refreshData()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>
            <div class="metric-grid" id="metricsGrid">
                <div class="loading">Loading metrics...</div>
            </div>
        </div>
    </div>

    <script>
        // Authentication check - redirect to login if not authenticated
        // This runs IMMEDIATELY when the page loads, before any other code executes
        (function() {
            const currentPath = window.location.pathname;
            
            // Only perform auth check on dashboard pages (not on auth pages themselves)
            if (currentPath === '/' || currentPath === '/dashboard') {
                // Small delay to ensure localStorage is ready after navigation
                setTimeout(function() {
                    const token = localStorage.getItem('accessToken');
                    
                    if (!token) {
                        // No token found - redirect to login immediately
                        console.warn('No access token found, redirecting to login');
                        window.location.replace('/auth/login');
                    } else {
                        // User is authenticated - check if admin to show Manage Users button
                        const userStr = localStorage.getItem('user');
                        console.log('User data from localStorage:', userStr);
                        if (userStr) {
                            try {
                                const user = JSON.parse(userStr);
                                console.log('Parsed user:', user);
                                console.log('User role:', user.role);
                                if (user.role === 'admin') {
                                    console.log('User is admin, showing Manage Users button');
                                    const manageUsersBtn = document.getElementById('manageUsersBtn');
                                    console.log('manageUsersBtn element:', manageUsersBtn);
                                    if (manageUsersBtn) {
                                        manageUsersBtn.style.display = 'flex';
                                        console.log('Button display set to flex');
                                    }
                                }
                            } catch (e) {
                                console.error('Failed to parse user data:', e);
                            }
                        }
                    }
                }, 50); // 50ms delay to ensure localStorage is accessible
            }
        })();

        let allMetrics = [];
        let allObjectives = [];
        let allDomains = [];
        let stats = {};

        async function fetchData() {
            try {
                // Get authentication token
                const token = localStorage.getItem('accessToken');
                const headers = token ? { 'Authorization': 'Bearer ' + token } : {};

                // Fetch data from API (server handles storage mode automatically)
                console.log('Fetching data from API...');
                const cacheBuster = Date.now();
                const [metricsRes, statsRes, domainsRes, objectivesRes] = await Promise.all([
                    fetch('/api/metrics?_=' + cacheBuster, { headers }),
                    fetch('/api/stats?_=' + cacheBuster, { headers }),
                    fetch('/examples/sample-domains.json?_=' + cacheBuster).catch(() => ({ json: async () => ({ domains: [] }) })),
                    fetch('/examples/sample-objectives.json?_=' + cacheBuster).catch(() => ({ json: async () => ({ objectives: [] }) }))
                ]);
                
                // Check for authentication errors
                if (metricsRes.status === 401 || statsRes.status === 401) {
                    console.warn('Authentication failed, redirecting to login');
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/auth/login';
                    return;
                }
                
                const metricsData = await metricsRes.json();
                const statsData = await statsRes.json();
                const domainsData = await domainsRes.json();
                const objectivesData = await objectivesRes.json();
                
                allMetrics = metricsData.data || [];
                stats = statsData.data || {};
                
                // Load domains from localStorage first, then fall back to sample data
                const storedDomains = await loadDomainsFromStorage();
                allDomains = storedDomains || domainsData.domains || [];
                
                // Load objectives from localStorage first, then fall back to sample data
                const storedObjectives = await loadObjectivesFromStorage();
                allObjectives = storedObjectives || objectivesData.objectives || [];
                
                // Update objectives count
                stats.objectives = allObjectives.length;
                
                console.log('Data fetched - Metrics count:', allMetrics.length);
                updateStats();
                updateCharts();
                renderDomains();
                renderMetrics();
                await updateStorageIndicator();
                console.log('Dashboard updated successfully');
            } catch (error) {
                console.error('Error fetching data:', error);
                document.getElementById('metricsGrid').innerHTML = 
                    '<div class="empty-state">Error loading data: ' + error.message + '</div>';
            }
        }

        async function updateStorageIndicator() {
            const settings = await loadSettings();
            const indicator = document.getElementById('storageIndicator');
            
            if (settings.storage === 'postgresql' && settings.postgres?.host) {
                indicator.innerHTML = '🗄️ Connected to PostgreSQL: ' + settings.postgres.host + ':' + settings.postgres.port + '/' + settings.postgres.database;
                indicator.style.color = '#10b981';
            } else {
                indicator.innerHTML = '📁 Using local file storage';
                indicator.style.color = '#f59e0b';
            }
        }

        function updateStats() {
            document.getElementById('totalMetrics').textContent = stats.total || 0;
            document.getElementById('totalObjectives').textContent = stats.objectives || 0;
            
            // Count unique business domains from both metrics and loaded domains
            const domainsFromMetrics = Object.keys(stats.byBusinessDomain || {}).length;
            const domainsFromList = allDomains.length;
            const totalDomains = Math.max(domainsFromMetrics, domainsFromList);
            document.getElementById('totalDomains').textContent = totalDomains;
            
            document.getElementById('totalOwners').textContent = Object.keys(stats.byOwner || {}).length;
        }

        function updateCharts() {
            renderSunburstChart();
            
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

        function renderSunburstChart() {
            const container = document.getElementById('sunburstChart');
            
            // Build hierarchical data structure: Root -> Tier -> Business Domain -> Metrics
            const hierarchyData = {
                name: 'All Metrics',
                children: []
            };

            // Group metrics by tier first, then by business domain
            const tierMap = new Map();
            
            allMetrics.forEach(metric => {
                const tier = metric.tier || 'No Tier';
                const domain = metric.business_domain || 'Unassigned';
                
                if (!tierMap.has(tier)) {
                    tierMap.set(tier, new Map());
                }
                
                const domainMap = tierMap.get(tier);
                if (!domainMap.has(domain)) {
                    domainMap.set(domain, []);
                }
                
                domainMap.get(domain).push(metric);
            });

            // Convert to hierarchical structure
            tierMap.forEach((domainMap, tierName) => {
                const tierNode = {
                    name: tierName,
                    children: []
                };
                
                domainMap.forEach((metrics, domainName) => {
                    tierNode.children.push({
                        name: domainName,
                        value: metrics.length,
                        metrics: metrics
                    });
                });
                
                hierarchyData.children.push(tierNode);
            });

            if (hierarchyData.children.length === 0) {
                container.innerHTML = '<div class="empty-state">No data available</div>';
                return;
            }

            // Clear container
            container.innerHTML = '';

            // Set dimensions (50% of original size)
            const width = 300;
            const height = 300;
            const radius = Math.min(width, height) / 2;

            // Color scale (now for tiers on inner ring)
            const color = d3.scaleOrdinal()
                .domain(Array.from(tierMap.keys()))
                .range([
                    '#667eea', '#764ba2', '#f093fb', '#4facfe',
                    '#43e97b', '#fa709a', '#fee140', '#30cfd0',
                    '#a8edea', '#fed6e3', '#c471f5', '#fbc2eb'
                ]);

            // Create SVG
            const svg = d3.select(container)
                .append('svg')
                .attr('viewBox', \`0 0 \${width} \${height}\`)
                .attr('width', width)
                .attr('height', height)
                .style('font', '12px sans-serif');

            const g = svg.append('g')
                .attr('transform', \`translate(\${width / 2},\${height / 2})\`);

            // Create hierarchy
            const root = d3.hierarchy(hierarchyData)
                .sum(d => d.value || 0)
                .sort((a, b) => b.value - a.value);

            // Create partition layout
            const partition = d3.partition()
                .size([2 * Math.PI, radius]);

            partition(root);

            // Create arc generator
            const arc = d3.arc()
                .startAngle(d => d.x0)
                .endAngle(d => d.x1)
                .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
                .padRadius(radius / 2)
                .innerRadius(d => d.y0)
                .outerRadius(d => d.y1 - 1);

            // Create tooltip
            const tooltip = d3.select('body').append('div')
                .attr('class', 'sunburst-tooltip')
                .style('opacity', 0);

            // Add paths
            const path = g.selectAll('path')
                .data(root.descendants().filter(d => d.depth > 0))
                .join('path')
                .attr('fill', d => {
                    if (d.depth === 1) {
                        // Tier level (inner ring)
                        return color(d.data.name);
                    } else {
                        // Business domain level (outer ring) - lighter shade of parent tier
                        const parentColor = color(d.parent.data.name);
                        return d3.color(parentColor).brighter(0.5);
                    }
                })
                .attr('d', arc)
                .style('cursor', 'pointer')
                .style('stroke', 'white')
                .style('stroke-width', '2px')
                .on('mouseover', function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .style('opacity', 0.8);
                    
                    const percentage = ((d.value / root.value) * 100).toFixed(1);
                    let tooltipText = \`\${d.data.name}: \${d.value} metrics (\${percentage}%)\`;
                    
                    if (d.depth === 1) {
                        tooltipText = \`Tier: \${tooltipText}\`;
                    } else if (d.depth === 2) {
                        tooltipText = \`\${d.parent.data.name} → \${tooltipText}\`;
                    }
                    
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 0.9);
                    tooltip.html(tooltipText)
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                    
                    // Update center text
                    document.getElementById('sunburstCenterText').innerHTML = 
                        \`<strong>\${d.data.name}</strong><br>\${d.value} metrics (\${percentage}%)\`;
                })
                .on('mouseout', function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .style('opacity', 1);
                    
                    tooltip.transition()
                        .duration(500)
                        .style('opacity', 0);
                    
                    // Reset center text
                    document.getElementById('sunburstCenterText').textContent = 
                        'Hover over segments to explore';
                });

            // Add labels for larger segments
            g.selectAll('text')
                .data(root.descendants().filter(d => {
                    return d.depth > 0 && (d.x1 - d.x0) > 0.1;
                }))
                .join('text')
                .attr('transform', d => {
                    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
                    const y = (d.y0 + d.y1) / 2;
                    return \`rotate(\${x - 90}) translate(\${y},0) rotate(\${x < 180 ? 0 : 180})\`;
                })
                .attr('dy', '0.35em')
                .style('text-anchor', 'middle')
                .style('fill', 'white')
                .style('font-size', '10px')
                .style('font-weight', 'bold')
                .style('pointer-events', 'none')
                .text(d => {
                    const angle = d.x1 - d.x0;
                    const name = d.data.name;
                    if (angle > 0.15) {
                        return name.length > 15 ? name.substring(0, 13) + '...' : name;
                    }
                    return '';
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
                <div class="metric-card" data-metric-id="\${metric.metric_id}">
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
                    <div class="action-buttons" style="justify-content: flex-end;">
                        <button class="icon-btn primary" onclick="event.stopPropagation(); openEditMetricForm('\${metric.metric_id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span class="tooltip">Edit Metric</span>
                        </button>
                        <button class="icon-btn danger" onclick="event.stopPropagation(); deleteMetric('\${metric.metric_id}', '\${metric.name}')">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span class="tooltip">Delete Metric</span>
                        </button>
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
                const tierFocus = Array.isArray(domain.tier_focus) ? domain.tier_focus : [];
                const keyAreas = Array.isArray(domain.key_areas) ? domain.key_areas : [];
                const metadata = domain.tier_focus && typeof domain.tier_focus === 'object' && !Array.isArray(domain.tier_focus) ? domain.tier_focus : {};
                
                return \`
                    <div class="stat-card" style="border-left: 4px solid \${domain.color || metadata.color || '#667eea'}; position: relative;">
                        <h3 style="color: \${domain.color || metadata.color || '#667eea'};">\${domain.name}</h3>
                        <div class="value">\${metricsInDomain.length}</div>
                        <p style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">\${domain.description}</p>
                        <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; font-size: 0.85rem;">
                            <div style="margin-bottom: 0.25rem;"><strong>Owner:</strong> \${domain.owner_team}</div>
                            \${tierFocus.length > 0 ? \`<div style="margin-bottom: 0.25rem;"><strong>Tiers:</strong> \${tierFocus.join(', ')}</div>\` : ''}
                            \${metadata.priority ? \`<div style="margin-bottom: 0.25rem;"><strong>Priority:</strong> \${metadata.priority}</div>\` : ''}
                            \${domain.contact_email ? \`<div style="margin-bottom: 0.25rem;"><strong>Email:</strong> \${domain.contact_email}</div>\` : ''}
                            \${keyAreas.length > 0 ? \`<div><strong>Areas:</strong> \${keyAreas.slice(0, 3).join(', ')}\${keyAreas.length > 3 ? '...' : ''}</div>\` : ''}
                        </div>
                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; justify-content: flex-end;">
                            <button class="icon-btn primary" onclick="event.stopPropagation(); openEditDomainForm('\${domain.domain_id}')">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span class="tooltip">Edit Domain</span>
                            </button>
                            <button class="icon-btn danger" onclick="event.stopPropagation(); deleteDomain('\${domain.domain_id}', '\${domain.name.replace(/'/g, "\\'")}')">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span class="tooltip">Delete Domain</span>
                            </button>
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
                        <div style="flex: 1;">
                            <h3>\${obj.name}</h3>
                            <div class="id">ID: \${obj.objective_id}</div>
                        </div>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <span class="badge" style="background: \${priorityColor};">\${obj.priority ? obj.priority.toUpperCase() : 'MEDIUM'}</span>
                        </div>
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
                                                <span style="color: #667eea;">📊 Metrics: </span>
                                                \${kr.metric_ids.map(metricId => \`
                                                    <button 
                                                        class="badge primary" 
                                                        style="cursor: pointer; border: none; margin-right: 0.25rem; text-decoration: underline;"
                                                        onclick="event.stopPropagation(); scrollToMetric('\${metricId}')"
                                                        title="Click to view metric in grid"
                                                    >
                                                        \${metricId}
                                                    </button>
                                                \`).join('')}
                                            </div>
                                        \` : ''}
                                    </div>
                                \`;
                            }).join('')}
                        </div>
                    \` : ''}
                    <div class="action-buttons" style="justify-content: flex-end;">
                        <button class="icon-btn success" onclick="event.stopPropagation(); openDownloadObjectiveModal('\${obj.objective_id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span class="tooltip">Download Objective Report</span>
                        </button>
                        <button class="icon-btn primary" onclick="event.stopPropagation(); openEditObjectiveForm('\${obj.objective_id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span class="tooltip">Edit Objective</span>
                        </button>
                        <button class="icon-btn danger" onclick="event.stopPropagation(); deleteObjective('\${obj.objective_id}', '\${obj.name.replace(/'/g, "\\'")}')">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span class="tooltip">Delete Objective</span>
                        </button>
                    </div>
                </div>
                \`;
            }).join('');
        }

        function refreshData() {
            fetchData();
        }

        // Function to scroll to and highlight a metric in the grid
        function scrollToMetric(metricId) {
            // Switch to Metrics tab
            const metricsTab = document.querySelector('.tab-btn[data-tab="metrics"]');
            if (metricsTab) {
                metricsTab.click();
            }

            // Wait for tab to switch, then scroll to metric
            setTimeout(() => {
                const metricCard = document.querySelector(\`[data-metric-id="\${metricId}"]\`);
                if (metricCard) {
                    // Scroll the card into view with smooth behavior
                    metricCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Add highlight effect
                    metricCard.style.transition = 'all 0.3s ease';
                    metricCard.style.boxShadow = '0 0 0 4px #667eea';
                    metricCard.style.transform = 'scale(1.02)';
                    
                    // Remove highlight after 2 seconds
                    setTimeout(() => {
                        metricCard.style.boxShadow = '';
                        metricCard.style.transform = '';
                    }, 2000);
                } else {
                    // If metric not found in current view, show detail modal as fallback
                    showMetricDetail(metricId);
                }
            }, 100);
        }

        // Metric Detail View Functions
        function calculateMetricAlignment(metricId) {
            // Find all objectives and key results that reference this metric
            const alignments = [];
            
            // Safety check: ensure allObjectives is defined and is an array
            if (!allObjectives || !Array.isArray(allObjectives)) {
                return alignments;
            }
            
            allObjectives.forEach(objective => {
                if (objective.key_results && objective.key_results.length > 0) {
                    objective.key_results.forEach(kr => {
                        if (kr.metric_ids && kr.metric_ids.includes(metricId)) {
                            alignments.push({
                                objective_id: objective.objective_id,
                                objective_name: objective.name,
                                key_result_id: kr.kr_id,
                                key_result_name: kr.name,
                                business_priority: objective.priority || 'medium',
                                strategic_theme: objective.strategic_pillar || 'N/A'
                            });
                        }
                    });
                }
            });
            
            return alignments;
        }

        function showMetricDetail(metricId) {
            const metric = allMetrics.find(m => m.metric_id === metricId);
            if (!metric) return;
            
            // Calculate strategic alignment dynamically
            const alignments = calculateMetricAlignment(metricId);
            if (alignments.length > 0) {
                // Add alignment info to metric for display
                metric.alignments = alignments;
            } else {
                delete metric.alignments;
            }

            document.getElementById('modalMetricName').textContent = metric.name;
            document.getElementById('modalMetricId').innerHTML = \`
                ID: \${metric.metric_id}
                <div style="float: right; display: flex; gap: 0.5rem;">
                    <button class="icon-btn primary" onclick="closeMetricDetail(); openEditMetricForm('\${metric.metric_id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span class="tooltip">Edit Metric</span>
                    </button>
                    <button class="icon-btn danger" onclick="closeMetricDetail(); deleteMetric('\${metric.metric_id}', '\${metric.name}')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span class="tooltip">Delete Metric</span>
                    </button>
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

            // Strategic Alignment - dynamically calculated from objectives
            if (metric.alignments && metric.alignments.length > 0) {
                html += \`
                    <div class="detail-section">
                        <h3>🎯 Strategic Alignment</h3>
                        <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">This metric is linked to \${metric.alignments.length} objective(s)</p>
                        \${metric.alignments.map((alignment, index) => \`
                            <div style="background: #f9fafb; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; border-left: 4px solid #667eea;">
                                <h4 style="margin-bottom: 0.75rem; color: #667eea;">Alignment #\${index + 1}</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <label>Objective</label>
                                        <div class="value">\${alignment.objective_id}</div>
                                        <div style="font-size: 0.85rem; color: #666; margin-top: 0.25rem;">\${alignment.objective_name}</div>
                                    </div>
                                    <div class="detail-item">
                                        <label>Key Result</label>
                                        <div class="value">\${alignment.key_result_id}</div>
                                        <div style="font-size: 0.85rem; color: #666; margin-top: 0.25rem;">\${alignment.key_result_name}</div>
                                    </div>
                                    <div class="detail-item">
                                        <label>Business Priority</label>
                                        <div class="value">\${alignment.business_priority}</div>
                                    </div>
                                    <div class="detail-item">
                                        <label>Strategic Theme</label>
                                        <div class="value">\${alignment.strategic_theme}</div>
                                    </div>
                                </div>
                            </div>
                        \`).join('')}
                    </div>
                \`;
            } else if (metric.alignment) {
                // Fallback for old stored alignment data
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
                                    <span style="font-size: 0.9rem;">Notify: \${(rule.notification_channels || rule.notify_channels || []).join(', ') || 'N/A'}</span>
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
                        <h3>📝 Metadata & Version History</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Version</label>
                                <div class="value" style="font-weight: 600; color: #667eea;">\${metric.metadata.version || '1.0.0'}</div>
                            </div>
                            <div class="detail-item">
                                <label>Created At</label>
                                <div class="value">\${metric.metadata.created_at ? new Date(metric.metadata.created_at).toLocaleString() : 'N/A'}</div>
                            </div>
                            <div class="detail-item">
                                <label>Created By</label>
                                <div class="value">\${metric.metadata.created_by || 'N/A'}</div>
                            </div>
                            <div class="detail-item">
                                <label>Last Updated</label>
                                <div class="value">\${metric.metadata.last_updated ? new Date(metric.metadata.last_updated).toLocaleString() : 'N/A'}</div>
                            </div>
                            <div class="detail-item">
                                <label>Last Updated By</label>
                                <div class="value">\${metric.metadata.last_updated_by || 'N/A'}</div>
                            </div>
                        </div>
                        \${metric.metadata.change_history && metric.metadata.change_history.length > 0 ? \`
                            <div style="margin-top: 1.5rem;">
                                <label style="display: block; margin-bottom: 0.75rem; font-weight: 500; font-size: 1rem;">📋 Change History:</label>
                                <div style="max-height: 300px; overflow-y: auto;">
                                    \${metric.metadata.change_history.slice().reverse().map((change, index) => 
                                        '<div style="background: ' + (index === 0 ? '#f0f4ff' : '#f9fafb') + '; padding: 1rem; border-radius: 6px; margin-bottom: 0.75rem; border-left: 4px solid ' + (change.change_type === 'major' ? '#ef4444' : change.change_type === 'minor' ? '#f59e0b' : '#10b981') + ';">' +
                                            '<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">' +
                                                '<div>' +
                                                    '<span style="font-weight: 600; color: #1f2937;">v' + change.version + '</span>' +
                                                    '<span class="badge" style="margin-left: 0.5rem; background: ' + (change.change_type === 'major' ? '#ef4444' : change.change_type === 'minor' ? '#f59e0b' : '#10b981') + ';">' + change.change_type.toUpperCase() + '</span>' +
                                                '</div>' +
                                                '<div style="font-size: 0.875rem; color: #6b7280;">' + new Date(change.timestamp).toLocaleString() + '</div>' +
                                            '</div>' +
                                            '<div style="font-size: 0.9rem; color: #4b5563; margin-bottom: 0.25rem;">' + (change.changes_summary || 'Changes made') + '</div>' +
                                            '<div style="font-size: 0.85rem; color: #6b7280;">' +
                                                '<strong>Changed by:</strong> ' + (change.changed_by || 'Unknown') + ' | ' +
                                                '<strong>Fields:</strong> ' + (change.fields_changed ? change.fields_changed.join(', ') : 'N/A') +
                                            '</div>' +
                                        '</div>'
                                    ).join('')}
                                </div>
                            </div>
                        \` : ''}
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

        // Domain Form Functions
        let isEditModeDomain = false;
        let editingDomainId = null;

        function openAddDomainForm() {
            isEditModeDomain = false;
            editingDomainId = null;
            document.getElementById('domainFormModalTitle').textContent = 'Add New Domain';
            document.getElementById('domainForm').reset();
            document.getElementById('dom_domain_id').disabled = false;
            document.getElementById('dom_color').value = '#667eea';
            document.getElementById('domainFormModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function openEditDomainForm(domainId) {
            const domain = allDomains.find(d => d.domain_id === domainId);
            if (!domain) return;

            isEditModeDomain = true;
            editingDomainId = domainId;
            document.getElementById('domainFormModalTitle').textContent = 'Edit Domain';
            
            // Populate form fields
            document.getElementById('dom_domain_id').value = domain.domain_id;
            document.getElementById('dom_domain_id').disabled = true;
            document.getElementById('dom_name').value = domain.name;
            document.getElementById('dom_owner_team').value = domain.owner_team;
            document.getElementById('dom_contact_email').value = domain.contact_email;
            document.getElementById('dom_color').value = domain.color || '#667eea';
            document.getElementById('dom_tier_focus').value = (domain.tier_focus || []).join(', ');
            document.getElementById('dom_description').value = domain.description;
            document.getElementById('dom_key_areas').value = (domain.key_areas || []).join(', ');

            document.getElementById('domainFormModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeDomainFormModal() {
            document.getElementById('domainFormModal').classList.remove('active');
            document.body.style.overflow = 'auto';
            document.getElementById('domainForm').reset();
            isEditModeDomain = false;
            editingDomainId = null;
        }

        // Settings Functions
        function openSettings() {
            document.getElementById('settingsModal').classList.add('active');
            document.body.style.overflow = 'hidden';
            loadSettings();
        }

        function closeSettings() {
            document.getElementById('settingsModal').classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        async function logout() {
            try {
                // Get token for logout API call
                const token = localStorage.getItem('accessToken');
                
                // Call logout API to invalidate server-side session
                if (token) {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Content-Type': 'application/json'
                        }
                    }).catch(err => console.warn('Logout API call failed:', err));
                }
                
                // Clear local storage
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                
                // Redirect to login page
                window.location.href = '/auth/login';
            } catch (error) {
                console.error('Logout error:', error);
                // Even if logout fails, clear tokens and redirect
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/auth/login';
            }
        }

        async function loadSettings() {
            // Load app version from package.json
            document.getElementById('appVersion').textContent = '1.0.0';
            document.getElementById('appBuild').textContent = 'Production';
            document.getElementById('appEnvironment').textContent = 'Web Browser';
            
            // Try to fetch current server settings first
            let settings = { storage: 'local', postgres: null, redis: null };
            try {
                const response = await fetch('/api/storage/mode');
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        settings = result.data.settings || settings;
                    }
                }
            } catch (e) {
                console.warn('Could not fetch server settings, falling back to localStorage:', e);
            }
            
            // Fallback to localStorage if server didn't provide settings
            if (!settings.storage || settings.storage === 'local') {
                const settingsStr = localStorage.getItem('mdl_settings');
                if (settingsStr) {
                    try {
                        const parsed = JSON.parse(settingsStr);
                        // Handle old format (storageType) and new format (storage)
                        if (parsed.storageType) {
                            settings = {
                                storage: parsed.storageType === 'database' ? 'postgresql' : 'local',
                                postgres: parsed.database ? {
                                    host: parsed.database.host,
                                    port: parsed.database.port,
                                    database: parsed.database.name,
                                    user: parsed.database.user,
                                    password: parsed.database.password || ''
                                } : null,
                                redis: parsed.redis || null
                            };
                        } else if (parsed.storage) {
                            settings = parsed;
                        }
                    } catch (e) {
                        console.error('Error parsing settings:', e);
                    }
                }
            }
            
            if (settings.storage === 'postgresql' && settings.postgres) {
                document.getElementById('storageDatabase').checked = true;
                document.getElementById('databaseConfig').style.display = 'block';
                
                // Load saved DB config
                document.getElementById('dbType').value = 'postgresql';
                document.getElementById('dbHost').value = settings.postgres.host || '';
                document.getElementById('dbPort').value = settings.postgres.port || '';
                document.getElementById('dbName').value = settings.postgres.database || '';
                document.getElementById('dbUser').value = settings.postgres.user || '';
            } else {
                document.getElementById('storageLocal').checked = true;
                document.getElementById('databaseConfig').style.display = 'none';
            }
            
            // Load Redis configuration
            if (settings.redis && settings.redis.enabled) {
                document.getElementById('redisEnabled').checked = true;
                document.getElementById('redisConfig').style.display = 'block';
                
                // Load saved Redis config
                document.getElementById('redisHost').value = settings.redis.host || '';
                document.getElementById('redisPort').value = settings.redis.port || '';
                document.getElementById('redisPassword').value = settings.redis.password || '';
                document.getElementById('redisDb').value = settings.redis.db !== undefined ? settings.redis.db : '';
            } else {
                document.getElementById('redisEnabled').checked = false;
                document.getElementById('redisConfig').style.display = 'none';
            }
            
            return settings;
        }

        function selectStorageType(type) {
            if (type === 'database') {
                document.getElementById('storageDatabase').checked = true;
                document.getElementById('databaseConfig').style.display = 'block';
            } else {
                document.getElementById('storageLocal').checked = true;
                document.getElementById('databaseConfig').style.display = 'none';
            }
        }

        async function testDatabaseConnection() {
            const statusDiv = document.getElementById('dbConnectionStatus');
            statusDiv.textContent = '⏳ Testing connection...';
            statusDiv.style.background = '#fef3c7';
            statusDiv.style.color = '#92400e';
            statusDiv.style.display = 'flex';

            const dbConfig = {
                host: document.getElementById('dbHost').value,
                port: parseInt(document.getElementById('dbPort').value),
                database: document.getElementById('dbName').value,
                user: document.getElementById('dbUser').value,
                password: document.getElementById('dbPassword').value || ''
            };

            try {
                const response = await fetch('/api/database/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dbConfig)
                });

                const result = await response.json();

                if (result.success) {
                    statusDiv.textContent = '✓ Connection successful';
                    statusDiv.style.background = '#d1fae5';
                    statusDiv.style.color = '#065f46';
                } else {
                    statusDiv.textContent = '✗ Connection failed: ' + (result.error || 'Unknown error');
                    statusDiv.style.background = '#fee2e2';
                    statusDiv.style.color = '#991b1b';
                }
            } catch (error) {
                statusDiv.textContent = '✗ Test endpoint not available yet';
                statusDiv.style.background = '#fef3c7';
                statusDiv.style.color = '#92400e';
            }
        }

        function toggleRedisConfig() {
            const enabled = document.getElementById('redisEnabled').checked;
            const configDiv = document.getElementById('redisConfig');
            configDiv.style.display = enabled ? 'block' : 'none';
        }

        async function testRedisConnection() {
            const statusDiv = document.getElementById('redisConnectionStatus');
            statusDiv.textContent = '⏳ Testing Redis connection...';
            statusDiv.style.background = '#fef3c7';
            statusDiv.style.color = '#92400e';
            statusDiv.style.display = 'flex';

            const redisConfig = {
                host: document.getElementById('redisHost').value || undefined,
                port: document.getElementById('redisPort').value ? parseInt(document.getElementById('redisPort').value) : undefined,
                password: document.getElementById('redisPassword').value || undefined,
                db: document.getElementById('redisDb').value !== '' ? parseInt(document.getElementById('redisDb').value) : undefined
            };

            try {
                const response = await fetch('/api/cache/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(redisConfig)
                });

                const result = await response.json();

                if (result.success) {
                    statusDiv.textContent = '✓ Redis connection successful';
                    statusDiv.style.background = '#d1fae5';
                    statusDiv.style.color = '#065f46';
                } else {
                    statusDiv.textContent = '✗ Connection failed: ' + (result.error || 'Unknown error');
                    statusDiv.style.background = '#fee2e2';
                    statusDiv.style.color = '#991b1b';
                }
            } catch (error) {
                statusDiv.textContent = '✗ Redis test endpoint not available';
                statusDiv.style.background = '#fef3c7';
                statusDiv.style.color = '#92400e';
            }
        }

        async function saveSettings() {
            const storageType = document.querySelector('input[name="storageType"]:checked').value;
            
            const settings = {
                storage: storageType === 'database' ? 'postgresql' : 'local',
                savedAt: new Date().toISOString()
            };

            if (storageType === 'database') {
                settings.postgres = {
                    host: document.getElementById('dbHost').value,
                    port: parseInt(document.getElementById('dbPort').value),
                    database: document.getElementById('dbName').value,
                    user: document.getElementById('dbUser').value,
                    password: document.getElementById('dbPassword').value || ''
                };
            }

            // Save Redis configuration if enabled
            const redisEnabled = document.getElementById('redisEnabled').checked;
            if (redisEnabled) {
                const redisHost = document.getElementById('redisHost').value;
                const redisPort = document.getElementById('redisPort').value;
                const redisPassword = document.getElementById('redisPassword').value;
                const redisDb = document.getElementById('redisDb').value;

                settings.redis = {
                    enabled: true,
                    ...(redisHost && { host: redisHost }),
                    ...(redisPort && { port: parseInt(redisPort) }),
                    ...(redisPassword && { password: redisPassword }),
                    ...(redisDb !== '' && { db: parseInt(redisDb) })
                };
            } else {
                settings.redis = { enabled: false };
            }

            // Save to localStorage for UI state
            localStorage.setItem('mdl_settings', JSON.stringify(settings));
            
            try {
                // Call API to switch storage mode on server
                const response = await fetch('/api/storage/switch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                });

                const result = await response.json();

                if (result.success) {
                    showToast('Storage mode switched successfully', 'success');
                    console.log('Storage switched to:', settings.storage);
                    closeSettings();
                    // Reload data after switching storage
                    console.log('Reloading dashboard data in 500ms...');
                    setTimeout(() => {
                        console.log('Fetching fresh data after storage switch...');
                        fetchData();
                    }, 500);
                } else {
                    showToast('Failed to switch storage: ' + (result.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                showToast('Failed to switch storage mode: ' + error.message, 'error');
            }
        }

        // Download Objective Report Functions
        function openDownloadObjectiveModal(objectiveId) {
            const objective = allObjectives.find(o => o.objective_id === objectiveId);
            if (!objective) {
                showToast('Objective not found', 'error');
                return;
            }

            document.getElementById('downloadObjectiveName').textContent = objective.name;
            document.getElementById('downloadObjectiveId').textContent = 'ID: ' + objectiveId;
            document.getElementById('selectedObjectiveId').value = objectiveId;
            
            // Reset format selection
            document.querySelectorAll('.format-btn').forEach(btn => btn.classList.remove('selected'));
            document.querySelector('.format-btn[data-format="md"]').classList.add('selected');
            document.getElementById('selectedDownloadFormat').value = 'md';
            
            document.getElementById('downloadObjectiveModal').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function closeDownloadObjectiveModal() {
            document.getElementById('downloadObjectiveModal').style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        function selectDownloadFormat(format) {
            document.querySelectorAll('.format-btn').forEach(btn => btn.classList.remove('selected'));
            document.querySelector('.format-btn[data-format="' + format + '"]').classList.add('selected');
            document.getElementById('selectedDownloadFormat').value = format;
        }

        async function downloadObjectiveReport() {
            const objectiveId = document.getElementById('selectedObjectiveId').value;
            const format = document.getElementById('selectedDownloadFormat').value;
            
            const objective = allObjectives.find(o => o.objective_id === objectiveId);
            if (!objective) {
                showToast('Objective not found', 'error');
                return;
            }

            let content = '';
            let mimeType = '';
            let extension = '';
            let filename = \`\${objective.objective_id}_\${objective.name.replace(/[^a-z0-9]/gi, '_')}\`;

            if (format === 'md') {
                content = generateMarkdownReport(objective);
                mimeType = 'text/markdown';
                extension = 'md';
            } else if (format === 'pdf') {
                // Generate HTML for PDF conversion
                content = generateHTMLReport(objective);
                mimeType = 'text/html';
                extension = 'html';
                showToast('PDF generation requires additional setup. Downloading HTML for now.', 'info');
            } else if (format === 'docx') {
                // Generate DOCX using server-side API
                try {
                    const response = await fetch('/api/export/objective/docx', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            objective: objective,
                            metrics: allMetrics
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to generate DOCX');
                    }

                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`\${filename}.docx\`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    showToast(\`Word document downloaded successfully!\`, 'success');
                    closeDownloadObjectiveModal();
                    return;
                } catch (error) {
                    showToast('Error generating Word document: ' + error.message, 'error');
                    closeDownloadObjectiveModal();
                    return;
                }
            }

            // Create and download the file
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`\${filename}.\${extension}\`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(\`Report downloaded successfully!\`, 'success');
            closeDownloadObjectiveModal();
        }

        function generateMarkdownReport(objective) {
            const date = new Date().toISOString().split('T')[0];
            
            let md = '# Objective Report: ' + objective.name + '\\n\\n';
            md += '**Generated:** ' + date + '\\n\\n';
            md += '---\\n\\n';
            
            // Objective Details
            md += '## 📋 Objective Details\\n\\n';
            md += '- **Objective ID:** ' + objective.objective_id + '\\n';
            md += '- **Name:** ' + objective.name + '\\n';
            md += '- **Description:** ' + objective.description + '\\n';
            md += '- **Owner Team:** ' + objective.owner_team + '\\n';
            md += '- **Status:** ' + objective.status + '\\n';
            md += '- **Priority:** ' + (objective.priority || 'Medium') + '\\n';
            md += '- **Strategic Pillar:** ' + (objective.strategic_pillar || 'N/A') + '\\n';
            md += '- **Timeframe:** ' + objective.timeframe.start + ' to ' + objective.timeframe.end + '\\n\\n';
            
            // Key Results
            if (objective.key_results && objective.key_results.length > 0) {
                md += '## 🎯 Key Results (' + objective.key_results.length + ')\\n\\n';
                
                objective.key_results.forEach((kr, index) => {
                    const current = kr.current_value ?? kr.baseline_value;
                    const range = Math.abs(kr.target_value - kr.baseline_value);
                    const progress = range > 0 ? Math.min(100, Math.abs(current - kr.baseline_value) / range * 100) : 0;
                    const isOnTrack = kr.direction === 'increase' 
                        ? current >= (kr.baseline_value + range * 0.5)
                        : current <= (kr.baseline_value - range * 0.5);
                    
                    md += '### ' + (index + 1) + '. ' + kr.name + '\\n\\n';
                    md += '- **Baseline:** ' + kr.baseline_value + ' ' + kr.unit + '\\n';
                    md += '- **Current:** ' + current + ' ' + kr.unit + '\\n';
                    md += '- **Target:** ' + kr.target_value + ' ' + kr.unit + '\\n';
                    md += '- **Direction:** ' + kr.direction + '\\n';
                    md += '- **Progress:** ' + Math.round(progress) + '%\\n';
                    md += '- **Status:** ' + (isOnTrack ? '✅ On Track' : '⚠️ Needs Attention') + '\\n';
                    
                    if (kr.metric_ids && kr.metric_ids.length > 0) {
                        md += '- **Associated Metrics:** ' + kr.metric_ids.join(', ') + '\\n';
                        
                        // Include metric details
                        md += '\\n#### Associated Metric Details\\n\\n';
                        kr.metric_ids.forEach(metricId => {
                            const metric = allMetrics.find(m => m.metric_id === metricId);
                            if (metric) {
                                md += '- **' + metric.name + '** (\`' + metric.metric_id + '\`)\\n';
                                md += '  - Category: ' + metric.category + '\\n';
                                md += '  - Owner: ' + (metric.governance?.owner_team || metric.owner?.team || 'N/A') + '\\n';
                                if (metric.definition) {
                                    md += '  - Formula: \`' + metric.definition.formula + '\`\\n';
                                    md += '  - Unit: ' + metric.definition.unit + '\\n';
                                }
                                if (metric.metadata?.version) {
                                    md += '  - Version: ' + metric.metadata.version + '\\n';
                                }
                                if (metric.metadata?.last_updated) {
                                    md += '  - Last Updated: ' + new Date(metric.metadata.last_updated).toLocaleString() + '\\n';
                                }
                            }
                        });
                    }
                    
                    md += '\\n';
                });
            } else {
                md += '## 🎯 Key Results\\n\\nNo key results defined for this objective.\\n\\n';
            }
            
            // Additional Information
            md += '## 📊 Summary\\n\\n';
            md += '- **Total Key Results:** ' + (objective.key_results?.length || 0) + '\\n';
            md += '- **Total Metrics:** ' + (objective.key_results?.reduce((sum, kr) => sum + (kr.metric_ids?.length || 0), 0) || 0) + '\\n';
            
            const avgProgress = objective.key_results && objective.key_results.length > 0
                ? objective.key_results.reduce((sum, kr) => {
                    const current = kr.current_value ?? kr.baseline_value;
                    const range = Math.abs(kr.target_value - kr.baseline_value);
                    const progress = range > 0 ? Math.min(100, Math.abs(current - kr.baseline_value) / range * 100) : 0;
                    return sum + progress;
                }, 0) / objective.key_results.length
                : 0;
            
            md += '- **Average Progress:** ' + Math.round(avgProgress) + '%\\n\\n';
            
            // Metric Version History Summary
            const metricsWithHistory = allMetrics.filter(m => 
                objective.key_results?.some(kr => kr.metric_ids?.includes(m.metric_id)) &&
                m.metadata?.change_history && m.metadata.change_history.length > 0
            );
            
            if (metricsWithHistory.length > 0) {
                md += '## 📝 Metric Version History\\n\\n';
                metricsWithHistory.forEach(metric => {
                    md += '### ' + metric.name + ' (v' + (metric.metadata?.version || '1.0.0') + ')\\n\\n';
                    if (metric.metadata?.change_history && metric.metadata.change_history.length > 0) {
                        const recentChanges = metric.metadata.change_history.slice(-3).reverse();
                        recentChanges.forEach(change => {
                            md += '- **v' + change.version + '** (' + new Date(change.timestamp).toLocaleDateString() + ')\\n';
                            md += '  - Type: ' + change.change_type.toUpperCase() + '\\n';
                            md += '  - Summary: ' + (change.changes_summary || 'Changes made') + '\\n';
                            md += '  - Changed by: ' + (change.changed_by || 'Unknown') + '\\n';
                            if (change.fields_changed && change.fields_changed.length > 0) {
                                md += '  - Fields: ' + change.fields_changed.join(', ') + '\\n';
                            }
                        });
                        md += '\\n';
                    }
                });
            }
            
            md += '---\\n\\n';
            md += '*Report generated by MDL Dashboard v1.0.0*\\n';
            
            return md;
        }

        function generateHTMLReport(objective) {
            const date = new Date().toISOString().split('T')[0];
            
            // For now, generate Markdown and wrap in HTML
            const mdContent = generateMarkdownReport(objective);
            const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Objective Report</title>' +
                '<style>body{font-family:sans-serif;max-width:900px;margin:2rem auto;padding:2rem;line-height:1.6;}' +
                'h1,h2,h3{color:#667eea;}code{background:#f4f4f4;padding:2px 6px;border-radius:3px;}</style>' +
                '</head><body><pre style="white-space:pre-wrap;font-family:sans-serif;">' + mdContent + '</pre></body></html>';
            return html;
        }
        
        function generateHTMLReportOld(objective) {
            // Old complex version - replaced with simpler Markdown wrapper
            return generateHTMLReport(objective);
        }
        
        // Domain Form Submission
        document.addEventListener('DOMContentLoaded', function() {
            const domainForm = document.getElementById('domainForm');
            if (domainForm) {
                domainForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const formData = new FormData(e.target);
                    
                    // Get domain_id - if in edit mode, use editingDomainId since field is disabled
                    let domainId = isEditModeDomain ? editingDomainId : formData.get('domain_id');
                    
                    // Generate domain_id if not provided (for new domains only)
                    if (!domainId || domainId.trim() === '') {
                        // Generate ID from domain name: lowercase, hyphenated
                        const domainName = formData.get('name');
                        domainId = domainName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                        // Add short suffix for uniqueness (last 4 digits of timestamp)
                        domainId = \`\${domainId}-\${Date.now().toString().slice(-4)}\`;
                    }
                    
                    const domainData = {
                        domain_id: domainId,
                        name: formData.get('name'),
                        description: formData.get('description'),
                        owner_team: formData.get('owner_team'),
                        contact_email: formData.get('contact_email'),
                        tier_focus: formData.get('tier_focus') 
                            ? formData.get('tier_focus').split(',').map(t => t.trim()).filter(Boolean)
                            : [],
                        key_areas: formData.get('key_areas')
                            ? formData.get('key_areas').split(',').map(a => a.trim()).filter(Boolean)
                            : [],
                        color: formData.get('color') || '#667eea'
                    };

                    try {
                        const settings = loadSettings();
                        const usePostgres = settings.storage === 'postgresql' && 
                                           settings.postgres?.host && 
                                           settings.postgres?.port && 
                                           settings.postgres?.database && 
                                           settings.postgres?.user;

                        if (usePostgres) {
                            // Save to PostgreSQL via API
                            const dbConfig = {
                                host: settings.postgres.host,
                                port: parseInt(settings.postgres.port),
                                name: settings.postgres.database,
                                user: settings.postgres.user,
                                password: settings.postgres.password || ''
                            };

                            const response = await fetch('/api/postgres/domains/save', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    dbConfig, 
                                    domain: domainData,
                                    isUpdate: isEditModeDomain 
                                })
                            });

                            const result = await response.json();
                            if (!response.ok || result.error) {
                                throw new Error(result.error || 'Failed to save domain to PostgreSQL');
                            }

                            // Refresh data from database
                            await fetchData();
                        } else {
                            // Save to localStorage
                            if (isEditModeDomain) {
                                const index = allDomains.findIndex(d => d.domain_id === editingDomainId);
                                if (index !== -1) {
                                    allDomains[index] = domainData;
                                }
                            } else {
                                allDomains.push(domainData);
                            }

                            await saveDomainsToStorage();
                            renderDomains();
                            updateStats();
                        }
                        
                        showToast(\`Domain \${isEditModeDomain ? 'updated' : 'created'} successfully!\`, 'success');
                        closeDomainFormModal();
                    } catch (error) {
                        showToast(\`Error: \${error.message}\`, 'error');
                    }
                });
            }
        });

        async function saveDomainsToStorage() {
            try {
                const settings = loadSettings();
                const usePostgres = settings.storage === 'postgresql' && 
                                   settings.postgres?.host && 
                                   settings.postgres?.port && 
                                   settings.postgres?.database && 
                                   settings.postgres?.user;

                if (usePostgres) {
                    // Note: For PostgreSQL, domains are saved individually via API
                    // This function is kept for compatibility but domains should be saved via saveNewDomain
                    console.log('Using PostgreSQL - domains are saved individually');
                    return true;
                } else {
                    localStorage.setItem('mdl_domains', JSON.stringify(allDomains));
                    return true;
                }
            } catch (error) {
                console.error('Error saving domains:', error);
                throw error;
            }
        }

        async function loadDomainsFromStorage() {
            try {
                const stored = localStorage.getItem('mdl_domains');
                if (stored) {
                    return JSON.parse(stored);
                }
            } catch (error) {
                console.error('Error loading domains from storage:', error);
            }
            return null;
        }

        async function deleteDomain(domainId, domainName) {
            // Check if any metrics use this domain
            const metricsInDomain = allMetrics.filter(m => m.business_domain === domainName);
            
            if (metricsInDomain.length > 0) {
                if (!confirm(\`This domain has \${metricsInDomain.length} metric(s). Deleting the domain will not delete the metrics, but they will be orphaned. Continue?\`)) {
                    return;
                }
            }

            if (!confirm(\`Are you sure you want to delete "\${domainName}"?\`)) {
                return;
            }

            try {
                const settings = loadSettings();
                const usePostgres = settings.storage === 'postgresql' && 
                                   settings.postgres?.host && 
                                   settings.postgres?.port && 
                                   settings.postgres?.database && 
                                   settings.postgres?.user;

                if (usePostgres) {
                    // Delete from PostgreSQL via API
                    const dbConfig = {
                        host: settings.postgres.host,
                        port: parseInt(settings.postgres.port),
                        name: settings.postgres.database,
                        user: settings.postgres.user,
                        password: settings.postgres.password || ''
                    };

                    const response = await fetch('/api/postgres/domains/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ dbConfig, domainId })
                    });

                    const result = await response.json();
                    if (!response.ok || result.error) {
                        throw new Error(result.error || 'Failed to delete domain from PostgreSQL');
                    }

                    // Refresh data from database
                    await fetchData();
                } else {
                    // Delete from localStorage
                    const index = allDomains.findIndex(d => d.domain_id === domainId);
                    if (index !== -1) {
                        allDomains.splice(index, 1);
                        await saveDomainsToStorage();
                        renderDomains();
                        updateStats();
                    } else {
                        showToast('Domain not found', 'error');
                        return;
                    }
                }
                
                showToast('Domain deleted successfully!', 'success');
            } catch (error) {
                showToast(\`Error: \${error.message}\`, 'error');
            }
        }

        // Objective Form Functions
        let isEditModeObjective = false;
        let editingObjectiveId = null;
        let keyResultCounter = 0;

        function openAddObjectiveForm() {
            isEditModeObjective = false;
            editingObjectiveId = null;
            keyResultCounter = 0;
            document.getElementById('objectiveFormModalTitle').textContent = 'Add New Objective';
            document.getElementById('objectiveForm').reset();
            document.getElementById('obj_objective_id').disabled = false;
            document.getElementById('obj_status').value = 'active';
            document.getElementById('obj_priority').value = 'medium';
            document.getElementById('keyResultsContainer').innerHTML = '';
            
            // Add one empty key result by default
            addKeyResult();
            
            document.getElementById('objectiveFormModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function openEditObjectiveForm(objectiveId) {
            const objective = allObjectives.find(o => o.objective_id === objectiveId);
            if (!objective) return;

            isEditModeObjective = true;
            editingObjectiveId = objectiveId;
            keyResultCounter = 0;
            document.getElementById('objectiveFormModalTitle').textContent = 'Edit Objective';
            
            // Populate form fields
            document.getElementById('obj_objective_id').value = objective.objective_id;
            document.getElementById('obj_objective_id').disabled = true;
            document.getElementById('obj_name').value = objective.name;
            document.getElementById('obj_owner_team').value = objective.owner_team;
            document.getElementById('obj_status').value = objective.status;
            document.getElementById('obj_strategic_pillar').value = objective.strategic_pillar || '';
            document.getElementById('obj_priority').value = objective.priority || 'medium';
            document.getElementById('obj_start_date').value = objective.timeframe.start;
            document.getElementById('obj_end_date').value = objective.timeframe.end;
            document.getElementById('obj_description').value = objective.description;
            
            // Populate key results
            document.getElementById('keyResultsContainer').innerHTML = '';
            if (objective.key_results && objective.key_results.length > 0) {
                objective.key_results.forEach(kr => {
                    addKeyResult(kr);
                });
            } else {
                addKeyResult();
            }

            document.getElementById('objectiveFormModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeObjectiveFormModal() {
            document.getElementById('objectiveFormModal').classList.remove('active');
            document.body.style.overflow = 'auto';
            document.getElementById('objectiveForm').reset();
            document.getElementById('keyResultsContainer').innerHTML = '';
            isEditModeObjective = false;
            editingObjectiveId = null;
            keyResultCounter = 0;
        }

        function addKeyResult(existingKR = null) {
            const container = document.getElementById('keyResultsContainer');
            const krId = keyResultCounter++;
            
            const krHtml = \`
                <div class="key-result-item" id="kr_\${krId}">
                    <h4>
                        <span>Key Result #\${krId + 1}</span>
                        <button type="button" class="icon-btn danger" onclick="removeKeyResult(\${krId})" style="padding: 0.35rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span class="tooltip">Remove Key Result</span>
                        </button>
                    </h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="required">KR ID</label>
                            <input type="text" name="kr_id_\${krId}" value="\${existingKR?.kr_id || ''}" required placeholder="OBJ-001:KR-001">
                        </div>
                        <div class="form-group">
                            <label class="required">Name</label>
                            <input type="text" name="kr_name_\${krId}" value="\${existingKR?.name || ''}" required placeholder="Key result name">
                        </div>
                        <div class="form-group">
                            <label class="required">Direction</label>
                            <select name="kr_direction_\${krId}" required>
                                <option value="increase" \${existingKR?.direction === 'increase' ? 'selected' : ''}>Increase</option>
                                <option value="decrease" \${existingKR?.direction === 'decrease' ? 'selected' : ''}>Decrease</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="required">Unit</label>
                            <input type="text" name="kr_unit_\${krId}" value="\${existingKR?.unit || ''}" required placeholder="e.g., %, count, ms">
                        </div>
                        <div class="form-group">
                            <label class="required">Baseline Value</label>
                            <input type="number" step="any" name="kr_baseline_\${krId}" value="\${existingKR?.baseline_value ?? ''}" required placeholder="0">
                        </div>
                        <div class="form-group">
                            <label class="required">Target Value</label>
                            <input type="number" step="any" name="kr_target_\${krId}" value="\${existingKR?.target_value ?? ''}" required placeholder="100">
                        </div>
                        <div class="form-group">
                            <label>Current Value</label>
                            <input type="number" step="any" name="kr_current_\${krId}" value="\${existingKR?.current_value ?? ''}" placeholder="50">
                        </div>
                        <div class="form-group">
                            <label>Linked Metric ID</label>
                            <select name="kr_metrics_\${krId}" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px;" data-kr-id="\${krId}">
                                <option value="">Select a metric (optional)</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group" style="margin-top: 0.75rem;">
                        <label>Description</label>
                        <textarea name="kr_description_\${krId}" rows="2" placeholder="Key result description...">\${existingKR?.description || ''}</textarea>
                    </div>
                </div>
            \`;
            
            container.insertAdjacentHTML('beforeend', krHtml);
            
            // Populate the metrics dropdown for this key result
            const selectedMetric = existingKR?.metric_ids?.[0] || null;
            populateKeyResultMetrics(krId, selectedMetric);
        }

        function populateKeyResultMetrics(krId, selectedMetricId = null) {
            const select = document.querySelector(\`select[name="kr_metrics_\${krId}"]\`);
            if (!select) return;
            
            select.innerHTML = '<option value="">Select a metric (optional)</option>';
            
            if (allMetrics.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No metrics available';
                option.disabled = true;
                select.appendChild(option);
                return;
            }
            
            // Sort metrics by ID for easier finding
            const sortedMetrics = [...allMetrics].sort((a, b) => 
                a.metric_id.localeCompare(b.metric_id)
            );
            
            sortedMetrics.forEach(metric => {
                const option = document.createElement('option');
                option.value = metric.metric_id;
                option.textContent = \`\${metric.metric_id} - \${metric.name}\`;
                if (metric.metric_id === selectedMetricId) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }

        function removeKeyResult(krId) {
            const element = document.getElementById(\`kr_\${krId}\`);
            if (element) {
                element.remove();
            }
        }

        // Objective Form Submission
        document.addEventListener('DOMContentLoaded', function() {
            const objectiveForm = document.getElementById('objectiveForm');
            if (objectiveForm) {
                objectiveForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const formData = new FormData(e.target);
                    
                    // Collect key results
                    const keyResults = [];
                    const container = document.getElementById('keyResultsContainer');
                    const krItems = container.querySelectorAll('.key-result-item');
                    
                    krItems.forEach((item, index) => {
                        const krId = item.id.replace('kr_', '');
                        let krIdValue = formData.get(\`kr_id_\${krId}\`);
                        
                        // Only generate kr_id if not provided AND not in edit mode
                        // In edit mode, the form should already have the kr_id value
                        if (!krIdValue || krIdValue.trim() === '') {
                            // For new KRs, use objective_id as prefix to scope them
                            const objId = formData.get('objective_id') || 'OBJ';
                            krIdValue = \`\${objId}:KR-\${index + 1}\`;
                        }
                        
                        // Get selected metric ID from single-select dropdown
                        const metricsSelect = document.querySelector(\`select[name="kr_metrics_\${krId}"]\`);
                        const selectedMetric = metricsSelect ? metricsSelect.value : '';
                        
                        const kr = {
                            kr_id: krIdValue,
                            name: formData.get(\`kr_name_\${krId}\`),
                            description: formData.get(\`kr_description_\${krId}\`) || '',
                            target_value: parseFloat(formData.get(\`kr_target_\${krId}\`)),
                            baseline_value: parseFloat(formData.get(\`kr_baseline_\${krId}\`)),
                            unit: formData.get(\`kr_unit_\${krId}\`),
                            direction: formData.get(\`kr_direction_\${krId}\`),
                            current_value: formData.get(\`kr_current_\${krId}\`) ? parseFloat(formData.get(\`kr_current_\${krId}\`)) : null,
                            metric_ids: selectedMetric ? [selectedMetric] : []
                        };
                        keyResults.push(kr);
                    });

                    // Get objective_id - if in edit mode, use editingObjectiveId since field is disabled
                    let objectiveId = isEditModeObjective ? editingObjectiveId : formData.get('objective_id');
                    
                    // Generate objective_id if not provided (for new objectives only)
                    if (!objectiveId || objectiveId.trim() === '') {
                        // Generate ID: OBJ-YYYYMMDD-HHMMSS
                        const now = new Date();
                        const dateStr = now.toISOString().replace(/[-:T]/g, '').substring(0, 14);
                        objectiveId = \`OBJ-\${dateStr}\`;
                    }

                    const objectiveData = {
                        objective_id: objectiveId,
                        name: formData.get('name'),
                        description: formData.get('description'),
                        timeframe: {
                            start: formData.get('start_date'),
                            end: formData.get('end_date')
                        },
                        owner_team: formData.get('owner_team'),
                        status: formData.get('status'),
                        strategic_pillar: formData.get('strategic_pillar') || undefined,
                        priority: formData.get('priority') || 'medium',
                        key_results: keyResults
                    };

                    try {
                        const settings = loadSettings();
                        const usePostgres = settings.storage === 'postgresql' && 
                                           settings.postgres?.host && 
                                           settings.postgres?.port && 
                                           settings.postgres?.database && 
                                           settings.postgres?.user;

                        if (usePostgres) {
                            // Save to PostgreSQL via API
                            const dbConfig = {
                                host: settings.postgres.host,
                                port: parseInt(settings.postgres.port),
                                name: settings.postgres.database,
                                user: settings.postgres.user,
                                password: settings.postgres.password || ''
                            };

                            const response = await fetch('/api/postgres/objectives/save', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    dbConfig, 
                                    objective: objectiveData,
                                    isUpdate: isEditModeObjective 
                                })
                            });

                            const result = await response.json();
                            if (!response.ok || result.error) {
                                throw new Error(result.error || 'Failed to save objective to PostgreSQL');
                            }

                            // Refresh data from database
                            await fetchData();
                        } else {
                            // Save to localStorage
                            if (isEditModeObjective) {
                                const index = allObjectives.findIndex(o => o.objective_id === editingObjectiveId);
                                if (index !== -1) {
                                    allObjectives[index] = objectiveData;
                                }
                            } else {
                                allObjectives.push(objectiveData);
                            }

                            await saveObjectivesToStorage();
                            renderObjectives(allObjectives);
                            updateStats();
                        }
                        
                        showToast(\`Objective \${isEditModeObjective ? 'updated' : 'created'} successfully!\`, 'success');
                        closeObjectiveFormModal();
                    } catch (error) {
                        showToast(\`Error: \${error.message}\`, 'error');
                    }
                });
            }
        });

        async function saveObjectivesToStorage() {
            // Save to localStorage for now (in a real app, this would be an API call)
            try {
                localStorage.setItem('mdl_objectives', JSON.stringify(allObjectives));
                return true;
            } catch (error) {
                console.error('Error saving objectives:', error);
                throw error;
            }
        }

        async function loadObjectivesFromStorage() {
            try {
                const stored = localStorage.getItem('mdl_objectives');
                if (stored) {
                    return JSON.parse(stored);
                }
            } catch (error) {
                console.error('Error loading objectives from storage:', error);
            }
            return null;
        }

        async function deleteObjective(objectiveId, objectiveName) {
            if (!confirm(\`Are you sure you want to delete "\${objectiveName}"? This action cannot be undone.\`)) {
                return;
            }

            try {
                const settings = loadSettings();
                const usePostgres = settings.storage === 'postgresql' && 
                                   settings.postgres?.host && 
                                   settings.postgres?.port && 
                                   settings.postgres?.database && 
                                   settings.postgres?.user;

                if (usePostgres) {
                    // Delete from PostgreSQL via API
                    const dbConfig = {
                        host: settings.postgres.host,
                        port: parseInt(settings.postgres.port),
                        name: settings.postgres.database,
                        user: settings.postgres.user,
                        password: settings.postgres.password || ''
                    };

                    const response = await fetch('/api/postgres/objectives/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ dbConfig, objectiveId })
                    });

                    const result = await response.json();
                    if (!response.ok || result.error) {
                        throw new Error(result.error || 'Failed to delete objective from PostgreSQL');
                    }

                    // Refresh data from database
                    await fetchData();
                } else {
                    // Delete from localStorage
                    const index = allObjectives.findIndex(o => o.objective_id === objectiveId);
                    if (index !== -1) {
                        allObjectives.splice(index, 1);
                        await saveObjectivesToStorage();
                        renderObjectives(allObjectives);
                        updateStats();
                    } else {
                        showToast('Objective not found', 'error');
                        return;
                    }
                }
                
                showToast('Objective deleted successfully!', 'success');
            } catch (error) {
                showToast(\`Error: \${error.message}\`, 'error');
            }
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

                // Use universal import API - server will handle storage type
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    showToast('Authentication required. Please log in.', 'error');
                    return;
                }

                const response = await fetch('/api/import', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ data })
                });

                const result = await response.json();

                if (!result.success) {
                    showToast(\`Import failed: \${result.error}\`, 'error');
                    return;
                }

                const { imported, type, total } = result.data;
                
                // Build success message
                const parts = [];
                if (imported.metrics > 0) parts.push(\`\${imported.metrics} metric(s)\`);
                if (imported.domains > 0) parts.push(\`\${imported.domains} domain(s)\`);
                if (imported.objectives > 0) parts.push(\`\${imported.objectives} objective(s)\`);
                
                const message = \`Successfully imported \${parts.join(', ')}! (Total: \${total})\`;
                
                if (imported.errors && imported.errors.length > 0) {
                    showToast(\`\${message} with \${imported.errors.length} error(s). Check console.\`, 'warning');
                    console.error('Import errors:', imported.errors);
                } else {
                    showToast(message, 'success');
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

        function populateBusinessDomainDropdown(selectedValue = '') {
            const dropdown = document.getElementById('form_business_domain');
            dropdown.innerHTML = '<option value="">Select business domain...</option>';
            
            // Get unique domain names from allDomains
            const domainNames = allDomains.map(d => d.name).sort();
            
            // If no domains defined, add a default option
            if (domainNames.length === 0) {
                dropdown.innerHTML += '<option value="" disabled>No domains defined - Add domains first</option>';
                return;
            }
            
            domainNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                if (name === selectedValue) {
                    option.selected = true;
                }
                dropdown.appendChild(option);
            });
            
            // Add option to allow custom domain if needed
            const customOption = document.createElement('option');
            customOption.value = '__custom__';
            customOption.textContent = '+ Add new domain...';
            customOption.style.fontStyle = 'italic';
            customOption.style.color = '#667eea';
            dropdown.appendChild(customOption);
        }

        function openAddMetricForm() {
            isEditMode = false;
            editingMetricId = null;
            document.getElementById('formModalTitle').textContent = 'Add New Metric';
            document.getElementById('metricForm').reset();
            document.getElementById('form_metric_id').disabled = false;
            document.getElementById('form_status').value = 'active';
            populateBusinessDomainDropdown();
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
            
            // Populate business domain after form is visible to ensure proper selection
            setTimeout(() => {
                populateBusinessDomainDropdown(metric.business_domain);
            }, 0);
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

        // Handle business domain dropdown change
        document.addEventListener('change', function(e) {
            if (e.target.id === 'form_business_domain') {
                if (e.target.value === '__custom__') {
                    const customDomain = prompt('Enter new business domain name:');
                    if (customDomain && customDomain.trim()) {
                        // Add to dropdown temporarily
                        const option = document.createElement('option');
                        option.value = customDomain.trim();
                        option.textContent = customDomain.trim();
                        option.selected = true;
                        // Insert before the "Add new" option
                        e.target.insertBefore(option, e.target.lastElementChild);
                    } else {
                        e.target.value = '';
                    }
                }
            }
        });

        // Form submission
        // Helper function to bump semver version
        function bumpVersion(currentVersion, changeType) {
            const parts = currentVersion.split('.').map(Number);
            if (parts.length !== 3 || parts.some(isNaN)) {
                return '1.0.0';
            }
            
            let [major, minor, patch] = parts;
            
            switch (changeType) {
                case 'major':
                    major += 1;
                    minor = 0;
                    patch = 0;
                    break;
                case 'minor':
                    minor += 1;
                    patch = 0;
                    break;
                case 'patch':
                    patch += 1;
                    break;
            }
            
            return major + '.' + minor + '.' + patch;
        }
        
        // Helper function to determine change type
        function determineChangeType(existing, updates) {
            const majorFields = ['category', 'tier'];
            const minorFields = ['name', 'description', 'business_domain', 'metric_type'];
            
            // Check if formula changed
            if (updates.definition && existing.definition) {
                if (updates.definition.formula !== existing.definition.formula) {
                    return 'major';
                }
                if (updates.definition.unit !== existing.definition.unit) {
                    return 'major';
                }
            }
            
            // Check major fields
            for (const field of majorFields) {
                if (updates[field] !== undefined && updates[field] !== existing[field]) {
                    return 'major';
                }
            }
            
            // Check minor fields
            for (const field of minorFields) {
                if (updates[field] !== undefined && updates[field] !== existing[field]) {
                    return 'minor';
                }
            }
            
            return 'patch';
        }

        document.getElementById('metricForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            
            // Use editingMetricId when in edit mode (form_metric_id field is disabled, so not in FormData)
            let metricId = isEditMode ? editingMetricId : formData.get('metric_id');
            
            // Validate business domain
            let businessDomain = formData.get('business_domain');
            if (businessDomain === '__custom__' || !businessDomain) {
                showToast('Please select a valid business domain', 'error');
                return;
            }
            
            // Get existing metric if editing
            const existingMetric = isEditMode ? allMetrics.find(m => m.metric_id === editingMetricId) : null;
            
            // Build metric data for comparison
            const newMetricData = {
                name: formData.get('name'),
                short_name: formData.get('short_name'),
                description: formData.get('description'),
                category: formData.get('category'),
                tier: formData.get('tier'),
                business_domain: businessDomain,
                metric_type: formData.get('metric_type'),
                tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()).filter(Boolean) : [],
                definition: {
                    formula: formData.get('formula') || undefined,
                    unit: formData.get('unit') || undefined,
                    expected_direction: formData.get('expected_direction') || undefined,
                    calculation_frequency: formData.get('calculation_frequency') || undefined
                }
            };
            
            // Calculate version and change tracking
            let version = '1.0.0';
            let changeType = 'major';
            let changesSummary = 'Initial metric creation';
            let fieldsChanged = ['*'];
            
            if (isEditMode && existingMetric) {
                changeType = determineChangeType(existingMetric, newMetricData);
                const currentVersion = existingMetric.metadata?.version || '1.0.0';
                version = bumpVersion(currentVersion, changeType);
                
                // Track changed fields
                fieldsChanged = [];
                if (newMetricData.name !== existingMetric.name) fieldsChanged.push('name');
                if (newMetricData.description !== existingMetric.description) fieldsChanged.push('description');
                if (newMetricData.category !== existingMetric.category) fieldsChanged.push('category');
                if (newMetricData.tier !== existingMetric.tier) fieldsChanged.push('tier');
                if (newMetricData.business_domain !== existingMetric.business_domain) fieldsChanged.push('business_domain');
                if (newMetricData.metric_type !== existingMetric.metric_type) fieldsChanged.push('metric_type');
                if (JSON.stringify(newMetricData.tags) !== JSON.stringify(existingMetric.tags)) fieldsChanged.push('tags');
                if (newMetricData.definition.formula !== existingMetric.definition?.formula) fieldsChanged.push('formula');
                if (newMetricData.definition.unit !== existingMetric.definition?.unit) fieldsChanged.push('unit');
                
                changesSummary = 'Updated ' + fieldsChanged.join(', ');
            }
            
            const now = new Date().toISOString();
            const changeHistoryEntry = {
                version: version,
                timestamp: now,
                changed_by: 'dashboard_user',
                change_type: changeType,
                changes_summary: changesSummary,
                fields_changed: fieldsChanged
            };
            
            const metricData = {
                metric_id: metricId,
                name: formData.get('name'),
                short_name: formData.get('short_name'),
                description: formData.get('description'),
                category: formData.get('category'),
                tier: formData.get('tier'),
                business_domain: businessDomain,
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
                    created_at: existingMetric?.metadata?.created_at || now,
                    created_by: existingMetric?.metadata?.created_by || 'dashboard_user',
                    last_updated: now,
                    last_updated_by: 'dashboard_user',
                    version: version,
                    change_history: [
                        ...(existingMetric?.metadata?.change_history || []),
                        changeHistoryEntry
                    ]
                }
            };
            
            // Merge with full metric data
            Object.assign(metricData, newMetricData);

            try {
                let response;
                const settings = loadSettings();
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    showToast('Authentication required. Please log in.', 'error');
                    return;
                }
                
                // Route to PostgreSQL if enabled
                if (settings.storage === 'postgresql' && settings.postgres) {
                    response = await fetch('/api/postgres/metrics/save', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({
                            dbConfig: {
                                host: settings.postgres.host,
                                port: parseInt(settings.postgres.port),
                                name: settings.postgres.database,
                                user: settings.postgres.user,
                                password: settings.postgres.password || ''
                            },
                            metric: metricData,
                            isUpdate: isEditMode
                        })
                    });
                } else {
                    // Local file storage
                    if (isEditMode) {
                        response = await fetch(\`/api/metrics/\${editingMetricId}\`, {
                            method: 'PUT',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + token
                            },
                            body: JSON.stringify(metricData)
                        });
                    } else {
                        response = await fetch('/api/metrics', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + token
                            },
                            body: JSON.stringify(metricData)
                        });
                    }
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
                const settings = loadSettings();
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    showToast('Authentication required. Please log in.', 'error');
                    return;
                }
                let response;
                
                // Route to PostgreSQL if enabled
                if (settings.storage === 'postgresql' && settings.postgres) {
                    response = await fetch('/api/postgres/metrics/delete', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({
                            dbConfig: {
                                host: settings.postgres.host,
                                port: parseInt(settings.postgres.port),
                                name: settings.postgres.database,
                                user: settings.postgres.user,
                                password: settings.postgres.password || ''
                            },
                            metricId: metricId
                        })
                    });
                } else {
                    // Local file storage
                    response = await fetch(\`/api/metrics/\${metricId}\`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': 'Bearer ' + token
                        }
                    });
                }

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
                closeObjectiveFormModal();
                closeDomainFormModal();
                closeSettings();
                closeDownloadObjectiveModal();
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

        document.getElementById('objectiveFormModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeObjectiveFormModal();
            }
        });

        document.getElementById('domainFormModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeDomainFormModal();
            }
        });

        document.getElementById('downloadObjectiveModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeDownloadObjectiveModal();
            }
        });

        document.getElementById('settingsModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeSettings();
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
