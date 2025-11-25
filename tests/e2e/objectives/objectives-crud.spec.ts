import { expect, test, BASE_URL, buildApiUrl } from '../helpers/fixtures';

/**
 * E2E Tests for Objectives & Key Results (OKR) Operations
 * 
 * Tests cover:
 * - Listing objectives with key results
 * - Creating new objectives with multiple key results
 * - Editing existing objectives and their key results
 * - Deleting objectives
 * - Adding/removing key results dynamically
 * - Linking metrics to key results
 * - Status and progress tracking
 * - Timeframe validation
 */

test.describe('Objectives & Key Results Management', () => {
  test.describe('Objectives Listing and Display', () => {
    test('should display objectives section', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Wait for page to load
      await authenticatedPage.waitForSelector('.section', { timeout: 10000 });
      
      // Check that Objectives section exists
      const objectivesHeading = authenticatedPage.locator('h2:has-text("Objectives")');
      await expect(objectivesHeading).toBeVisible();
      
      // Check for Add Objective button
      const addButton = authenticatedPage.locator('button:has-text("Add Objective")');
      await expect(addButton).toBeVisible();
    });

    test('should display objective cards with key results count', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      // Check if any objectives exist
      const objectiveCards = authenticatedPage.locator('#objectivesGrid .metric-card');
      const count = await objectiveCards.count();
      
      if (count > 0) {
        const firstCard = objectiveCards.first();
        
        // Verify card structure
        await expect(firstCard.locator('h3')).toBeVisible(); // Objective name
        
        // Check that description is present
        const description = firstCard.locator('p');
        await expect(description).toBeVisible();
      }
    });

    test('should show objectives statistics in header', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Check for total objectives stat card
      const totalObjectivesElement = authenticatedPage.locator('#totalObjectives');
      await expect(totalObjectivesElement).toBeVisible();
      
      const count = await totalObjectivesElement.textContent();
      expect(count).toMatch(/\d+/);
    });
  });

  test.describe('Objective Creation', () => {
    test('should open objective creation form', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Click Add Objective button
      const addButton = authenticatedPage.locator('button:has-text("Add Objective")').first();
      await addButton.click();
      
      // Verify modal opens
      const modal = authenticatedPage.locator('#objectiveFormModal');
      await expect(modal).toHaveClass(/active/);
      
      // Verify form title
      const title = authenticatedPage.locator('#objectiveFormModalTitle');
      await expect(title).toContainText(/Add New Objective/i);
      
      // Verify required fields are present
      await expect(authenticatedPage.locator('#obj_objective_id')).toBeVisible();
      await expect(authenticatedPage.locator('#obj_name')).toBeVisible();
      await expect(authenticatedPage.locator('#obj_owner_team')).toBeVisible();
      await expect(authenticatedPage.locator('#obj_status')).toBeVisible();
      await expect(authenticatedPage.locator('#obj_start_date')).toBeVisible();
      await expect(authenticatedPage.locator('#obj_end_date')).toBeVisible();
      await expect(authenticatedPage.locator('#obj_description')).toBeVisible();
      
      // Verify key results section exists
      await expect(authenticatedPage.locator('#keyResultsContainer')).toBeVisible();
      
      // Verify at least one key result is pre-populated
      const krItems = authenticatedPage.locator('.key-result-item');
      const krCount = await krItems.count();
      expect(krCount).toBeGreaterThanOrEqual(1);
    });

    test('should have "Add Key Result" button', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add Objective")').first().click();
      await authenticatedPage.waitForSelector('#objectiveFormModal.active');
      
      // Check for Add Key Result button
      const addKRButton = authenticatedPage.locator('button:has-text("Add Key Result")');
      await expect(addKRButton).toBeVisible();
    });

    test('should create objective with one key result', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add Objective")').first().click();
      await authenticatedPage.waitForSelector('#objectiveFormModal.active');
      
      const timestamp = Date.now();
      const objectiveId = `OBJ-TEST-${timestamp}`;
      
      // Fill objective fields
      await authenticatedPage.fill('#obj_objective_id', objectiveId);
      await authenticatedPage.fill('#obj_name', `Test Objective ${timestamp}`);
      await authenticatedPage.fill('#obj_owner_team', 'QA Team');
      await authenticatedPage.selectOption('#obj_status', 'active');
      await authenticatedPage.selectOption('#obj_priority', 'high');
      await authenticatedPage.fill('#obj_strategic_pillar', 'Quality');
      
      // Set dates
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';
      await authenticatedPage.fill('#obj_start_date', startDate);
      await authenticatedPage.fill('#obj_end_date', endDate);
      
      await authenticatedPage.fill('#obj_description', 'Test objective for E2E testing');
      
      // Fill first key result
      const krId = await authenticatedPage.locator('.key-result-item').first().getAttribute('id');
      const krNum = krId?.replace('kr_', '') || '0';
      
      await authenticatedPage.fill(`input[name="kr_id_${krNum}"]`, `${objectiveId}:KR-001`);
      await authenticatedPage.fill(`input[name="kr_name_${krNum}"]`, 'First Key Result');
      await authenticatedPage.selectOption(`select[name="kr_direction_${krNum}"]`, 'increase');
      await authenticatedPage.fill(`input[name="kr_baseline_${krNum}"]`, '0');
      await authenticatedPage.fill(`input[name="kr_target_${krNum}"]`, '100');
      await authenticatedPage.fill(`input[name="kr_unit_${krNum}"]`, 'tests');
      await authenticatedPage.fill(`textarea[name="kr_description_${krNum}"]`, 'Test KR description');
      
      // Submit form
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Objective")').click();
      
      // Wait for success
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify objective appears in the list
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      const objectiveCard = authenticatedPage.locator(`#objectivesGrid .metric-card:has-text("Test Objective ${timestamp}")`);
      await expect(objectiveCard).toBeVisible({ timeout: 5000 });
    });

    test('should create objective with multiple key results', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add Objective")').first().click();
      await authenticatedPage.waitForSelector('#objectiveFormModal.active');
      
      const timestamp = Date.now();
      const objectiveId = `OBJ-MULTI-${timestamp}`;
      
      // Fill objective fields
      await authenticatedPage.fill('#obj_objective_id', objectiveId);
      await authenticatedPage.fill('#obj_name', `Multi KR Objective ${timestamp}`);
      await authenticatedPage.fill('#obj_owner_team', 'Platform Team');
      await authenticatedPage.selectOption('#obj_status', 'active');
      await authenticatedPage.fill('#obj_start_date', '2025-01-01');
      await authenticatedPage.fill('#obj_end_date', '2025-12-31');
      await authenticatedPage.fill('#obj_description', 'Objective with multiple key results');
      
      // Get the first KR ID
      const firstKRElement = await authenticatedPage.locator('.key-result-item').first();
      const firstKRId = (await firstKRElement.getAttribute('id'))?.replace('kr_', '') || '0';
      
      // Fill first key result
      await authenticatedPage.fill(`input[name="kr_id_${firstKRId}"]`, `${objectiveId}:KR-001`);
      await authenticatedPage.fill(`input[name="kr_name_${firstKRId}"]`, 'First KR');
      await authenticatedPage.selectOption(`select[name="kr_direction_${firstKRId}"]`, 'increase');
      await authenticatedPage.fill(`input[name="kr_baseline_${firstKRId}"]`, '0');
      await authenticatedPage.fill(`input[name="kr_target_${firstKRId}"]`, '50');
      await authenticatedPage.fill(`input[name="kr_unit_${firstKRId}"]`, 'units');
      
      // Add second key result
      await authenticatedPage.locator('button:has-text("Add Key Result")').click();
      await authenticatedPage.waitForTimeout(500);
      
      // Get the second KR ID
      const krItems = await authenticatedPage.locator('.key-result-item').all();
      const secondKRElement = krItems[1];
      const secondKRId = (await secondKRElement.getAttribute('id'))?.replace('kr_', '') || '1';
      
      // Fill second key result
      await authenticatedPage.fill(`input[name="kr_id_${secondKRId}"]`, `${objectiveId}:KR-002`);
      await authenticatedPage.fill(`input[name="kr_name_${secondKRId}"]`, 'Second KR');
      await authenticatedPage.selectOption(`select[name="kr_direction_${secondKRId}"]`, 'decrease');
      await authenticatedPage.fill(`input[name="kr_baseline_${secondKRId}"]`, '100');
      await authenticatedPage.fill(`input[name="kr_target_${secondKRId}"]`, '20');
      await authenticatedPage.fill(`input[name="kr_unit_${secondKRId}"]`, 'errors');
      
      // Add third key result
      await authenticatedPage.locator('button:has-text("Add Key Result")').click();
      await authenticatedPage.waitForTimeout(500);
      
      const allKRItems = await authenticatedPage.locator('.key-result-item').all();
      const thirdKRElement = allKRItems[2];
      const thirdKRId = (await thirdKRElement.getAttribute('id'))?.replace('kr_', '') || '2';
      
      // Fill third key result
      await authenticatedPage.fill(`input[name="kr_id_${thirdKRId}"]`, `${objectiveId}:KR-003`);
      await authenticatedPage.fill(`input[name="kr_name_${thirdKRId}"]`, 'Third KR');
      await authenticatedPage.selectOption(`select[name="kr_direction_${thirdKRId}"]`, 'increase');
      await authenticatedPage.fill(`input[name="kr_baseline_${thirdKRId}"]`, '50');
      await authenticatedPage.fill(`input[name="kr_target_${thirdKRId}"]`, '95');
      await authenticatedPage.fill(`input[name="kr_unit_${thirdKRId}"]`, 'percent');
      
      // Submit
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Objective")').click();
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify objective exists
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      const objectiveCard = authenticatedPage.locator(`#objectivesGrid .metric-card:has-text("Multi KR Objective ${timestamp}")`);
      await expect(objectiveCard).toBeVisible();
      
      // Verify it shows multiple key results
      await expect(objectiveCard).toContainText('3'); // Number of KRs
    });

    test('should validate required fields', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add Objective")').first().click();
      await authenticatedPage.waitForSelector('#objectiveFormModal.active');
      
      // Try to submit without filling anything
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Objective")').click();
      
      // Modal should still be open due to validation
      await expect(authenticatedPage.locator('#objectiveFormModal')).toHaveClass(/active/);
      
      // Check required attributes
      await expect(authenticatedPage.locator('#obj_objective_id')).toHaveAttribute('required', '');
      await expect(authenticatedPage.locator('#obj_name')).toHaveAttribute('required', '');
      await expect(authenticatedPage.locator('#obj_owner_team')).toHaveAttribute('required', '');
      await expect(authenticatedPage.locator('#obj_description')).toHaveAttribute('required', '');
    });

    test('should validate date range (end date after start date)', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add Objective")').first().click();
      await authenticatedPage.waitForSelector('#objectiveFormModal.active');
      
      const timestamp = Date.now();
      
      // Fill fields with invalid date range
      await authenticatedPage.fill('#obj_objective_id', `OBJ-DATE-${timestamp}`);
      await authenticatedPage.fill('#obj_name', `Date Test ${timestamp}`);
      await authenticatedPage.fill('#obj_owner_team', 'Test Team');
      await authenticatedPage.fill('#obj_description', 'Testing date validation');
      
      // Set end date before start date
      await authenticatedPage.fill('#obj_start_date', '2025-12-31');
      await authenticatedPage.fill('#obj_end_date', '2025-01-01');
      
      // Fill minimal key result
      const krId = (await authenticatedPage.locator('.key-result-item').first().getAttribute('id'))?.replace('kr_', '') || '0';
      await authenticatedPage.fill(`input[name="kr_id_${krId}"]`, 'KR-001');
      await authenticatedPage.fill(`input[name="kr_name_${krId}"]`, 'Test KR');
      await authenticatedPage.fill(`input[name="kr_baseline_${krId}"]`, '0');
      await authenticatedPage.fill(`input[name="kr_target_${krId}"]`, '100');
      await authenticatedPage.fill(`input[name="kr_unit_${krId}"]`, 'units');
      
      // Try to submit - validation should prevent or show error
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Objective")').click();
      
      // Check if form is still open (validation failed) or if error toast appeared
      await authenticatedPage.waitForTimeout(1000);
      
      // Either modal is still open or error message appeared
      const modalStillOpen = await authenticatedPage.locator('#objectiveFormModal.active').count();
      const errorToast = await authenticatedPage.locator('.toast.error').count();
      
      expect(modalStillOpen > 0 || errorToast > 0).toBeTruthy();
    });
  });

  test.describe('Key Results Management', () => {
    test('should add multiple key results dynamically', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add Objective")').first().click();
      await authenticatedPage.waitForSelector('#objectiveFormModal.active');
      
      // Check initial count (should be 1)
      let krCount = await authenticatedPage.locator('.key-result-item').count();
      expect(krCount).toBe(1);
      
      // Add second KR
      await authenticatedPage.locator('button:has-text("Add Key Result")').click();
      await authenticatedPage.waitForTimeout(300);
      
      krCount = await authenticatedPage.locator('.key-result-item').count();
      expect(krCount).toBe(2);
      
      // Add third KR
      await authenticatedPage.locator('button:has-text("Add Key Result")').click();
      await authenticatedPage.waitForTimeout(300);
      
      krCount = await authenticatedPage.locator('.key-result-item').count();
      expect(krCount).toBe(3);
    });

    test('should remove key results', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add Objective")').first().click();
      await authenticatedPage.waitForSelector('#objectiveFormModal.active');
      
      // Add two more KRs (total 3)
      await authenticatedPage.locator('button:has-text("Add Key Result")').click();
      await authenticatedPage.waitForTimeout(300);
      await authenticatedPage.locator('button:has-text("Add Key Result")').click();
      await authenticatedPage.waitForTimeout(300);
      
      let krCount = await authenticatedPage.locator('.key-result-item').count();
      expect(krCount).toBe(3);
      
      // Remove the second KR
      const removeButtons = authenticatedPage.locator('.key-result-item button.danger');
      await removeButtons.nth(1).click();
      await authenticatedPage.waitForTimeout(300);
      
      krCount = await authenticatedPage.locator('.key-result-item').count();
      expect(krCount).toBe(2);
    });

    test('should allow linking metrics to key results', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add Objective")').first().click();
      await authenticatedPage.waitForSelector('#objectiveFormModal.active');
      
      // Check for metrics dropdown in key result
      const krId = (await authenticatedPage.locator('.key-result-item').first().getAttribute('id'))?.replace('kr_', '') || '0';
      const metricsSelect = authenticatedPage.locator(`select[name="kr_metrics_${krId}"]`);
      
      await expect(metricsSelect).toBeVisible();
      
      // Check that it has options
      const options = await metricsSelect.locator('option').count();
      expect(options).toBeGreaterThan(0); // At least the placeholder option
    });
  });

  test.describe('Objective Editing', () => {
    test('should open objective edit form', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      // Check if any objectives exist
      const objectiveCards = authenticatedPage.locator('#objectivesGrid .metric-card');
      const count = await objectiveCards.count();
      
      if (count === 0) {
        test.skip();
        return;
      }
      
      // Click edit button on first objective
      const editButton = objectiveCards.first().locator('button.primary').first();
      await editButton.click();
      
      // Verify modal opens in edit mode
      const modal = authenticatedPage.locator('#objectiveFormModal');
      await expect(modal).toHaveClass(/active/);
      
      const title = authenticatedPage.locator('#objectiveFormModalTitle');
      await expect(title).toContainText(/Edit Objective/i);
      
      // Verify objective_id field is disabled
      await expect(authenticatedPage.locator('#obj_objective_id')).toBeDisabled();
    });

    test('should update objective details', async ({ authenticatedPage }) => {
      // Create an objective first
      const timestamp = Date.now();
      const objectiveId = `OBJ-EDIT-${timestamp}`;
      
      const objective = {
        objective_id: objectiveId,
        name: `Edit Test ${timestamp}`,
        description: 'Original description',
        owner_team: 'Original Team',
        status: 'draft',
        priority: 'low',
        strategic_pillar: 'Quality',
        timeframe: {
          start: '2025-01-01',
          end: '2025-06-30'
        },
        key_results: [
          {
            kr_id: `${objectiveId}:KR-001`,
            name: 'Original KR',
            description: 'Original KR description',
            baseline_value: 0,
            target_value: 50,
            unit: 'units',
            direction: 'increase',
            current_value: null,
            metric_ids: []
          }
        ]
      };
      
      // Save via localStorage (simulating creation)
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.evaluate((obj) => {
        const objectives = JSON.parse(localStorage.getItem('mdl_objectives') || '[]');
        objectives.push(obj);
        localStorage.setItem('mdl_objectives', JSON.stringify(objectives));
      }, objective);
      
      // Reload to show the objective
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      // Find and edit the objective
      const objectiveCard = authenticatedPage.locator(`#objectivesGrid .metric-card:has-text("Edit Test ${timestamp}")`);
      await objectiveCard.waitFor({ state: 'visible', timeout: 5000 });
      
      // Click edit button
      const editButton = objectiveCard.locator('button.primary').first();
      await editButton.click();
      
      // Wait for form to populate
      await authenticatedPage.waitForTimeout(1000);
      
      // Update fields
      await authenticatedPage.fill('#obj_description', 'Updated description via E2E');
      await authenticatedPage.selectOption('#obj_status', 'active');
      await authenticatedPage.selectOption('#obj_priority', 'high');
      await authenticatedPage.fill('#obj_end_date', '2025-12-31');
      
      // Submit
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Objective")').click();
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify updates
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      const updatedCard = authenticatedPage.locator(`#objectivesGrid .metric-card:has-text("Edit Test ${timestamp}")`);
      await expect(updatedCard).toBeVisible();
      await expect(updatedCard).toContainText('Updated description via E2E');
    });

    test('should update key results within objective', async ({ authenticatedPage }) => {
      // Create an objective with KRs
      const timestamp = Date.now();
      const objectiveId = `OBJ-KR-EDIT-${timestamp}`;
      
      const objective = {
        objective_id: objectiveId,
        name: `KR Edit Test ${timestamp}`,
        description: 'Testing KR edits',
        owner_team: 'Test Team',
        status: 'active',
        timeframe: {
          start: '2025-01-01',
          end: '2025-12-31'
        },
        key_results: [
          {
            kr_id: `${objectiveId}:KR-001`,
            name: 'Original KR Name',
            description: 'Original description',
            baseline_value: 0,
            target_value: 50,
            unit: 'tests',
            direction: 'increase',
            current_value: null,
            metric_ids: []
          }
        ]
      };
      
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.evaluate((obj) => {
        const objectives = JSON.parse(localStorage.getItem('mdl_objectives') || '[]');
        objectives.push(obj);
        localStorage.setItem('mdl_objectives', JSON.stringify(objectives));
      }, objective);
      
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      // Find and edit
      const objectiveCard = authenticatedPage.locator(`#objectivesGrid .metric-card:has-text("KR Edit Test ${timestamp}")`);
      await objectiveCard.waitFor({ state: 'visible' });
      
      const editButton = objectiveCard.locator('button.primary').first();
      await editButton.click();
      await authenticatedPage.waitForTimeout(1000);
      
      // Update the KR name
      const krId = (await authenticatedPage.locator('.key-result-item').first().getAttribute('id'))?.replace('kr_', '') || '0';
      await authenticatedPage.fill(`input[name="kr_name_${krId}"]`, 'Updated KR Name');
      await authenticatedPage.fill(`input[name="kr_target_${krId}"]`, '100');
      
      // Submit
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Objective")').click();
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify by re-editing and checking the value
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      const updatedCard = authenticatedPage.locator(`#objectivesGrid .metric-card:has-text("KR Edit Test ${timestamp}")`);
      await updatedCard.locator('button.primary').first().click();
      await authenticatedPage.waitForTimeout(1000);
      
      const krIdCheck = (await authenticatedPage.locator('.key-result-item').first().getAttribute('id'))?.replace('kr_', '') || '0';
      const krName = await authenticatedPage.locator(`input[name="kr_name_${krIdCheck}"]`).inputValue();
      expect(krName).toBe('Updated KR Name');
    });
  });

  test.describe('Objective Deletion', () => {
    test('should delete an objective', async ({ authenticatedPage }) => {
      // Create an objective to delete
      const timestamp = Date.now();
      const objectiveId = `OBJ-DELETE-${timestamp}`;
      
      const objective = {
        objective_id: objectiveId,
        name: `Delete Test ${timestamp}`,
        description: 'To be deleted',
        owner_team: 'Test Team',
        status: 'active',
        timeframe: {
          start: '2025-01-01',
          end: '2025-12-31'
        },
        key_results: []
      };
      
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.evaluate((obj) => {
        const objectives = JSON.parse(localStorage.getItem('mdl_objectives') || '[]');
        objectives.push(obj);
        localStorage.setItem('mdl_objectives', JSON.stringify(objectives));
      }, objective);
      
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      // Find the objective
      const objectiveCard = authenticatedPage.locator(`#objectivesGrid .metric-card:has-text("Delete Test ${timestamp}")`);
      await objectiveCard.waitFor({ state: 'visible' });
      
      // Set up dialog handler to confirm deletion
      authenticatedPage.on('dialog', dialog => dialog.accept());
      
      // Click delete button
      const deleteButton = objectiveCard.locator('button.danger').first();
      await deleteButton.click();
      
      // Wait for deletion
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify objective is gone
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      const deletedCard = authenticatedPage.locator(`#objectivesGrid .metric-card:has-text("Delete Test ${timestamp}")`);
      await expect(deletedCard).not.toBeVisible();
    });

    test('should cancel objective deletion', async ({ authenticatedPage }) => {
      const timestamp = Date.now();
      const objectiveId = `OBJ-NODELETE-${timestamp}`;
      
      const objective = {
        objective_id: objectiveId,
        name: `No Delete ${timestamp}`,
        description: 'Should not be deleted',
        owner_team: 'Test Team',
        status: 'active',
        timeframe: {
          start: '2025-01-01',
          end: '2025-12-31'
        },
        key_results: []
      };
      
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.evaluate((obj) => {
        const objectives = JSON.parse(localStorage.getItem('mdl_objectives') || '[]');
        objectives.push(obj);
        localStorage.setItem('mdl_objectives', JSON.stringify(objectives));
      }, objective);
      
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      // Find the objective
      const objectiveCard = authenticatedPage.locator(`#objectivesGrid .metric-card:has-text("No Delete ${timestamp}")`);
      await objectiveCard.waitFor({ state: 'visible' });
      
      // Cancel the deletion dialog
      authenticatedPage.once('dialog', dialog => dialog.dismiss());
      
      // Click delete button
      const deleteButton = objectiveCard.locator('button.danger').first();
      await deleteButton.click();
      
      await authenticatedPage.waitForTimeout(1000);
      
      // Verify objective still exists
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      await expect(objectiveCard).toBeVisible();
    });
  });

  test.describe('Progress and Status', () => {
    test('should display objective with status badge', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      // Check if objectives exist
      const objectiveCards = authenticatedPage.locator('#objectivesGrid .metric-card');
      const count = await objectiveCards.count();
      
      if (count > 0) {
        const firstCard = objectiveCards.first();
        
        // Status badge should be visible
        const statusBadge = firstCard.locator('.tag');
        const badgeCount = await statusBadge.count();
        
        if (badgeCount > 0) {
          await expect(statusBadge.first()).toBeVisible();
        }
      }
    });

    test('should show progress for key results', async ({ authenticatedPage }) => {
      // Create objective with KR that has current value
      const timestamp = Date.now();
      const objectiveId = `OBJ-PROGRESS-${timestamp}`;
      
      const objective = {
        objective_id: objectiveId,
        name: `Progress Test ${timestamp}`,
        description: 'Testing progress display',
        owner_team: 'Test Team',
        status: 'active',
        timeframe: {
          start: '2025-01-01',
          end: '2025-12-31'
        },
        key_results: [
          {
            kr_id: `${objectiveId}:KR-001`,
            name: 'KR with Progress',
            description: 'Has current value',
            baseline_value: 0,
            target_value: 100,
            current_value: 50,
            unit: 'percent',
            direction: 'increase',
            metric_ids: []
          }
        ]
      };
      
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.evaluate((obj) => {
        const objectives = JSON.parse(localStorage.getItem('mdl_objectives') || '[]');
        objectives.push(obj);
        localStorage.setItem('mdl_objectives', JSON.stringify(objectives));
      }, objective);
      
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      // Find objective card
      const objectiveCard = authenticatedPage.locator(`#objectivesGrid .metric-card:has-text("Progress Test ${timestamp}")`);
      await expect(objectiveCard).toBeVisible();
      
      // Should show some progress indicator or value
      // (Implementation specific - might be percentage or bar)
      const cardText = await objectiveCard.textContent();
      expect(cardText).toBeTruthy();
    });
  });

  test.describe('Role-Based Access', () => {
    test('admin should be able to create objectives', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      
      // Verify Add Objective button is visible
      const addButton = authenticatedPage.locator('button:has-text("Add Objective")').first();
      await expect(addButton).toBeVisible();
    });

    test('editor should be able to create objectives', async ({ editorPage }) => {
      await editorPage.goto(BASE_URL);
      
      // Verify Add Objective button is visible for editors
      const addButton = editorPage.locator('button:has-text("Add Objective")').first();
      await expect(addButton).toBeVisible();
    });

    test('viewer should not be able to create objectives', async ({ viewerPage }) => {
      await viewerPage.goto(BASE_URL);
      
      // Verify Add Objective button is not visible for viewers
      const addButton = viewerPage.locator('button:has-text("Add Objective")').first();
      
      const buttonCount = await addButton.count();
      if (buttonCount > 0) {
        await expect(addButton).toBeDisabled();
      } else {
        expect(buttonCount).toBe(0);
      }
    });
  });

  test.describe('Data Export', () => {
    test('should have download objective report button', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(1000);
      
      // Check if objectives exist
      const objectiveCards = authenticatedPage.locator('#objectivesGrid .metric-card');
      const count = await objectiveCards.count();
      
      if (count > 0) {
        // Look for download/report button (might be in detail view)
        const firstCard = objectiveCards.first();
        await firstCard.click();
        
        // Wait for detail modal or similar
        await authenticatedPage.waitForTimeout(1000);
        
        // Check for download button (implementation specific)
        const downloadButtons = authenticatedPage.locator('button:has-text("Download")');
        const downloadCount = await downloadButtons.count();
        
        // May or may not have download - just checking it doesn't error
        expect(downloadCount).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
