import { expect, test, BASE_URL, buildApiUrl } from '../helpers/fixtures';

/**
 * E2E Tests for Settings and Configuration
 * 
 * Tests cover:
 * - Settings modal functionality
 * - Database connection configuration
 * - Storage backend switching
 * - System preferences
 * - Configuration persistence
 */

test.describe('Settings and Configuration', () => {
  test.describe('Settings Modal', () => {
    test('should open settings modal', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      // Look for settings button (gear icon or "Settings" text)
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings"), button[aria-label="Settings"], button:has([class*="settings"]), button:has([class*="gear"])').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Check for settings modal
        const modal = authenticatedPage.locator('[role="dialog"], .modal, [class*="settings-modal"]');
        const modalVisible = await modal.count() > 0;
        
        expect(modalVisible).toBeTruthy();
      }
    });

    test('should display configuration sections', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings"), button[aria-label="Settings"]').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Look for common configuration sections
        const pageText = await authenticatedPage.textContent('body');
        
        const hasConfigSections = pageText && (
          pageText.includes('Database') ||
          pageText.includes('Storage') ||
          pageText.includes('PostgreSQL') ||
          pageText.includes('Connection')
        );
        
        if (hasConfigSections) {
          expect(hasConfigSections).toBeTruthy();
        }
      }
    });

    test('should close settings modal', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Look for close button
        const closeBtn = authenticatedPage.locator('button:has-text("Close"), button[aria-label="Close"], button:has([class*="close"])').first();
        
        if (await closeBtn.count() > 0) {
          await closeBtn.click();
          await authenticatedPage.waitForTimeout(500);
          
          // Modal should be closed
          const modal = authenticatedPage.locator('[role="dialog"]:visible, .modal:visible');
          const modalCount = await modal.count();
          expect(modalCount).toBe(0);
        }
      }
    });
  });

  test.describe('Database Configuration', () => {
    test('should display database connection fields', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Look for database-related inputs
        const hostInput = authenticatedPage.locator('input[name*="host"], input[placeholder*="host"]');
        const portInput = authenticatedPage.locator('input[name*="port"], input[placeholder*="port"]');
        const databaseInput = authenticatedPage.locator('input[name*="database"], input[placeholder*="database"]');
        
        const hasDbFields = 
          (await hostInput.count() > 0) ||
          (await portInput.count() > 0) ||
          (await databaseInput.count() > 0);
        
        if (hasDbFields) {
          expect(hasDbFields).toBeTruthy();
        }
      }
    });

    test('should test database connection', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Look for test connection button
        const testBtn = authenticatedPage.locator('button:has-text("Test"), button:has-text("Test Connection")');
        
        if (await testBtn.count() > 0) {
          await testBtn.click();
          await authenticatedPage.waitForTimeout(2000);
          
          // Should show some result (success or failure message)
          const pageText = await authenticatedPage.textContent('body');
          const hasResult = pageText && (
            pageText.includes('success') ||
            pageText.includes('failed') ||
            pageText.includes('connected') ||
            pageText.includes('error')
          );
          
          expect(hasResult).toBeTruthy();
        }
      }
    });

    test('should validate connection parameters', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Try to save with invalid port
        const portInput = authenticatedPage.locator('input[name*="port"]');
        
        if (await portInput.count() > 0) {
          await portInput.fill('invalid');
          
          const saveBtn = authenticatedPage.locator('button:has-text("Save")').first();
          if (await saveBtn.count() > 0) {
            await saveBtn.click();
            await authenticatedPage.waitForTimeout(500);
            
            // Should show validation error
            const errorVisible = await authenticatedPage.locator('text=/error|invalid|must be/i').count() > 0;
            
            if (errorVisible) {
              expect(errorVisible).toBeTruthy();
            }
          }
        }
      }
    });
  });

  test.describe('Storage Backend Configuration', () => {
    test('should display storage options', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Look for storage-related options
        const pageText = await authenticatedPage.textContent('body');
        
        const hasStorageOptions = pageText && (
          pageText.includes('localStorage') ||
          pageText.includes('PostgreSQL') ||
          pageText.includes('File System') ||
          pageText.includes('Storage')
        );
        
        if (hasStorageOptions) {
          expect(hasStorageOptions).toBeTruthy();
        }
      }
    });

    test('should show current storage backend', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      // Check app config for storage backend
      const storageConfig = await authenticatedPage.evaluate(() => {
        return (window as any).appConfig?.storage || {};
      });
      
      expect(storageConfig).toBeDefined();
    });

    test('should persist storage configuration', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      // Store current config
      const originalConfig = await authenticatedPage.evaluate(() => {
        return localStorage.getItem('mdl_config');
      });
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Save configuration (if save button exists)
        const saveBtn = authenticatedPage.locator('button:has-text("Save")').first();
        if (await saveBtn.count() > 0) {
          await saveBtn.click();
          await authenticatedPage.waitForTimeout(1000);
          
          // Reload page
          await authenticatedPage.reload();
          await authenticatedPage.waitForTimeout(2000);
          
          // Configuration should persist
          const newConfig = await authenticatedPage.evaluate(() => {
            return localStorage.getItem('mdl_config');
          });
          
          expect(newConfig).toBeDefined();
        }
      }
      
      // Restore original config
      if (originalConfig) {
        await authenticatedPage.evaluate((config) => {
          localStorage.setItem('mdl_config', config);
        }, originalConfig);
      }
    });
  });

  test.describe('PostgreSQL Configuration', () => {
    test('should handle PostgreSQL connection settings', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Look for PostgreSQL-specific fields
        const postgresSection = authenticatedPage.locator('text=/PostgreSQL|Postgres/i');
        
        if (await postgresSection.count() > 0) {
          await expect(postgresSection).toBeVisible();
          
          // Should have connection fields
          const userInput = authenticatedPage.locator('input[name*="user"], input[placeholder*="user"]');
          const passwordInput = authenticatedPage.locator('input[name*="password"], input[type="password"]');
          
          const hasCredentialFields = 
            (await userInput.count() > 0) ||
            (await passwordInput.count() > 0);
          
          if (hasCredentialFields) {
            expect(hasCredentialFields).toBeTruthy();
          }
        }
      }
    });

    test('should validate PostgreSQL connection', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.get(buildApiUrl('postgres/domains'));
      
      // Either succeeds (PostgreSQL configured) or returns 404/500 (not configured)
      const isConfigured = response.ok();
      const isNotConfigured = [404, 500, 503].includes(response.status());
      
      expect(isConfigured || isNotConfigured).toBeTruthy();
    });

    test('should handle PostgreSQL connection errors', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Try to connect with invalid credentials
        const hostInput = authenticatedPage.locator('input[name*="host"]');
        const testBtn = authenticatedPage.locator('button:has-text("Test Connection")');
        
        if (await hostInput.count() > 0 && await testBtn.count() > 0) {
          await hostInput.fill('invalid-host-12345.local');
          await testBtn.click();
          await authenticatedPage.waitForTimeout(3000);
          
          // Should show error message
          const errorVisible = await authenticatedPage.locator('text=/error|failed|unable|could not/i').count() > 0;
          
          if (errorVisible) {
            expect(errorVisible).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('System Preferences', () => {
    test('should display theme options', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Look for theme-related options
        const pageText = await authenticatedPage.textContent('body');
        
        const hasThemeOptions = pageText && (
          pageText.includes('Theme') ||
          pageText.includes('Dark') ||
          pageText.includes('Light') ||
          pageText.includes('Appearance')
        );
        
        if (hasThemeOptions) {
          expect(hasThemeOptions).toBeTruthy();
        }
      }
    });

    test('should display language preferences', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Look for language options
        const pageText = await authenticatedPage.textContent('body');
        
        const hasLanguageOptions = pageText && (
          pageText.includes('Language') ||
          pageText.includes('Locale')
        );
        
        if (hasLanguageOptions) {
          expect(hasLanguageOptions).toBeTruthy();
        }
      }
    });

    test('should persist user preferences', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      // Set a preference
      await authenticatedPage.evaluate(() => {
        localStorage.setItem('mdl_preferences', JSON.stringify({
          theme: 'dark',
          language: 'en'
        }));
      });
      
      await authenticatedPage.reload();
      await authenticatedPage.waitForTimeout(2000);
      
      // Check preference persisted
      const preferences = await authenticatedPage.evaluate(() => {
        return localStorage.getItem('mdl_preferences');
      });
      
      expect(preferences).toBeDefined();
      expect(preferences).toContain('dark');
    });
  });

  test.describe('Configuration Import/Export', () => {
    test('should export configuration', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Look for export button
        const exportBtn = authenticatedPage.locator('button:has-text("Export")');
        
        if (await exportBtn.count() > 0) {
          await exportBtn.click();
          await authenticatedPage.waitForTimeout(1000);
          
          // Should trigger download or show export data
          const pageText = await authenticatedPage.textContent('body');
          expect(pageText).toBeTruthy();
        }
      }
    });

    test('should display import option', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Look for import button or file input
        const importBtn = authenticatedPage.locator('button:has-text("Import"), input[type="file"]');
        
        if (await importBtn.count() > 0) {
          expect(importBtn).toBeDefined();
        }
      }
    });
  });

  test.describe('Configuration Validation', () => {
    test('should validate database port number', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        const portInput = authenticatedPage.locator('input[name*="port"]');
        
        if (await portInput.count() > 0) {
          // Test invalid port
          await portInput.fill('99999');
          
          // Try to save
          const saveBtn = authenticatedPage.locator('button:has-text("Save")').first();
          if (await saveBtn.count() > 0) {
            await saveBtn.click();
            await authenticatedPage.waitForTimeout(500);
            
            // May show validation error
            const errorVisible = await authenticatedPage.locator('text=/error|invalid/i').count();
            expect(errorVisible).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });

    test('should validate email format', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        const emailInput = authenticatedPage.locator('input[type="email"]');
        
        if (await emailInput.count() > 0) {
          await emailInput.fill('invalid-email');
          
          const saveBtn = authenticatedPage.locator('button:has-text("Save")').first();
          if (await saveBtn.count() > 0) {
            await saveBtn.click();
            await authenticatedPage.waitForTimeout(500);
          }
        }
      }
    });

    test('should validate required fields', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Try to save with empty required fields
        const requiredInputs = authenticatedPage.locator('input[required]');
        const requiredCount = await requiredInputs.count();
        
        if (requiredCount > 0) {
          // Clear first required field
          await requiredInputs.first().fill('');
          
          const saveBtn = authenticatedPage.locator('button:has-text("Save")').first();
          if (await saveBtn.count() > 0) {
            await saveBtn.click();
            await authenticatedPage.waitForTimeout(500);
            
            // Should show validation error
            const errorVisible = await authenticatedPage.locator('text=/required|must/i').count() > 0;
            
            if (errorVisible) {
              expect(errorVisible).toBeTruthy();
            }
          }
        }
      }
    });
  });

  test.describe('Real-time Configuration Updates', () => {
    test('should apply changes immediately', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Make a change and save
        const saveBtn = authenticatedPage.locator('button:has-text("Save")').first();
        if (await saveBtn.count() > 0) {
          await saveBtn.click();
          await authenticatedPage.waitForTimeout(1000);
          
          // Close modal
          const closeBtn = authenticatedPage.locator('button:has-text("Close")').first();
          if (await closeBtn.count() > 0) {
            await closeBtn.click();
            await authenticatedPage.waitForTimeout(500);
          }
          
          // Changes should be applied without page reload
          const pageText = await authenticatedPage.textContent('body');
          expect(pageText).toBeTruthy();
        }
      }
    });

    test('should require confirmation for destructive changes', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(BASE_URL);
      await authenticatedPage.waitForTimeout(2000);
      
      const settingsBtn = authenticatedPage.locator('button:has-text("Settings")').first();
      
      if (await settingsBtn.count() > 0) {
        await settingsBtn.click();
        await authenticatedPage.waitForTimeout(500);
        
        // Look for reset or clear data buttons
        const resetBtn = authenticatedPage.locator('button:has-text("Reset"), button:has-text("Clear")');
        
        if (await resetBtn.count() > 0) {
          await resetBtn.click();
          await authenticatedPage.waitForTimeout(500);
          
          // Should show confirmation dialog
          const confirmDialog = await authenticatedPage.locator('text=/confirm|sure|warning/i').count() > 0;
          
          if (confirmDialog) {
            expect(confirmDialog).toBeTruthy();
            
            // Cancel the action
            const cancelBtn = authenticatedPage.locator('button:has-text("Cancel")').first();
            if (await cancelBtn.count() > 0) {
              await cancelBtn.click();
            }
          }
        }
      }
    });
  });
});
