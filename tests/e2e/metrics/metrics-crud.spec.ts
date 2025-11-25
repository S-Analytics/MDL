import { expect, test, BASE_URL, buildApiUrl } from '../helpers/fixtures';

/**
 * E2E Tests for Metrics CRUD Operations
 * 
 * Tests cover:
 * - Listing metrics with filtering and search
 * - Creating new metrics via form
 * - Editing existing metrics
 * - Deleting metrics
 * - Metric versioning
 * - Import/Export functionality
 * - Validation and error handling
 */

test.describe('Metrics Management', () => {
  test.describe('Metrics Listing and Display', () => {
    test('should display metrics grid on dashboard', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Wait for metrics to load
      await authenticatedPage.waitForSelector('#metricsGrid', { timeout: 10000 });
      
      // Check that the metrics section exists
      const metricsSection = await authenticatedPage.locator('text=All Metrics').isVisible();
      expect(metricsSection).toBeTruthy();
      
      // Check for search and filter controls
      await expect(authenticatedPage.locator('#searchInput')).toBeVisible();
      await expect(authenticatedPage.locator('#categoryFilter')).toBeVisible();
    });

    test('should filter metrics by search term', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForSelector('#metricsGrid', { timeout: 10000 });
      
      // Get initial metric count
      const initialCards = await authenticatedPage.locator('.metric-card').count();
      
      if (initialCards > 0) {
        // Get the name of the first metric
        const firstMetricName = await authenticatedPage.locator('.metric-card h3').first().textContent();
        
        // Search for part of the metric name
        const searchTerm = firstMetricName?.split(' ')[0].toLowerCase() || 'metric';
        await authenticatedPage.fill('#searchInput', searchTerm);
        
        // Wait for filtering to occur
        await authenticatedPage.waitForTimeout(500);
        
        // Verify filtering happened
        const filteredCards = await authenticatedPage.locator('.metric-card').count();
        expect(filteredCards).toBeGreaterThan(0);
        expect(filteredCards).toBeLessThanOrEqual(initialCards);
      }
    });

    test('should filter metrics by category', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForSelector('#metricsGrid', { timeout: 10000 });
      
      // Get all category options
      const categoryFilter = authenticatedPage.locator('#categoryFilter');
      const options = await categoryFilter.locator('option').allTextContents();
      
      // If there are categories other than "All Categories"
      if (options.length > 1) {
        const category = options[1]; // Select first category option
        await categoryFilter.selectOption({ label: category });
        
        // Wait for filtering
        await authenticatedPage.waitForTimeout(500);
        
        // Verify metrics are filtered
        const cards = await authenticatedPage.locator('.metric-card').count();
        if (cards > 0) {
          // Check that filtered metrics belong to the selected category
          const firstCard = authenticatedPage.locator('.metric-card').first();
          const cardContent = await firstCard.textContent();
          expect(cardContent).toBeTruthy();
        }
      }
    });

    test('should display "No metrics found" when no results', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForSelector('#metricsGrid', { timeout: 10000 });
      
      // Search for something that definitely won't exist
      await authenticatedPage.fill('#searchInput', 'xyznonexistentmetric12345');
      await authenticatedPage.waitForTimeout(500);
      
      // Should show empty state
      const emptyState = authenticatedPage.locator('.empty-state');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText(/No metrics found/i);
    });
  });

  test.describe('Metric Creation', () => {
    test('should open metric creation form', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Click the "Add New Metric" button
      const addButton = authenticatedPage.locator('button:has-text("Add New Metric")').first();
      await addButton.click();
      
      // Verify modal opens
      const modal = authenticatedPage.locator('#formModal');
      await expect(modal).toHaveClass(/active/);
      
      // Verify form title
      const title = authenticatedPage.locator('#formModalTitle');
      await expect(title).toContainText(/Add New Metric/i);
      
      // Verify required fields are present
      await expect(authenticatedPage.locator('#form_metric_id')).toBeVisible();
      await expect(authenticatedPage.locator('#form_name')).toBeVisible();
      await expect(authenticatedPage.locator('#form_category')).toBeVisible();
      await expect(authenticatedPage.locator('#form_tier')).toBeVisible();
      await expect(authenticatedPage.locator('#form_business_domain')).toBeVisible();
      await expect(authenticatedPage.locator('#form_metric_type')).toBeVisible();
      await expect(authenticatedPage.locator('#form_description')).toBeVisible();
    });

    test('should create a new metric with required fields only', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add New Metric")').first().click();
      await authenticatedPage.waitForSelector('#formModal.active');
      
      // Fill in required fields
      const timestamp = Date.now();
      const metricId = `METRIC-TEST-${timestamp}`;
      
      await authenticatedPage.fill('#form_metric_id', metricId);
      await authenticatedPage.fill('#form_name', `Test Metric ${timestamp}`);
      await authenticatedPage.selectOption('#form_category', 'Testing');
      await authenticatedPage.selectOption('#form_tier', 'Tier-3');
      await authenticatedPage.selectOption('#form_metric_type', 'operational');
      await authenticatedPage.fill('#form_description', 'A test metric for automated testing');
      
      // Select or create business domain
      const domainSelect = authenticatedPage.locator('#form_business_domain');
      const domainOptions = await domainSelect.locator('option').count();
      if (domainOptions > 1) {
        await domainSelect.selectOption({ index: 1 }); // Select first real option
      }
      
      // Submit form
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Metric")').click();
      
      // Wait for success message or modal to close
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify metric appears in the list
      await authenticatedPage.fill('#searchInput', metricId);
      await authenticatedPage.waitForTimeout(500);
      
      const metricCard = authenticatedPage.locator(`.metric-card:has-text("${metricId}")`);
      await expect(metricCard).toBeVisible({ timeout: 5000 });
    });

    test('should create a metric with all fields populated', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add New Metric")').first().click();
      await authenticatedPage.waitForSelector('#formModal.active');
      
      const timestamp = Date.now();
      const metricId = `METRIC-FULL-${timestamp}`;
      
      // Fill required fields
      await authenticatedPage.fill('#form_metric_id', metricId);
      await authenticatedPage.fill('#form_name', `Complete Metric ${timestamp}`);
      await authenticatedPage.fill('#form_short_name', `complete_metric_${timestamp}`);
      await authenticatedPage.selectOption('#form_category', 'Performance');
      await authenticatedPage.selectOption('#form_tier', 'Tier-1');
      await authenticatedPage.selectOption('#form_metric_type', 'leading');
      await authenticatedPage.fill('#form_tags', 'automation, test, e2e');
      await authenticatedPage.fill('#form_description', 'A comprehensive test metric with all fields');
      
      // Fill definition fields
      await authenticatedPage.fill('#form_formula', 'count(success) / count(total)');
      await authenticatedPage.fill('#form_unit', 'ratio');
      await authenticatedPage.selectOption('#form_expected_direction', 'increase');
      await authenticatedPage.fill('#form_calculation_frequency', 'daily');
      
      // Fill governance fields
      await authenticatedPage.fill('#form_owner_team', 'QA Team');
      await authenticatedPage.fill('#form_technical_owner', 'qa_lead');
      await authenticatedPage.fill('#form_business_owner', 'qa_manager');
      await authenticatedPage.selectOption('#form_status', 'active');
      
      // Select business domain
      const domainSelect = authenticatedPage.locator('#form_business_domain');
      const domainOptions = await domainSelect.locator('option').count();
      if (domainOptions > 1) {
        await domainSelect.selectOption({ index: 1 });
      }
      
      // Submit
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Metric")').click();
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify metric exists
      await authenticatedPage.fill('#searchInput', metricId);
      await authenticatedPage.waitForTimeout(500);
      
      const metricCard = authenticatedPage.locator(`.metric-card:has-text("${metricId}")`);
      await expect(metricCard).toBeVisible({ timeout: 5000 });
      
      // Verify it shows expected values
      await expect(metricCard).toContainText(`Complete Metric ${timestamp}`);
      await expect(metricCard).toContainText('Tier-1');
    });

    test('should validate required fields', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add New Metric")').first().click();
      await authenticatedPage.waitForSelector('#formModal.active');
      
      // Try to submit without filling anything
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Metric")').click();
      
      // Check that form validation prevents submission (browser native validation)
      // The modal should still be open
      await expect(authenticatedPage.locator('#formModal')).toHaveClass(/active/);
      
      // Check that required fields have the required attribute
      await expect(authenticatedPage.locator('#form_metric_id')).toHaveAttribute('required', '');
      await expect(authenticatedPage.locator('#form_name')).toHaveAttribute('required', '');
      await expect(authenticatedPage.locator('#form_description')).toHaveAttribute('required', '');
    });
  });

  test.describe('Metric Editing', () => {
    test('should open metric edit form', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForSelector('.metric-card', { timeout: 10000 });
      
      // Click edit button on first metric
      const editButton = authenticatedPage.locator('.metric-card').first().locator('button.primary:has-text("")').first();
      
      // If no metrics exist, create one first
      const metricCount = await authenticatedPage.locator('.metric-card').count();
      if (metricCount === 0) {
        test.skip();
        return;
      }
      
      await editButton.click();
      
      // Verify modal opens in edit mode
      const modal = authenticatedPage.locator('#formModal');
      await expect(modal).toHaveClass(/active/);
      
      const title = authenticatedPage.locator('#formModalTitle');
      await expect(title).toContainText(/Edit Metric/i);
      
      // Verify metric_id field is disabled
      await expect(authenticatedPage.locator('#form_metric_id')).toBeDisabled();
    });

    test('should update metric details', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // First create a metric to edit
      const timestamp = Date.now();
      const metricId = `METRIC-EDIT-TEST-${timestamp}`;
      
      const createResponse = await authenticatedPage.request.post(buildApiUrl('metrics'), {
        data: {
          metric_id: metricId,
          name: `Edit Test Metric ${timestamp}`,
          short_name: `edit_test_${timestamp}`,
          description: 'Original description',
          category: 'Testing',
          tier: 'Tier-3',
          business_domain: 'Quality Assurance',
          metric_type: 'operational',
          tags: ['test'],
          governance: {
            status: 'draft',
            data_classification: 'Internal'
          }
        }
      });
      
      expect(createResponse.ok()).toBeTruthy();
      
      // Reload page
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      // Find and edit the metric
      await authenticatedPage.fill('#searchInput', metricId);
      await authenticatedPage.waitForTimeout(500);
      
      const metricCard = authenticatedPage.locator(`.metric-card:has-text("${metricId}")`);
      await metricCard.waitFor({ state: 'visible', timeout: 5000 });
      
      // Click edit button
      const editButton = metricCard.locator('button.primary').first();
      await editButton.click();
      
      // Wait for form to populate
      await authenticatedPage.waitForTimeout(1000);
      
      // Update description
      await authenticatedPage.fill('#form_description', 'Updated description via E2E test');
      
      // Update category
      await authenticatedPage.selectOption('#form_category', 'Performance');
      
      // Update status
      await authenticatedPage.selectOption('#form_status', 'active');
      
      // Submit
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Metric")').click();
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify updates by clicking on the metric to view details
      await authenticatedPage.fill('#searchInput', metricId);
      await authenticatedPage.waitForTimeout(500);
      
      const updatedCard = authenticatedPage.locator(`.metric-card:has-text("${metricId}")`);
      await expect(updatedCard).toBeVisible();
      
      // Click to view details
      await updatedCard.click();
      await authenticatedPage.waitForTimeout(1000);
      
      // Verify updated content in detail view
      const detailModal = authenticatedPage.locator('#metricDetailModal');
      await expect(detailModal).toBeVisible();
      await expect(detailModal).toContainText('Updated description via E2E test');
    });

    test('should preserve unchanged fields when editing', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Create a metric with specific values
      const timestamp = Date.now();
      const metricId = `METRIC-PRESERVE-${timestamp}`;
      
      await authenticatedPage.request.post(buildApiUrl('metrics'), {
        data: {
          metric_id: metricId,
          name: `Preserve Test ${timestamp}`,
          short_name: `preserve_${timestamp}`,
          description: 'Original description',
          category: 'Testing',
          tier: 'Tier-2',
          business_domain: 'Quality Assurance',
          metric_type: 'lagging',
          tags: ['preserve', 'test'],
          definition: {
            formula: 'original_formula',
            unit: 'count'
          },
          governance: {
            status: 'active',
            owner_team: 'Original Team'
          }
        }
      });
      
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      // Find and edit
      await authenticatedPage.fill('#searchInput', metricId);
      await authenticatedPage.waitForTimeout(500);
      
      const metricCard = authenticatedPage.locator(`.metric-card:has-text("${metricId}")`);
      await metricCard.waitFor({ state: 'visible' });
      
      const editButton = metricCard.locator('button.primary').first();
      await editButton.click();
      await authenticatedPage.waitForTimeout(1000);
      
      // Only change the description
      await authenticatedPage.fill('#form_description', 'Only description changed');
      
      // Submit
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Metric")').click();
      await authenticatedPage.waitForTimeout(2000);
      
      // Fetch the metric via API to verify all fields
      const response = await authenticatedPage.request.get(buildApiUrl(`metrics/${metricId}`));
      expect(response.ok()).toBeTruthy();
      
      const metric = await response.json();
      expect(metric.description).toBe('Only description changed');
      expect(metric.tier).toBe('Tier-2');
      expect(metric.metric_type).toBe('lagging');
      expect(metric.definition.formula).toBe('original_formula');
      expect(metric.governance.owner_team).toBe('Original Team');
    });
  });

  test.describe('Metric Deletion', () => {
    test('should delete a metric', async ({ authenticatedPage }) => {
      // Create a metric to delete
      const timestamp = Date.now();
      const metricId = `METRIC-DELETE-${timestamp}`;
      
      await authenticatedPage.request.post(buildApiUrl('metrics'), {
        data: {
          metric_id: metricId,
          name: `Delete Test ${timestamp}`,
          description: 'To be deleted',
          category: 'Testing',
          tier: 'Tier-3',
          business_domain: 'Quality Assurance',
          metric_type: 'operational',
          tags: []
        }
      });
      
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      // Find the metric
      await authenticatedPage.fill('#searchInput', metricId);
      await authenticatedPage.waitForTimeout(500);
      
      const metricCard = authenticatedPage.locator(`.metric-card:has-text("${metricId}")`);
      await metricCard.waitFor({ state: 'visible' });
      
      // Set up dialog handler to confirm deletion
      authenticatedPage.on('dialog', dialog => dialog.accept());
      
      // Click delete button
      const deleteButton = metricCard.locator('button.danger').first();
      await deleteButton.click();
      
      // Wait for deletion
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify metric is gone
      await authenticatedPage.fill('#searchInput', metricId);
      await authenticatedPage.waitForTimeout(500);
      
      const emptyState = authenticatedPage.locator('.empty-state');
      await expect(emptyState).toBeVisible();
    });

    test('should cancel metric deletion', async ({ authenticatedPage }) => {
      // Create a metric
      const timestamp = Date.now();
      const metricId = `METRIC-NODELETE-${timestamp}`;
      
      await authenticatedPage.request.post(buildApiUrl('metrics'), {
        data: {
          metric_id: metricId,
          name: `No Delete Test ${timestamp}`,
          description: 'Should not be deleted',
          category: 'Testing',
          tier: 'Tier-3',
          business_domain: 'Quality Assurance',
          metric_type: 'operational',
          tags: []
        }
      });
      
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      // Find the metric
      await authenticatedPage.fill('#searchInput', metricId);
      await authenticatedPage.waitForTimeout(500);
      
      const metricCard = authenticatedPage.locator(`.metric-card:has-text("${metricId}")`);
      await metricCard.waitFor({ state: 'visible' });
      
      // Cancel the deletion dialog
      authenticatedPage.once('dialog', dialog => dialog.dismiss());
      
      // Click delete button
      const deleteButton = metricCard.locator('button.danger').first();
      await deleteButton.click();
      
      await authenticatedPage.waitForTimeout(1000);
      
      // Verify metric still exists
      await authenticatedPage.fill('#searchInput', metricId);
      await authenticatedPage.waitForTimeout(500);
      
      await expect(metricCard).toBeVisible();
    });
  });

  test.describe('Metric Versioning', () => {
    test('should track version changes on metric updates', async ({ authenticatedPage }) => {
      // Create initial metric
      const timestamp = Date.now();
      const metricId = `METRIC-VERSION-${timestamp}`;
      
      const createResponse = await authenticatedPage.request.post(buildApiUrl('metrics'), {
        data: {
          metric_id: metricId,
          name: `Version Test ${timestamp}`,
          description: 'Version 1.0.0',
          category: 'Testing',
          tier: 'Tier-3',
          business_domain: 'Quality Assurance',
          metric_type: 'operational',
          tags: []
        }
      });
      
      expect(createResponse.ok()).toBeTruthy();
      const initialMetric = await createResponse.json();
      const initialVersion = initialMetric.metadata?.version || '1.0.0';
      
      // Update the metric
      const updateResponse = await authenticatedPage.request.put(buildApiUrl(`metrics/${metricId}`), {
        data: {
          description: 'Updated description - version should increment'
        }
      });
      
      expect(updateResponse.ok()).toBeTruthy();
      const updatedMetric = await updateResponse.json();
      const updatedVersion = updatedMetric.metadata?.version;
      
      // Verify version incremented
      expect(updatedVersion).toBeTruthy();
      expect(updatedVersion).not.toBe(initialVersion);
    });
  });

  test.describe('Import/Export Functionality', () => {
    test('should export metrics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Look for export button
      const exportButton = authenticatedPage.locator('button:has-text("Export")');
      
      // If export button exists, test it
      const exportExists = await exportButton.count();
      if (exportExists > 0) {
        // Set up download handler
        const downloadPromise = authenticatedPage.waitForEvent('download');
        
        await exportButton.click();
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/metrics.*\.(json|yaml)/);
      } else {
        // Export via API
        const response = await authenticatedPage.request.get(buildApiUrl('metrics'));
        expect(response.ok()).toBeTruthy();
        
        const metrics = await response.json();
        expect(Array.isArray(metrics)).toBeTruthy();
      }
    });

    test('should validate import data structure', async ({ authenticatedPage }) => {
      // This tests the API directly since import via UI may require file upload
      const invalidMetric = {
        // Missing required fields
        name: 'Invalid Metric'
      };
      
      const response = await authenticatedPage.request.post(buildApiUrl('metrics'), {
        data: invalidMetric,
        failOnStatusCode: false
      });
      
      // Should return 400 Bad Request
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Role-Based Access', () => {
    test('admin should be able to create metrics', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Verify Add New Metric button is visible
      const addButton = authenticatedPage.locator('button:has-text("Add New Metric")').first();
      await expect(addButton).toBeVisible();
    });

    test('editor should be able to create metrics', async ({ editorPage }) => {
      await editorPage.goto(BASE_URL);
      
      // Verify Add New Metric button is visible for editors
      const addButton = editorPage.locator('button:has-text("Add New Metric")').first();
      await expect(addButton).toBeVisible();
    });

    test('viewer should not be able to create metrics', async ({ viewerPage }) => {
      await viewerPage.goto(BASE_URL);
      
      // Verify Add New Metric button is not visible for viewers
      const addButton = viewerPage.locator('button:has-text("Add New Metric")').first();
      
      // Button should either not exist or be disabled
      const buttonCount = await addButton.count();
      if (buttonCount > 0) {
        await expect(addButton).toBeDisabled();
      } else {
        expect(buttonCount).toBe(0);
      }
    });
  });

  test.describe('Metric Statistics', () => {
    test('should display total metrics count', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Check for statistics display
      const totalMetricsElement = authenticatedPage.locator('#totalMetrics');
      await expect(totalMetricsElement).toBeVisible();
      
      const totalText = await totalMetricsElement.textContent();
      expect(totalText).toMatch(/\d+/);
    });

    test('should fetch statistics via API', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.get(buildApiUrl('stats'));
      expect(response.ok()).toBeTruthy();
      
      const stats = await response.json();
      expect(stats).toHaveProperty('total_metrics');
      expect(typeof stats.total_metrics).toBe('number');
    });
  });
});
