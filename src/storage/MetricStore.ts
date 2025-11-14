import { MetricDefinition, MetricDefinitionInput } from '../models';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Storage interface for Metric Definitions
 */
export interface IMetricStore {
  create(input: MetricDefinitionInput): Promise<MetricDefinition>;
  findById(id: string): Promise<MetricDefinition | null>;
  findAll(filters?: MetricFilters): Promise<MetricDefinition[]>;
  update(id: string, input: Partial<MetricDefinitionInput>): Promise<MetricDefinition>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}

export interface MetricFilters {
  category?: string;
  tags?: string[];
  owner?: string;
  dataType?: string;
}

/**
 * In-memory storage implementation with file persistence
 */
export class InMemoryMetricStore implements IMetricStore {
  private metrics: Map<string, MetricDefinition> = new Map();
  private persistencePath?: string;

  constructor(persistencePath?: string) {
    this.persistencePath = persistencePath;
    if (persistencePath) {
      this.loadFromFile();
    }
  }

  async create(input: MetricDefinitionInput): Promise<MetricDefinition> {
    const id = this.generateId(input.name);
    const now = new Date();
    
    const metric: MetricDefinition = {
      id,
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.metrics.set(id, metric);
    await this.persistToFile();
    return metric;
  }

  async findById(id: string): Promise<MetricDefinition | null> {
    return this.metrics.get(id) || null;
  }

  async findAll(filters?: MetricFilters): Promise<MetricDefinition[]> {
    let results = Array.from(this.metrics.values());

    if (filters) {
      if (filters.category) {
        results = results.filter((m) => m.category === filters.category);
      }
      if (filters.dataType) {
        results = results.filter((m) => m.dataType === filters.dataType);
      }
      if (filters.tags && filters.tags.length > 0) {
        results = results.filter((m) =>
          filters.tags!.some((tag) => m.tags?.includes(tag))
        );
      }
      if (filters.owner) {
        results = results.filter((m) => m.governance?.owner === filters.owner);
      }
    }

    return results;
  }

  async update(
    id: string,
    input: Partial<MetricDefinitionInput>
  ): Promise<MetricDefinition> {
    const existing = this.metrics.get(id);
    if (!existing) {
      throw new Error(`Metric with id ${id} not found`);
    }

    const updated: MetricDefinition = {
      ...existing,
      ...input,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    this.metrics.set(id, updated);
    await this.persistToFile();
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = this.metrics.delete(id);
    if (result) {
      await this.persistToFile();
    }
    return result;
  }

  async exists(id: string): Promise<boolean> {
    return this.metrics.has(id);
  }

  private generateId(name: string): string {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${sanitized}-${timestamp}-${random}`;
  }

  private async persistToFile(): Promise<void> {
    if (!this.persistencePath) return;

    try {
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = JSON.stringify(Array.from(this.metrics.values()), null, 2);
      fs.writeFileSync(this.persistencePath, data, 'utf8');
    } catch (error) {
      console.error('Failed to persist metrics to file:', error);
    }
  }

  private loadFromFile(): void {
    if (!this.persistencePath || !fs.existsSync(this.persistencePath)) {
      return;
    }

    try {
      const data = fs.readFileSync(this.persistencePath, 'utf8');
      const metrics: MetricDefinition[] = JSON.parse(data);
      
      this.metrics.clear();
      metrics.forEach((metric) => {
        // Convert date strings back to Date objects
        metric.createdAt = new Date(metric.createdAt);
        metric.updatedAt = new Date(metric.updatedAt);
        this.metrics.set(metric.id, metric);
      });
    } catch (error) {
      console.error('Failed to load metrics from file:', error);
    }
  }
}
