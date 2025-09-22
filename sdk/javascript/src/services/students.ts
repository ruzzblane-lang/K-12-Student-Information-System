import { SISClient } from '../client';
import { Student, ListParams, PaginationInfo } from '../types';

export class StudentsService {
  constructor(private client: SISClient) {}

  /**
   * Get list of students with optional filtering and pagination
   */
  async list(params: ListParams = {}): Promise<{ students: Student[]; pagination: PaginationInfo }> {
    const response = await this.client.get<{ students: Student[]; pagination: PaginationInfo }>('/students', params);
    return response;
  }

  /**
   * Get a specific student by ID
   */
  async get(id: string): Promise<Student> {
    return this.client.get<Student>(`/students/${id}`);
  }

  /**
   * Create a new student
   */
  async create(studentData: Partial<Student>): Promise<Student> {
    return this.client.post<Student>('/students', studentData);
  }

  /**
   * Update a student
   */
  async update(id: string, studentData: Partial<Student>): Promise<Student> {
    return this.client.put<Student>(`/students/${id}`, studentData);
  }

  /**
   * Partially update a student
   */
  async patch(id: string, studentData: Partial<Student>): Promise<Student> {
    return this.client.patch<Student>(`/students/${id}`, studentData);
  }

  /**
   * Delete a student
   */
  async delete(id: string): Promise<void> {
    return this.client.delete<void>(`/students/${id}`);
  }

  /**
   * Search students by query
   */
  async search(query: string, params: ListParams = {}): Promise<{ students: Student[]; pagination: PaginationInfo }> {
    return this.list({ ...params, search: query });
  }

  /**
   * Get students by grade level
   */
  async getByGradeLevel(gradeLevel: string, params: ListParams = {}): Promise<{ students: Student[]; pagination: PaginationInfo }> {
    return this.list({ ...params, gradeLevel });
  }

  /**
   * Get students by status
   */
  async getByStatus(status: string, params: ListParams = {}): Promise<{ students: Student[]; pagination: PaginationInfo }> {
    return this.list({ ...params, status });
  }

  /**
   * Get students by academic program
   */
  async getByAcademicProgram(academicProgram: string, params: ListParams = {}): Promise<{ students: Student[]; pagination: PaginationInfo }> {
    return this.list({ ...params, academicProgram });
  }

  /**
   * Bulk create students
   */
  async bulkCreate(students: Partial<Student>[]): Promise<{ students: Student[]; errors: any[] }> {
    return this.client.post<{ students: Student[]; errors: any[] }>('/students/bulk', { students });
  }

  /**
   * Bulk update students
   */
  async bulkUpdate(updates: Array<{ id: string; data: Partial<Student> }>): Promise<{ students: Student[]; errors: any[] }> {
    return this.client.put<{ students: Student[]; errors: any[] }>('/students/bulk', { updates });
  }

  /**
   * Bulk delete students
   */
  async bulkDelete(ids: string[]): Promise<{ deleted: string[]; errors: any[] }> {
    return this.client.delete<{ deleted: string[]; errors: any[] }>('/students/bulk', { data: { ids } });
  }

  /**
   * Export students to CSV
   */
  async exportCSV(params: ListParams = {}): Promise<Blob> {
    return this.client.downloadFile('/students/export/csv', `students_${new Date().toISOString().split('T')[0]}.csv`);
  }

  /**
   * Import students from CSV
   */
  async importCSV(file: File): Promise<{ imported: number; errors: any[] }> {
    return this.client.uploadFile<{ imported: number; errors: any[] }>('/students/import/csv', file);
  }

  /**
   * Get student statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byGradeLevel: Record<string, number>;
    byStatus: Record<string, number>;
    byAcademicProgram: Record<string, number>;
    recentEnrollments: number;
    upcomingGraduations: number;
  }> {
    return this.client.get('/students/statistics');
  }

  /**
   * Get student's academic history
   */
  async getAcademicHistory(id: string): Promise<{
    student: Student;
    classes: any[];
    grades: any[];
    attendance: any[];
  }> {
    return this.client.get(`/students/${id}/academic-history`);
  }

  /**
   * Get student's emergency contacts
   */
  async getEmergencyContacts(id: string): Promise<{
    primary: any;
    secondary: any;
  }> {
    return this.client.get(`/students/${id}/emergency-contacts`);
  }

  /**
   * Update student's emergency contacts
   */
  async updateEmergencyContacts(id: string, contacts: {
    primary?: any;
    secondary?: any;
  }): Promise<Student> {
    return this.client.put<Student>(`/students/${id}/emergency-contacts`, contacts);
  }

  /**
   * Get student's medical information
   */
  async getMedicalInfo(id: string): Promise<{
    conditions: string;
    allergies: string;
    medications: string;
    insurance: string;
    physician: string;
  }> {
    return this.client.get(`/students/${id}/medical`);
  }

  /**
   * Update student's medical information
   */
  async updateMedicalInfo(id: string, medicalInfo: {
    conditions?: string;
    allergies?: string;
    medications?: string;
    insurance?: string;
    physician?: string;
  }): Promise<Student> {
    return this.client.put<Student>(`/students/${id}/medical`, medicalInfo);
  }

  /**
   * Upload student document
   */
  async uploadDocument(id: string, file: File, documentType: string, description?: string): Promise<{
    id: string;
    filename: string;
    url: string;
    documentType: string;
    description?: string;
  }> {
    return this.client.uploadFile(`/students/${id}/documents`, file, {
      documentType,
      description
    });
  }

  /**
   * Get student documents
   */
  async getDocuments(id: string): Promise<Array<{
    id: string;
    filename: string;
    url: string;
    documentType: string;
    description?: string;
    uploadedAt: string;
  }>> {
    return this.client.get(`/students/${id}/documents`);
  }

  /**
   * Delete student document
   */
  async deleteDocument(id: string, documentId: string): Promise<void> {
    return this.client.delete(`/students/${id}/documents/${documentId}`);
  }

  /**
   * Upload student profile picture
   */
  async uploadProfilePicture(id: string, file: File): Promise<{
    url: string;
    filename: string;
  }> {
    return this.client.uploadFile(`/students/${id}/profile-picture`, file);
  }

  /**
   * Get student's family members (parents/guardians)
   */
  async getFamilyMembers(id: string): Promise<Array<{
    id: string;
    relationship: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    isPrimary: boolean;
  }>> {
    return this.client.get(`/students/${id}/family`);
  }

  /**
   * Add family member to student
   */
  async addFamilyMember(id: string, familyMember: {
    relationship: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    isPrimary?: boolean;
  }): Promise<any> {
    return this.client.post(`/students/${id}/family`, familyMember);
  }

  /**
   * Remove family member from student
   */
  async removeFamilyMember(id: string, familyMemberId: string): Promise<void> {
    return this.client.delete(`/students/${id}/family/${familyMemberId}`);
  }
}
