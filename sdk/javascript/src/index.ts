// Main SDK entry point
export { SISClient } from './client';
export { StudentsService } from './services/students';
export { GradesService } from './services/grades';

// Re-export types
export * from './types';

// Default export
import { SISClient } from './client';
import { StudentsService } from './services/students';
import { GradesService } from './services/grades';
import { SISConfig } from './types';

export class SchoolSIS {
  public students: StudentsService;
  public grades: GradesService;
  private client: SISClient;

  constructor(config: SISConfig) {
    this.client = new SISClient(config);
    this.students = new StudentsService(this.client);
    this.grades = new GradesService(this.client);
  }

  // Authentication methods
  async login(email: string, password: string, tenantSlug?: string) {
    return this.client.login(email, password, tenantSlug);
  }

  async logout() {
    return this.client.logout();
  }

  setToken(token: string, refreshToken?: string) {
    this.client.setToken(token, refreshToken);
  }

  getToken() {
    return this.client.getToken();
  }

  setTenantSlug(tenantSlug: string) {
    this.client.setTenantSlug(tenantSlug);
  }

  getTenantSlug() {
    return this.client.getTenantSlug();
  }

  // Raw API access
  get client() {
    return this.client;
  }
}

// Default export
export default SchoolSIS;

// Named exports for convenience
export { SchoolSIS as SISClient, SchoolSIS as SIS };
