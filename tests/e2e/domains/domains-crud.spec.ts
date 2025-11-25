import { expect, test } from '../helpers/fixtures';

/**
 * E2E Tests for Business Domains CRUD Operations
 * 
 * Tests cover:
 * - Listing domains with metrics count
 * - Creating new domains with color picker
 * - Editing existing domains
 * - Deleting domains
 * - Domain validation
 * - Tier focus and key areas management
 * - Visual elements (colors, cards)
 */

test.describe('Business Domains Management', () => {
  test.describe('Domains Listing and Display', () => {
    test('should display business domains section', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      
      // Wait for page to load
      await authenticatedPage.waitForSelector('.section', { timeout: 10000 });
      
      // Check that Business Domains section exists
      const domainsHeading = authenticatedPage.locator('h2:has-text("Business Domains")');
      await expect(domainsHeading).toBeVisible();
      
      // Check for Add Domain button
      const addButton = authenticatedPage.locator('button:has-text("Add Domain")');
      await expect(addButton).toBeVisible();
    });

    test('should display domain cards with metrics count', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      // Check if any domains exist
      const domainCards = authenticatedPage.locator('.stat-card:has(h3)');
      const count = await domainCards.count();
      
      if (count > 0) {
        const firstCard = domainCards.first();
        
        // Verify card structure
        await expect(firstCard.locator('h3')).toBeVisible(); // Domain name
        await expect(firstCard.locator('.value')).toBeVisible(); // Metrics count
        
        // Check that description is present
        const description = firstCard.locator('p');
        await expect(description).toBeVisible();
      }
    });

    test('should display domain colors', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      // Check if domains have color styling
      const domainCards = authenticatedPage.locator('.stat-card[style*="border-left"]');
      const count = await domainCards.count();
      
      if (count > 0) {
        const firstCard = domainCards.first();
        const style = await firstCard.getAttribute('style');
        
        // Verify color is applied
        expect(style).toContain('border-left');
        expect(style).toMatch(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/); // Hex color pattern
      }
    });

    test('should show domain statistics in header', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      
      // Check for total domains stat card
      const totalDomainsElement = authenticatedPage.locator('#totalDomains');
      await expect(totalDomainsElement).toBeVisible();
      
      const count = await totalDomainsElement.textContent();
      expect(count).toMatch(/\d+/);
    });
  });

  test.describe('Domain Creation', () => {
    test('should open domain creation form', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      
      // Click Add Domain button
      const addButton = authenticatedPage.locator('button:has-text("Add Domain")').first();
      await addButton.click();
      
      // Verify modal opens
      const modal = authenticatedPage.locator('#domainFormModal');
      await expect(modal).toHaveClass(/active/);
      
      // Verify form title
      const title = authenticatedPage.locator('#domainFormModalTitle');
      await expect(title).toContainText(/Add New Domain/i);
      
      // Verify required fields are present
      await expect(authenticatedPage.locator('#dom_domain_id')).toBeVisible();
      await expect(authenticatedPage.locator('#dom_name')).toBeVisible();
      await expect(authenticatedPage.locator('#dom_owner_team')).toBeVisible();
      await expect(authenticatedPage.locator('#dom_contact_email')).toBeVisible();
      await expect(authenticatedPage.locator('#dom_color')).toBeVisible();
      await expect(authenticatedPage.locator('#dom_description')).toBeVisible();
    });

    test('should have color picker with default value', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add Domain")').first().click();
      await authenticatedPage.waitForSelector('#domainFormModal.active');
      
      // Check color input
      const colorInput = authenticatedPage.locator('#dom_color');
      await expect(colorInput).toHaveAttribute('type', 'color');
      
      const defaultColor = await colorInput.inputValue();
      expect(defaultColor).toMatch(/#[0-9a-fA-F]{6}/);
    });

    test('should create a new domain with required fields', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add Domain")').first().click();
      await authenticatedPage.waitForSelector('#domainFormModal.active');
      
      const timestamp = Date.now();
      const domainId = `DOMAIN-TEST-${timestamp}`;
      
      // Fill required fields
      await authenticatedPage.fill('#dom_domain_id', domainId);
      await authenticatedPage.fill('#dom_name', `Test Domain ${timestamp}`);
      await authenticatedPage.fill('#dom_owner_team', 'QA Team');
      await authenticatedPage.fill('#dom_contact_email', 'qa@test.com');
      await authenticatedPage.fill('#dom_description', 'A test domain for E2E testing');
      
      // Select a color
      await authenticatedPage.fill('#dom_color', '#FF5733');
      
      // Submit form
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Domain")').click();
      
      // Wait for success
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify domain appears in the list
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      const domainCard = authenticatedPage.locator(`.stat-card:has-text("Test Domain ${timestamp}")`);
      await expect(domainCard).toBeVisible({ timeout: 5000 });
    });

    test('should create domain with all fields populated', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add Domain")').first().click();
      await authenticatedPage.waitForSelector('#domainFormModal.active');
      
      const timestamp = Date.now();
      const domainId = `DOMAIN-FULL-${timestamp}`;
      
      // Fill all fields
      await authenticatedPage.fill('#dom_domain_id', domainId);
      await authenticatedPage.fill('#dom_name', `Complete Domain ${timestamp}`);
      await authenticatedPage.fill('#dom_owner_team', 'Platform Team');
      await authenticatedPage.fill('#dom_contact_email', 'platform@test.com');
      await authenticatedPage.fill('#dom_color', '#3498db');
      await authenticatedPage.fill('#dom_tier_focus', 'Tier-1, Tier-2');
      await authenticatedPage.fill('#dom_description', 'A comprehensive domain with all fields');
      await authenticatedPage.fill('#dom_key_areas', 'Authentication, Authorization, Session Management');
      
      // Submit
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Domain")').click();
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify domain exists
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      const domainCard = authenticatedPage.locator(`.stat-card:has-text("Complete Domain ${timestamp}")`);
      await expect(domainCard).toBeVisible();
      
      // Verify it shows tier focus and key areas
      await expect(domainCard).toContainText('Tier-1');
      await expect(domainCard).toContainText('Authentication');
    });

    test('should validate required fields', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add Domain")').first().click();
      await authenticatedPage.waitForSelector('#domainFormModal.active');
      
      // Try to submit without filling anything
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Domain")').click();
      
      // Modal should still be open due to validation
      await expect(authenticatedPage.locator('#domainFormModal')).toHaveClass(/active/);
      
      // Check required attributes
      await expect(authenticatedPage.locator('#dom_domain_id')).toHaveAttribute('required', '');
      await expect(authenticatedPage.locator('#dom_name')).toHaveAttribute('required', '');
      await expect(authenticatedPage.locator('#dom_owner_team')).toHaveAttribute('required', '');
      await expect(authenticatedPage.locator('#dom_contact_email')).toHaveAttribute('required', '');
      await expect(authenticatedPage.locator('#dom_description')).toHaveAttribute('required', '');
    });

    test('should validate email format', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      
      // Open form
      await authenticatedPage.locator('button:has-text("Add Domain")').first().click();
      await authenticatedPage.waitForSelector('#domainFormModal.active');
      
      const timestamp = Date.now();
      
      // Fill fields with invalid email
      await authenticatedPage.fill('#dom_domain_id', `DOMAIN-EMAIL-${timestamp}`);
      await authenticatedPage.fill('#dom_name', `Email Test ${timestamp}`);
      await authenticatedPage.fill('#dom_owner_team', 'Test Team');
      await authenticatedPage.fill('#dom_contact_email', 'invalid-email');
      await authenticatedPage.fill('#dom_description', 'Testing email validation');
      
      // Try to submit
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Domain")').click();
      
      // Form should not submit (browser validation)
      await expect(authenticatedPage.locator('#domainFormModal')).toHaveClass(/active/);
      
      // Email field should have type="email"
      await expect(authenticatedPage.locator('#dom_contact_email')).toHaveAttribute('type', 'email');
    });
  });

  test.describe('Domain Editing', () => {
    test('should open domain edit form', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      // Check if any domains exist
      const domainCards = authenticatedPage.locator('.stat-card button.primary');
      const count = await domainCards.count();
      
      if (count === 0) {
        test.skip();
        return;
      }
      
      // Click edit button on first domain
      await domainCards.first().click();
      
      // Verify modal opens in edit mode
      const modal = authenticatedPage.locator('#domainFormModal');
      await expect(modal).toHaveClass(/active/);
      
      const title = authenticatedPage.locator('#domainFormModalTitle');
      await expect(title).toContainText(/Edit Domain/i);
      
      // Verify domain_id field is disabled
      await expect(authenticatedPage.locator('#dom_domain_id')).toBeDisabled();
    });

    test('should update domain details', async ({ authenticatedPage }) => {
      // First create a domain to edit
      const timestamp = Date.now();
      const domainId = `DOMAIN-EDIT-${timestamp}`;
      
      const createResponse = await authenticatedPage.request.post('http://localhost:3000/api/postgres/domains', {
        data: {
          dbConfig: {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || '5432',
            name: process.env.DB_NAME || 'mdl',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || ''
          },
          domain: {
            domain_id: domainId,
            name: `Edit Test ${timestamp}`,
            description: 'Original description',
            owner_team: 'Original Team',
            contact_email: 'original@test.com',
            color: '#FF0000',
            tier_focus: ['Tier-1'],
            key_areas: ['Area 1']
          }
        }
      });
      
      // Only proceed if PostgreSQL is configured
      if (!createResponse.ok()) {
        test.skip();
        return;
      }
      
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      // Find and edit the domain
      const domainCard = authenticatedPage.locator(`.stat-card:has-text("Edit Test ${timestamp}")`);
      await domainCard.waitFor({ state: 'visible', timeout: 5000 });
      
      // Click edit button
      const editButton = domainCard.locator('button.primary').first();
      await editButton.click();
      
      // Wait for form to populate
      await authenticatedPage.waitForTimeout(1000);
      
      // Update fields
      await authenticatedPage.fill('#dom_description', 'Updated description via E2E');
      await authenticatedPage.fill('#dom_owner_team', 'Updated Team');
      await authenticatedPage.fill('#dom_color', '#00FF00');
      
      // Submit
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Domain")').click();
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify updates
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      const updatedCard = authenticatedPage.locator(`.stat-card:has-text("Edit Test ${timestamp}")`);
      await expect(updatedCard).toBeVisible();
      await expect(updatedCard).toContainText('Updated description via E2E');
      await expect(updatedCard).toContainText('Updated Team');
    });

    test('should update domain color', async ({ authenticatedPage }) => {
      // Create a domain
      const timestamp = Date.now();
      const domainId = `DOMAIN-COLOR-${timestamp}`;
      
      const createResponse = await authenticatedPage.request.post('http://localhost:3000/api/postgres/domains', {
        data: {
          dbConfig: {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || '5432',
            name: process.env.DB_NAME || 'mdl',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || ''
          },
          domain: {
            domain_id: domainId,
            name: `Color Test ${timestamp}`,
            description: 'Testing color updates',
            owner_team: 'Test Team',
            contact_email: 'test@test.com',
            color: '#0000FF'
          }
        }
      });
      
      if (!createResponse.ok()) {
        test.skip();
        return;
      }
      
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      // Find domain
      const domainCard = authenticatedPage.locator(`.stat-card:has-text("Color Test ${timestamp}")`);
      await domainCard.waitFor({ state: 'visible' });
      
      // Verify initial color
      let style = await domainCard.getAttribute('style');
      expect(style).toContain('#0000FF');
      
      // Edit the domain
      const editButton = domainCard.locator('button.primary').first();
      await editButton.click();
      await authenticatedPage.waitForTimeout(1000);
      
      // Change color
      await authenticatedPage.fill('#dom_color', '#FFFF00');
      
      // Submit
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Domain")').click();
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify color changed
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      const updatedCard = authenticatedPage.locator(`.stat-card:has-text("Color Test ${timestamp}")`);
      style = await updatedCard.getAttribute('style');
      expect(style).toContain('#FFFF00');
    });

    test('should update tier focus and key areas', async ({ authenticatedPage }) => {
      const timestamp = Date.now();
      const domainId = `DOMAIN-TIERS-${timestamp}`;
      
      const createResponse = await authenticatedPage.request.post('http://localhost:3000/api/postgres/domains', {
        data: {
          dbConfig: {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || '5432',
            name: process.env.DB_NAME || 'mdl',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || ''
          },
          domain: {
            domain_id: domainId,
            name: `Tiers Test ${timestamp}`,
            description: 'Testing tier updates',
            owner_team: 'Test Team',
            contact_email: 'test@test.com',
            tier_focus: ['Tier-1'],
            key_areas: ['Original Area']
          }
        }
      });
      
      if (!createResponse.ok()) {
        test.skip();
        return;
      }
      
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      // Find and edit
      const domainCard = authenticatedPage.locator(`.stat-card:has-text("Tiers Test ${timestamp}")`);
      await domainCard.waitFor({ state: 'visible' });
      
      const editButton = domainCard.locator('button.primary').first();
      await editButton.click();
      await authenticatedPage.waitForTimeout(1000);
      
      // Update tier focus
      await authenticatedPage.fill('#dom_tier_focus', 'Tier-2, Tier-3');
      
      // Update key areas
      await authenticatedPage.fill('#dom_key_areas', 'New Area 1, New Area 2, New Area 3');
      
      // Submit
      await authenticatedPage.locator('button[type="submit"]:has-text("Save Domain")').click();
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify updates
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      const updatedCard = authenticatedPage.locator(`.stat-card:has-text("Tiers Test ${timestamp}")`);
      await expect(updatedCard).toContainText('Tier-2');
      await expect(updatedCard).toContainText('New Area 1');
    });
  });

  test.describe('Domain Deletion', () => {
    test('should delete a domain', async ({ authenticatedPage }) => {
      // Create a domain to delete
      const timestamp = Date.now();
      const domainId = `DOMAIN-DELETE-${timestamp}`;
      
      const createResponse = await authenticatedPage.request.post('http://localhost:3000/api/postgres/domains', {
        data: {
          dbConfig: {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || '5432',
            name: process.env.DB_NAME || 'mdl',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || ''
          },
          domain: {
            domain_id: domainId,
            name: `Delete Test ${timestamp}`,
            description: 'To be deleted',
            owner_team: 'Test Team',
            contact_email: 'test@test.com'
          }
        }
      });
      
      if (!createResponse.ok()) {
        test.skip();
        return;
      }
      
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      // Find the domain
      const domainCard = authenticatedPage.locator(`.stat-card:has-text("Delete Test ${timestamp}")`);
      await domainCard.waitFor({ state: 'visible' });
      
      // Set up dialog handler to confirm deletion
      authenticatedPage.on('dialog', dialog => dialog.accept());
      
      // Click delete button
      const deleteButton = domainCard.locator('button.danger').first();
      await deleteButton.click();
      
      // Wait for deletion
      await authenticatedPage.waitForTimeout(2000);
      
      // Verify domain is gone
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      const deletedCard = authenticatedPage.locator(`.stat-card:has-text("Delete Test ${timestamp}")`);
      await expect(deletedCard).not.toBeVisible();
    });

    test('should cancel domain deletion', async ({ authenticatedPage }) => {
      const timestamp = Date.now();
      const domainId = `DOMAIN-NODELETE-${timestamp}`;
      
      const createResponse = await authenticatedPage.request.post('http://localhost:3000/api/postgres/domains', {
        data: {
          dbConfig: {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || '5432',
            name: process.env.DB_NAME || 'mdl',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || ''
          },
          domain: {
            domain_id: domainId,
            name: `No Delete ${timestamp}`,
            description: 'Should not be deleted',
            owner_team: 'Test Team',
            contact_email: 'test@test.com'
          }
        }
      });
      
      if (!createResponse.ok()) {
        test.skip();
        return;
      }
      
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      // Find the domain
      const domainCard = authenticatedPage.locator(`.stat-card:has-text("No Delete ${timestamp}")`);
      await domainCard.waitFor({ state: 'visible' });
      
      // Cancel the deletion dialog
      authenticatedPage.once('dialog', dialog => dialog.dismiss());
      
      // Click delete button
      const deleteButton = domainCard.locator('button.danger').first();
      await deleteButton.click();
      
      await authenticatedPage.waitForTimeout(1000);
      
      // Verify domain still exists
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      await expect(domainCard).toBeVisible();
    });
  });

  test.describe('Domain-Metrics Relationship', () => {
    test('should show correct metrics count for domain', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      // Get a domain card
      const domainCards = authenticatedPage.locator('.stat-card h3');
      const count = await domainCards.count();
      
      if (count > 0) {
        const domainName = await domainCards.first().textContent();
        const domainCard = authenticatedPage.locator(`.stat-card:has-text("${domainName}")`).first();
        
        // Get the metrics count from the card
        const metricsValue = domainCard.locator('.value');
        const displayedCount = await metricsValue.textContent();
        
        // Verify it's a number
        expect(displayedCount).toMatch(/^\d+$/);
      }
    });

    test('should update metrics count when metric is created with domain', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      // Get initial counts
      const domainCards = authenticatedPage.locator('.stat-card h3');
      const count = await domainCards.count();
      
      if (count === 0) {
        test.skip();
        return;
      }
      
      const domainName = await domainCards.first().textContent();
      const domainCard = authenticatedPage.locator(`.stat-card:has-text("${domainName}")`).first();
      const initialCount = parseInt(await domainCard.locator('.value').textContent() || '0');
      
      // Create a metric in this domain
      const timestamp = Date.now();
      await authenticatedPage.request.post('http://localhost:3000/api/metrics', {
        data: {
          metric_id: `METRIC-DOMAIN-TEST-${timestamp}`,
          name: `Domain Metric ${timestamp}`,
          description: 'Testing domain relationship',
          category: 'Testing',
          tier: 'Tier-3',
          business_domain: domainName,
          metric_type: 'operational',
          tags: []
        }
      });
      
      // Refresh and check count
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      const updatedCard = authenticatedPage.locator(`.stat-card:has-text("${domainName}")`).first();
      const newCount = parseInt(await updatedCard.locator('.value').textContent() || '0');
      
      expect(newCount).toBeGreaterThan(initialCount);
    });
  });

  test.describe('Role-Based Access', () => {
    test('admin should be able to create domains', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      
      // Verify Add Domain button is visible
      const addButton = authenticatedPage.locator('button:has-text("Add Domain")').first();
      await expect(addButton).toBeVisible();
    });

    test('editor should be able to create domains', async ({ editorPage }) => {
      await editorPage.goto('http://localhost:3000');
      
      // Verify Add Domain button is visible for editors
      const addButton = editorPage.locator('button:has-text("Add Domain")').first();
      await expect(addButton).toBeVisible();
    });

    test('viewer should not be able to create domains', async ({ viewerPage }) => {
      await viewerPage.goto('http://localhost:3000');
      
      // Verify Add Domain button is not visible for viewers
      const addButton = viewerPage.locator('button:has-text("Add Domain")').first();
      
      const buttonCount = await addButton.count();
      if (buttonCount > 0) {
        await expect(addButton).toBeDisabled();
      } else {
        expect(buttonCount).toBe(0);
      }
    });
  });

  test.describe('Visual Consistency', () => {
    test('domain colors should be consistent across views', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      const domainCards = authenticatedPage.locator('.stat-card[style*="border-left"]');
      const count = await domainCards.count();
      
      if (count > 0) {
        const firstCard = domainCards.first();
        const style = await firstCard.getAttribute('style');
        
        // Extract color from style
        const colorMatch = style?.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/);
        
        if (colorMatch) {
          const color = colorMatch[0];
          const domainName = await firstCard.locator('h3').textContent();
          
          // Check that the same domain in different views uses the same color
          const allInstances = authenticatedPage.locator(`[style*="${color}"]`);
          const instanceCount = await allInstances.count();
          
          expect(instanceCount).toBeGreaterThan(0);
        }
      }
    });

    test('domain cards should have proper spacing and layout', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000');
      await authenticatedPage.waitForTimeout(1000);
      
      const domainCards = authenticatedPage.locator('.stat-card');
      const count = await domainCards.count();
      
      if (count > 0) {
        const firstCard = domainCards.first();
        
        // Check that card has proper structure
        await expect(firstCard.locator('h3')).toBeVisible();
        await expect(firstCard.locator('.value')).toBeVisible();
        await expect(firstCard.locator('p')).toBeVisible();
        
        // Check for action buttons
        const buttons = firstCard.locator('button');
        const buttonCount = await buttons.count();
        expect(buttonCount).toBeGreaterThanOrEqual(2); // Edit and Delete buttons
      }
    });
  });
});
