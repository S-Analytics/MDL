import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { MetricDefinitionInput } from '../models';

/**
 * Configuration file loader for YAML and JSON metric definitions
 */
export class ConfigLoader {
  /**
   * Load metric definitions from a file (JSON or YAML)
   */
  static loadFromFile(filePath: string): MetricDefinitionInput[] {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Config file not found: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const content = fs.readFileSync(filePath, 'utf8');

    let data: any;
    if (ext === '.json') {
      data = JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      data = yaml.load(content);
    } else {
      throw new Error(`Unsupported file format: ${ext}. Use .json, .yaml, or .yml`);
    }

    return this.parseMetricDefinitions(data);
  }

  /**
   * Parse and validate metric definitions from loaded data
   */
  private static parseMetricDefinitions(data: any): MetricDefinitionInput[] {
    // Support both array format and object with 'metrics' key
    let metrics: any[];
    if (Array.isArray(data)) {
      metrics = data;
    } else if (data.metrics && Array.isArray(data.metrics)) {
      metrics = data.metrics;
    } else {
      throw new Error('Invalid config format. Expected array of metrics or object with "metrics" key');
    }

    return metrics.map((metric, index) => {
      this.validateMetricInput(metric, index);
      return metric as MetricDefinitionInput;
    });
  }

  /**
   * Validate a single metric input
   */
  private static validateMetricInput(metric: any, index: number): void {
    const required = ['name', 'description', 'category', 'dataType'];
    const missing = required.filter((field) => !metric[field]);

    if (missing.length > 0) {
      throw new Error(
        `Metric at index ${index} is missing required fields: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Save metric definitions to a file
   */
  static saveToFile(filePath: string, metrics: MetricDefinitionInput[]): void {
    const ext = path.extname(filePath).toLowerCase();
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let content: string;
    if (ext === '.json') {
      content = JSON.stringify({ metrics }, null, 2);
    } else if (ext === '.yaml' || ext === '.yml') {
      content = yaml.dump({ metrics });
    } else {
      throw new Error(`Unsupported file format: ${ext}. Use .json, .yaml, or .yml`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
  }
}
