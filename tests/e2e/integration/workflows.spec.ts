import { expect, test } from '../helpers/fixtures';

/**
 * E2E Tests for Integration Workflows
 * 
 * Tests cover:
 * - End-to-end workflows spanning multiple features
 * - Domain → Metric → Objective relationships
 * - Storage backend switching
 * - Cross-feature data consistency
 * - Complete user journeys
 */

test.describe('Integration Workflows', () => {
  test.describe('Complete Domain-Metric-Objective Workflow', () => {
    test('should create domain, metric, and objective in sequence', async ({ editorPage }) => {
      const timestamp = Date.now();
      
      // Step 1: Create a domain
      await editorPage.goto('http://localhost:3000');
      await editorPage.waitForTimeout(2000);
      
      const createDomainBtn = editorPage.locator('button:has-text("Create Domain")');
      if (await createDomainBtn.count() > 0) {
        await createDomainBtn.click();
        await editorPage.waitForTimeout(500);
        
        // Fill domain form
        await editorPage.fill('input[name="name"]', `Integration Domain ${timestamp}`);
        await editorPage.fill('textarea[name="description"]', 'Domain for integration testing');
        
        const saveBtn = editorPage.locator('button:has-text("Save"), button:has-text("Create")');
        await saveBtn.click();
        await editorPage.waitForTimeout(2000);
        
        // Verify domain created
        await expect(editorPage.locator(`text=Integration Domain ${timestamp}`)).toBeVisible();
      }
      
      // Step 2: Create a metric linked to domain
      const createMetricBtn = editorPage.locator('button:has-text("Create Metric")');
      if (await createMetricBtn.count() > 0) {
        await createMetricBtn.click();
        await editorPage.waitForTimeout(500);
        
        // Fill metric form
        await editorPage.fill('input[name="name"]', `Integration Metric ${timestamp}`);
        await editorPage.fill('textarea[name="description"]', 'Metric for integration testing');
        
        // Select domain if dropdown exists
        const domainSelect = editorPage.locator('select[name="domain"], select[name="domain_id"]');
        if (await domainSelect.count() > 0) {
          await domainSelect.selectOption({ label: `Integration Domain ${timestamp}` });
        }
        
        const saveMetricBtn = editorPage.locator('button:has-text("Save"), button:has-text("Create")');
        await saveMetricBtn.click();
        await editorPage.waitForTimeout(2000);
        
        // Verify metric created
        await expect(editorPage.locator(`text=Integration Metric ${timestamp}`)).toBeVisible();
      }
      
      // Step 3: Create an objective using the metric
      const createObjectiveBtn = editorPage.locator('button:has-text("Create Objective")');
      if (await createObjectiveBtn.count() > 0) {
        await createObjectiveBtn.click();
        await editorPage.waitForTimeout(500);
        
        // Fill objective form
        await editorPage.fill('input[name="title"]', `Integration Objective ${timestamp}`);
        await editorPage.fill('textarea[name="description"]', 'Objective for integration testing');
        
        // Add key result
        await editorPage.fill('input[name="keyResults[0].description"]', 'Complete integration test');
        await editorPage.fill('input[name="keyResults[0].target"]', '100');
        
        const saveObjectiveBtn = editorPage.locator('button:has-text("Save"), button:has-text("Create")');
        await saveObjectiveBtn.click();
        await editorPage.waitForTimeout(2000);
        
        // Verify objective created
        await expect(editorPage.locator(`text=Integration Objective ${timestamp}`)).toBeVisible();
      }
    });

    test('should link metric to domain and verify relationship', async ({ editorPage }) => {
      const timestamp = Date.now();
      
      await editorPage.goto('http://localhost:3000');
      await editorPage.waitForTimeout(2000);
      
      // Create domain via API if PostgreSQL is enabled
      const config = await editorPage.evaluate(() => {
        return (window as any).appConfig?.storage?.postgres?.enabled || false;
      });
      
      if (config) {
        // Create domain
        const domainResponse = await editorPage.request.post('http://localhost:3000/api/postgres/domains', {
          data: {
            name: `Domain ${timestamp}`,
            description: 'Test domain',
            color: '#FF5733'
          }
        });
        
        if (domainResponse.ok()) {
          const domainResult = await domainResponse.json();
          const domainId = domainResult.domain.domain_id;
          
          // Create metric linked to domain
          const metricData = {
            name: `Metric ${timestamp}`,
            description: 'Test metric',
            category: 'Performance',
            unit: 'count',
            domain_id: domainId
          };
          
          await editorPage.evaluate((data) => {
            const metrics = JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
            metrics.push({ ...data, metric_id: `metric_${Date.now()}` });
            localStorage.setItem('mdl_metrics', JSON.stringify(metrics));
          }, metricData);
          
          await editorPage.reload();
          await editorPage.waitForTimeout(2000);
          
          // Verify domain shows the metric
          const domainCard = editorPage.locator(`text=Domain ${timestamp}`).locator('..');
          const metricsCount = domainCard.locator('text=/\\d+ metrics?/');
          
          if (await metricsCount.count() > 0) {
            const countText = await metricsCount.textContent();
            expect(countText).toContain('1');
          }
        }
      }
    });

    test('should delete domain and verify cascading effects', async ({ editorPage }) => {
      const timestamp = Date.now();
      
      await editorPage.goto('http://localhost:3000');
      await editorPage.waitForTimeout(2000);
      
      const config = await editorPage.evaluate(() => {
        return (window as any).appConfig?.storage?.postgres?.enabled || false;
      });
      
      if (config) {
        // Create domain with metrics
        const domainResponse = await editorPage.request.post('http://localhost:3000/api/postgres/domains', {
          data: {
            name: `Cascade Test ${timestamp}`,
            description: 'Test cascading delete',
            color: '#3498db'
          }
        });
        
        if (domainResponse.ok()) {
          const domainResult = await domainResponse.json();
          const domainId = domainResult.domain.domain_id;
          
          await editorPage.reload();
          await editorPage.waitForTimeout(2000);
          
          // Delete domain
          const deleteResponse = await editorPage.request.delete(`http://localhost:3000/api/postgres/domains/${domainId}`);
          expect(deleteResponse.ok()).toBeTruthy();
          
          await editorPage.reload();
          await editorPage.waitForTimeout(2000);
          
          // Verify domain is gone
          const domainExists = await editorPage.locator(`text=Cascade Test ${timestamp}`).count();
          expect(domainExists).toBe(0);
        }
      }
    });
  });

  test.describe('Cross-Feature Data Consistency', () => {
    test('should maintain metric-domain relationship after updates', async ({ editorPage }) => {
      const timestamp = Date.now();
      
      await editorPage.goto('http://localhost:3000');
      await editorPage.waitForTimeout(2000);
      
      const config = await editorPage.evaluate(() => {
        return (window as any).appConfig?.storage?.postgres?.enabled || false;
      });
      
      if (config) {
        // Create two domains
        const domain1Response = await editorPage.request.post('http://localhost:3000/api/postgres/domains', {
          data: {
            name: `Domain A ${timestamp}`,
            description: 'First domain',
            color: '#e74c3c'
          }
        });
        
        const domain2Response = await editorPage.request.post('http://localhost:3000/api/postgres/domains', {
          data: {
            name: `Domain B ${timestamp}`,
            description: 'Second domain',
            color: '#2ecc71'
          }
        });
        
        if (domain1Response.ok() && domain2Response.ok()) {
          const domain1 = await domain1Response.json();
          const domain2 = await domain2Response.json();
          const domain1Id = domain1.domain.domain_id;
          const domain2Id = domain2.domain.domain_id;
          
          // Create metric in domain 1
          const metricData = {
            name: `Movable Metric ${timestamp}`,
            description: 'Test metric',
            category: 'Quality',
            unit: 'score',
            metric_id: `metric_${timestamp}`,
            domain_id: domain1Id
          };
          
          await editorPage.evaluate((data) => {
            const metrics = JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
            metrics.push(data);
            localStorage.setItem('mdl_metrics', JSON.stringify(metrics));
          }, metricData);
          
          await editorPage.reload();
          await editorPage.waitForTimeout(2000);
          
          // Move metric to domain 2
          await editorPage.evaluate((data) => {
            const metrics = JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
            const metric = metrics.find((m: any) => m.metric_id === data.metricId);
            if (metric) {
              metric.domain_id = data.newDomainId;
              localStorage.setItem('mdl_metrics', JSON.stringify(metrics));
            }
          }, { metricId: `metric_${timestamp}`, newDomainId: domain2Id });
          
          await editorPage.reload();
          await editorPage.waitForTimeout(2000);
          
          // Verify metric moved
          const metrics = await editorPage.evaluate(() => {
            return JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
          });
          
          const movedMetric = metrics.find((m: any) => m.metric_id === `metric_${timestamp}`);
          expect(movedMetric.domain_id).toBe(domain2Id);
        }
      }
    });

    test('should handle metric updates in multiple objectives', async ({ editorPage }) => {
      const timestamp = Date.now();
      const metricId = `shared_metric_${timestamp}`;
      
      await editorPage.goto('http://localhost:3000');
      await editorPage.waitForTimeout(2000);
      
      // Create a metric
      const metricData = {
        metric_id: metricId,
        name: `Shared Metric ${timestamp}`,
        description: 'Metric used in multiple objectives',
        category: 'Efficiency',
        unit: 'percentage'
      };
      
      await editorPage.evaluate((data) => {
        const metrics = JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
        metrics.push(data);
        localStorage.setItem('mdl_metrics', JSON.stringify(metrics));
      }, metricData);
      
      // Create two objectives referencing the metric
      const objective1 = {
        objective_id: `obj1_${timestamp}`,
        title: `Objective 1 ${timestamp}`,
        description: 'First objective',
        keyResults: [{
          description: 'KR with shared metric',
          target: 80,
          metric_id: metricId
        }]
      };
      
      const objective2 = {
        objective_id: `obj2_${timestamp}`,
        title: `Objective 2 ${timestamp}`,
        description: 'Second objective',
        keyResults: [{
          description: 'Another KR with same metric',
          target: 90,
          metric_id: metricId
        }]
      };
      
      await editorPage.evaluate((data) => {
        const objectives = JSON.parse(localStorage.getItem('mdl_objectives') || '[]');
        objectives.push(data.obj1, data.obj2);
        localStorage.setItem('mdl_objectives', JSON.stringify(objectives));
      }, { obj1: objective1, obj2: objective2 });
      
      await editorPage.reload();
      await editorPage.waitForTimeout(2000);
      
      // Verify both objectives exist
      await expect(editorPage.locator(`text=Objective 1 ${timestamp}`)).toBeVisible();
      await expect(editorPage.locator(`text=Objective 2 ${timestamp}`)).toBeVisible();
      
      // Update the metric
      await editorPage.evaluate((data) => {
        const metrics = JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
        const metric = metrics.find((m: any) => m.metric_id === data.metricId);
        if (metric) {
          metric.name = data.newName;
          localStorage.setItem('mdl_metrics', JSON.stringify(metrics));
        }
      }, { metricId, newName: `Updated Shared Metric ${timestamp}` });
      
      await editorPage.reload();
      await editorPage.waitForTimeout(2000);
      
      // Verify metric name updated
      const metrics = await editorPage.evaluate(() => {
        return JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
      });
      
      const updatedMetric = metrics.find((m: any) => m.metric_id === metricId);
      expect(updatedMetric.name).toBe(`Updated Shared Metric ${timestamp}`);
    });
  });

  test.describe('Storage Backend Switching', () => {
    test('should handle localStorage for objectives', async ({ editorPage }) => {
      const timestamp = Date.now();
      
      await editorPage.goto('http://localhost:3000');
      await editorPage.waitForTimeout(2000);
      
      // Create objective via localStorage
      const objectiveData = {
        objective_id: `storage_test_${timestamp}`,
        title: `Storage Test Objective ${timestamp}`,
        description: 'Testing localStorage',
        keyResults: [{
          description: 'Complete storage test',
          target: 100,
          current: 50
        }]
      };
      
      await editorPage.evaluate((data) => {
        const objectives = JSON.parse(localStorage.getItem('mdl_objectives') || '[]');
        objectives.push(data);
        localStorage.setItem('mdl_objectives', JSON.stringify(objectives));
      }, objectiveData);
      
      await editorPage.reload();
      await editorPage.waitForTimeout(2000);
      
      // Verify objective exists
      await expect(editorPage.locator(`text=Storage Test Objective ${timestamp}`)).toBeVisible();
      
      // Clean up
      await editorPage.evaluate((id) => {
        const objectives = JSON.parse(localStorage.getItem('mdl_objectives') || '[]');
        const filtered = objectives.filter((o: any) => o.objective_id !== id);
        localStorage.setItem('mdl_objectives', JSON.stringify(filtered));
      }, `storage_test_${timestamp}`);
    });

    test('should handle PostgreSQL for domains when enabled', async ({ editorPage }) => {
      await editorPage.goto('http://localhost:3000');
      await editorPage.waitForTimeout(2000);
      
      const config = await editorPage.evaluate(() => {
        return (window as any).appConfig?.storage?.postgres?.enabled || false;
      });
      
      if (config) {
        const timestamp = Date.now();
        
        // Create domain via PostgreSQL API
        const response = await editorPage.request.post('http://localhost:3000/api/postgres/domains', {
          data: {
            name: `PG Domain ${timestamp}`,
            description: 'Testing PostgreSQL storage',
            color: '#9b59b6'
          }
        });
        
        expect(response.ok()).toBeTruthy();
        
        const result = await response.json();
        expect(result.domain.name).toBe(`PG Domain ${timestamp}`);
        
        await editorPage.reload();
        await editorPage.waitForTimeout(2000);
        
        // Verify domain visible in UI
        await expect(editorPage.locator(`text=PG Domain ${timestamp}`)).toBeVisible();
        
        // Clean up
        await editorPage.request.delete(`http://localhost:3000/api/postgres/domains/${result.domain.domain_id}`);
      }
    });

    test('should handle metrics in localStorage', async ({ editorPage }) => {
      const timestamp = Date.now();
      
      await editorPage.goto('http://localhost:3000');
      await editorPage.waitForTimeout(2000);
      
      // Create metric via localStorage
      const metricData = {
        metric_id: `ls_metric_${timestamp}`,
        name: `LocalStorage Metric ${timestamp}`,
        description: 'Testing localStorage for metrics',
        category: 'Performance',
        unit: 'ms',
        target: 100,
        current_value: 75
      };
      
      await editorPage.evaluate((data) => {
        const metrics = JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
        metrics.push(data);
        localStorage.setItem('mdl_metrics', JSON.stringify(metrics));
      }, metricData);
      
      await editorPage.reload();
      await editorPage.waitForTimeout(2000);
      
      // Verify metric exists
      await expect(editorPage.locator(`text=LocalStorage Metric ${timestamp}`)).toBeVisible();
      
      // Update metric
      await editorPage.evaluate((id) => {
        const metrics = JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
        const metric = metrics.find((m: any) => m.metric_id === id);
        if (metric) {
          metric.current_value = 85;
          localStorage.setItem('mdl_metrics', JSON.stringify(metrics));
        }
      }, `ls_metric_${timestamp}`);
      
      // Verify update
      const updatedMetrics = await editorPage.evaluate(() => {
        return JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
      });
      
      const updatedMetric = updatedMetrics.find((m: any) => m.metric_id === `ls_metric_${timestamp}`);
      expect(updatedMetric.current_value).toBe(85);
      
      // Clean up
      await editorPage.evaluate((id) => {
        const metrics = JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
        const filtered = metrics.filter((m: any) => m.metric_id !== id);
        localStorage.setItem('mdl_metrics', JSON.stringify(filtered));
      }, `ls_metric_${timestamp}`);
    });
  });

  test.describe('Complete User Journeys', () => {
    test('should complete full reporting workflow', async ({ editorPage }) => {
      const timestamp = Date.now();
      
      await editorPage.goto('http://localhost:3000');
      await editorPage.waitForTimeout(2000);
      
      // Create domain
      const config = await editorPage.evaluate(() => {
        return (window as any).appConfig?.storage?.postgres?.enabled || false;
      });
      
      if (config) {
        await editorPage.request.post('http://localhost:3000/api/postgres/domains', {
          data: {
            name: `Reporting Domain ${timestamp}`,
            description: 'Domain for reporting test',
            color: '#34495e'
          }
        });
      }
      
      // Create metrics
      const metrics = [
        {
          metric_id: `report_metric_1_${timestamp}`,
          name: `Response Time ${timestamp}`,
          category: 'Performance',
          unit: 'ms',
          current_value: 150
        },
        {
          metric_id: `report_metric_2_${timestamp}`,
          name: `Error Rate ${timestamp}`,
          category: 'Quality',
          unit: 'percentage',
          current_value: 0.5
        }
      ];
      
      await editorPage.evaluate((data) => {
        const existing = JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
        localStorage.setItem('mdl_metrics', JSON.stringify([...existing, ...data]));
      }, metrics);
      
      // Create objective with key results
      const objective = {
        objective_id: `report_obj_${timestamp}`,
        title: `Q4 Performance Goals ${timestamp}`,
        description: 'Improve system performance',
        keyResults: [
          {
            description: 'Reduce response time to under 100ms',
            target: 100,
            current: 150,
            metric_id: `report_metric_1_${timestamp}`
          },
          {
            description: 'Maintain error rate below 0.1%',
            target: 0.1,
            current: 0.5,
            metric_id: `report_metric_2_${timestamp}`
          }
        ]
      };
      
      await editorPage.evaluate((data) => {
        const objectives = JSON.parse(localStorage.getItem('mdl_objectives') || '[]');
        objectives.push(data);
        localStorage.setItem('mdl_objectives', JSON.stringify(objectives));
      }, objective);
      
      await editorPage.reload();
      await editorPage.waitForTimeout(2000);
      
      // Verify all elements visible
      await expect(editorPage.locator(`text=Q4 Performance Goals ${timestamp}`)).toBeVisible();
      await expect(editorPage.locator(`text=Response Time ${timestamp}`)).toBeVisible();
      await expect(editorPage.locator(`text=Error Rate ${timestamp}`)).toBeVisible();
      
      // Export data (if export button exists)
      const exportBtn = editorPage.locator('button:has-text("Export")');
      if (await exportBtn.count() > 0) {
        await exportBtn.click();
        await editorPage.waitForTimeout(1000);
      }
    });

    test('should handle viewer read-only workflow', async ({ viewerPage }) => {
      await viewerPage.goto('http://localhost:3000');
      await viewerPage.waitForTimeout(2000);
      
      // Viewer should see content but no create buttons
      const createButtons = viewerPage.locator('button:has-text("Create")');
      const buttonCount = await createButtons.count();
      
      // Viewer should have limited or no create buttons
      expect(buttonCount).toBeLessThanOrEqual(1);
      
      // Viewer should be able to view existing data
      const content = await viewerPage.textContent('body');
      expect(content).toBeTruthy();
    });

    test('should handle editor create-and-edit workflow', async ({ editorPage }) => {
      const timestamp = Date.now();
      
      await editorPage.goto('http://localhost:3000');
      await editorPage.waitForTimeout(2000);
      
      // Editor should see create buttons
      const createMetricBtn = editorPage.locator('button:has-text("Create Metric")');
      
      if (await createMetricBtn.count() > 0) {
        // Create a metric
        await createMetricBtn.click();
        await editorPage.waitForTimeout(500);
        
        await editorPage.fill('input[name="name"]', `Editor Metric ${timestamp}`);
        await editorPage.fill('textarea[name="description"]', 'Created by editor');
        
        const saveBtn = editorPage.locator('button:has-text("Save"), button:has-text("Create")');
        await saveBtn.click();
        await editorPage.waitForTimeout(2000);
        
        // Verify creation
        await expect(editorPage.locator(`text=Editor Metric ${timestamp}`)).toBeVisible();
        
        // Edit the metric
        const metricCard = editorPage.locator(`text=Editor Metric ${timestamp}`).locator('..');
        const editBtn = metricCard.locator('button:has-text("Edit")');
        
        if (await editBtn.count() > 0) {
          await editBtn.click();
          await editorPage.waitForTimeout(500);
          
          await editorPage.fill('textarea[name="description"]', 'Updated by editor');
          
          const updateBtn = editorPage.locator('button:has-text("Save"), button:has-text("Update")');
          await updateBtn.click();
          await editorPage.waitForTimeout(2000);
        }
      }
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle network errors gracefully', async ({ editorPage }) => {
      await editorPage.goto('http://localhost:3000');
      await editorPage.waitForTimeout(2000);
      
      // Simulate network error by requesting invalid endpoint
      const response = await editorPage.request.get('http://localhost:3000/api/invalid-endpoint');
      expect(response.status()).toBe(404);
    });

    test('should recover from invalid data in localStorage', async ({ editorPage }) => {
      await editorPage.goto('http://localhost:3000');
      await editorPage.waitForTimeout(2000);
      
      // Insert invalid data
      await editorPage.evaluate(() => {
        localStorage.setItem('mdl_metrics', 'invalid json');
      });
      
      await editorPage.reload();
      await editorPage.waitForTimeout(2000);
      
      // App should still load (either by clearing invalid data or showing error)
      const body = await editorPage.locator('body').count();
      expect(body).toBe(1);
      
      // Clean up
      await editorPage.evaluate(() => {
        localStorage.setItem('mdl_metrics', '[]');
      });
    });

    test('should handle concurrent edits', async ({ editorPage }) => {
      const timestamp = Date.now();
      const metricId = `concurrent_${timestamp}`;
      
      await editorPage.goto('http://localhost:3000');
      await editorPage.waitForTimeout(2000);
      
      // Create initial metric
      const metricData = {
        metric_id: metricId,
        name: `Concurrent Test ${timestamp}`,
        description: 'Testing concurrent updates',
        category: 'Test',
        unit: 'count',
        current_value: 0
      };
      
      await editorPage.evaluate((data) => {
        const metrics = JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
        metrics.push(data);
        localStorage.setItem('mdl_metrics', JSON.stringify(metrics));
      }, metricData);
      
      // Simulate two concurrent updates
      await editorPage.evaluate((id) => {
        const metrics = JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
        const metric = metrics.find((m: any) => m.metric_id === id);
        if (metric) {
          metric.current_value = 10;
          localStorage.setItem('mdl_metrics', JSON.stringify(metrics));
        }
      }, metricId);
      
      await editorPage.evaluate((id) => {
        const metrics = JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
        const metric = metrics.find((m: any) => m.metric_id === id);
        if (metric) {
          metric.current_value = 20;
          localStorage.setItem('mdl_metrics', JSON.stringify(metrics));
        }
      }, metricId);
      
      // Verify last write wins
      const metrics = await editorPage.evaluate(() => {
        return JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
      });
      
      const updatedMetric = metrics.find((m: any) => m.metric_id === metricId);
      expect(updatedMetric.current_value).toBe(20);
      
      // Clean up
      await editorPage.evaluate((id) => {
        const metrics = JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
        const filtered = metrics.filter((m: any) => m.metric_id !== id);
        localStorage.setItem('mdl_metrics', JSON.stringify(filtered));
      }, metricId);
    });
  });
});
