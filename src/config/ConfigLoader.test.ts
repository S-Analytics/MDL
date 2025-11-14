import { ConfigLoader } from './ConfigLoader';
import * as fs from 'fs';
import * as path from 'path';
import { DataType } from '../models';

describe('ConfigLoader', () => {
  const testDir = '/tmp/mdl-test';
  const jsonFile = path.join(testDir, 'test.json');
  const yamlFile = path.join(testDir, 'test.yaml');

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(jsonFile)) fs.unlinkSync(jsonFile);
    if (fs.existsSync(yamlFile)) fs.unlinkSync(yamlFile);
  });

  const sampleMetrics = [
    {
      name: 'Test Metric',
      description: 'A test metric',
      category: 'test',
      dataType: DataType.NUMBER,
    },
  ];

  describe('loadFromFile', () => {
    it('should load metrics from JSON file', () => {
      fs.writeFileSync(jsonFile, JSON.stringify({ metrics: sampleMetrics }));
      
      const metrics = ConfigLoader.loadFromFile(jsonFile);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('Test Metric');
    });

    it('should load metrics from YAML file', () => {
      const yamlContent = `metrics:
  - name: Test Metric
    description: A test metric
    category: test
    dataType: number
`;
      fs.writeFileSync(yamlFile, yamlContent);
      
      const metrics = ConfigLoader.loadFromFile(yamlFile);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('Test Metric');
    });

    it('should load metrics from array format', () => {
      fs.writeFileSync(jsonFile, JSON.stringify(sampleMetrics));
      
      const metrics = ConfigLoader.loadFromFile(jsonFile);
      expect(metrics).toHaveLength(1);
    });

    it('should throw error for non-existent file', () => {
      expect(() => {
        ConfigLoader.loadFromFile('/non/existent/file.json');
      }).toThrow('Config file not found');
    });

    it('should throw error for unsupported file format', () => {
      const txtFile = path.join(testDir, 'test.txt');
      fs.writeFileSync(txtFile, 'test');
      
      expect(() => {
        ConfigLoader.loadFromFile(txtFile);
      }).toThrow('Unsupported file format');
      
      fs.unlinkSync(txtFile);
    });

    it('should validate required fields', () => {
      const invalidMetrics = [
        {
          name: 'Invalid Metric',
          // missing required fields
        },
      ];
      
      fs.writeFileSync(jsonFile, JSON.stringify({ metrics: invalidMetrics }));
      
      expect(() => {
        ConfigLoader.loadFromFile(jsonFile);
      }).toThrow('missing required fields');
    });
  });

  describe('saveToFile', () => {
    it('should save metrics to JSON file', () => {
      ConfigLoader.saveToFile(jsonFile, sampleMetrics);
      
      expect(fs.existsSync(jsonFile)).toBe(true);
      const content = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      expect(content.metrics).toHaveLength(1);
    });

    it('should save metrics to YAML file', () => {
      ConfigLoader.saveToFile(yamlFile, sampleMetrics);
      
      expect(fs.existsSync(yamlFile)).toBe(true);
      const content = fs.readFileSync(yamlFile, 'utf8');
      expect(content).toContain('Test Metric');
    });

    it('should create directory if it does not exist', () => {
      const nestedFile = path.join(testDir, 'nested', 'dir', 'test.json');
      ConfigLoader.saveToFile(nestedFile, sampleMetrics);
      
      expect(fs.existsSync(nestedFile)).toBe(true);
      
      // Clean up
      fs.unlinkSync(nestedFile);
      fs.rmdirSync(path.join(testDir, 'nested', 'dir'));
      fs.rmdirSync(path.join(testDir, 'nested'));
    });
  });
});
