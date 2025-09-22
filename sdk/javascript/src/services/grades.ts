import { SISClient } from '../client';
import { Grade, ListParams, PaginationInfo } from '../types';

export class GradesService {
  constructor(private client: SISClient) {}

  /**
   * Get list of grades with optional filtering and pagination
   */
  async list(params: ListParams = {}): Promise<{ grades: Grade[]; pagination: PaginationInfo }> {
    const response = await this.client.get<{ grades: Grade[]; pagination: PaginationInfo }>('/grades', params);
    return response;
  }

  /**
   * Get a specific grade by ID
   */
  async get(id: string): Promise<Grade> {
    return this.client.get<Grade>(`/grades/${id}`);
  }

  /**
   * Create a new grade
   */
  async create(gradeData: Partial<Grade>): Promise<Grade> {
    return this.client.post<Grade>('/grades', gradeData);
  }

  /**
   * Update a grade
   */
  async update(id: string, gradeData: Partial<Grade>): Promise<Grade> {
    return this.client.put<Grade>(`/grades/${id}`, gradeData);
  }

  /**
   * Partially update a grade
   */
  async patch(id: string, gradeData: Partial<Grade>): Promise<Grade> {
    return this.client.patch<Grade>(`/grades/${id}`, gradeData);
  }

  /**
   * Delete a grade
   */
  async delete(id: string): Promise<void> {
    return this.client.delete<void>(`/grades/${id}`);
  }

  /**
   * Get grades for a specific student
   */
  async getByStudent(studentId: string, params: ListParams = {}): Promise<{ grades: Grade[]; pagination: PaginationInfo }> {
    return this.list({ ...params, studentId });
  }

  /**
   * Get grades for a specific class
   */
  async getByClass(classId: string, params: ListParams = {}): Promise<{ grades: Grade[]; pagination: PaginationInfo }> {
    return this.list({ ...params, classId });
  }

  /**
   * Get grades for a specific assignment
   */
  async getByAssignment(assignmentId: string, params: ListParams = {}): Promise<{ grades: Grade[]; pagination: PaginationInfo }> {
    return this.list({ ...params, assignmentId });
  }

  /**
   * Get grades by grade type
   */
  async getByGradeType(gradeType: string, params: ListParams = {}): Promise<{ grades: Grade[]; pagination: PaginationInfo }> {
    return this.list({ ...params, gradeType });
  }

  /**
   * Get grades by category
   */
  async getByCategory(category: string, params: ListParams = {}): Promise<{ grades: Grade[]; pagination: PaginationInfo }> {
    return this.list({ ...params, category });
  }

  /**
   * Bulk create grades
   */
  async bulkCreate(grades: Partial<Grade>[]): Promise<{ grades: Grade[]; errors: any[] }> {
    return this.client.post<{ grades: Grade[]; errors: any[] }>('/grades/bulk', { grades });
  }

  /**
   * Bulk update grades
   */
  async bulkUpdate(updates: Array<{ id: string; data: Partial<Grade> }>): Promise<{ grades: Grade[]; errors: any[] }> {
    return this.client.put<{ grades: Grade[]; errors: any[] }>('/grades/bulk', { updates });
  }

  /**
   * Bulk delete grades
   */
  async bulkDelete(ids: string[]): Promise<{ deleted: string[]; errors: any[] }> {
    return this.client.delete<{ deleted: string[]; errors: any[] }>('/grades/bulk', { data: { ids } });
  }

  /**
   * Get student's grade summary
   */
  async getStudentSummary(studentId: string, classId?: string): Promise<{
    studentId: string;
    classId?: string;
    gpa: number;
    totalPoints: number;
    totalPossible: number;
    percentage: number;
    letterGrade: string;
    gradeBreakdown: Record<string, {
      points: number;
      possible: number;
      percentage: number;
      count: number;
    }>;
    recentGrades: Grade[];
  }> {
    const params = classId ? { classId } : {};
    return this.client.get(`/grades/students/${studentId}/summary`, params);
  }

  /**
   * Get class grade statistics
   */
  async getClassStatistics(classId: string): Promise<{
    classId: string;
    totalStudents: number;
    averageGrade: number;
    gradeDistribution: Record<string, number>;
    assignmentStatistics: Array<{
      assignmentId: string;
      assignmentName: string;
      averageGrade: number;
      highestGrade: number;
      lowestGrade: number;
      totalGraded: number;
    }>;
  }> {
    return this.client.get(`/grades/classes/${classId}/statistics`);
  }

  /**
   * Get grade trends for a student
   */
  async getStudentTrends(studentId: string, period: 'week' | 'month' | 'semester' | 'year' = 'month'): Promise<{
    studentId: string;
    period: string;
    trends: Array<{
      date: string;
      averageGrade: number;
      gradeCount: number;
      classes: string[];
    }>;
  }> {
    return this.client.get(`/grades/students/${studentId}/trends`, { period });
  }

  /**
   * Calculate final grade for a student in a class
   */
  async calculateFinalGrade(studentId: string, classId: string): Promise<{
    studentId: string;
    classId: string;
    finalGrade: {
      points: number;
      possible: number;
      percentage: number;
      letterGrade: string;
    };
    gradeBreakdown: Array<{
      category: string;
      weight: number;
      points: number;
      possible: number;
      percentage: number;
    }>;
  }> {
    return this.client.post(`/grades/calculate-final`, {
      studentId,
      classId
    });
  }

  /**
   * Export grades to CSV
   */
  async exportCSV(params: ListParams = {}): Promise<Blob> {
    return this.client.downloadFile('/grades/export/csv', `grades_${new Date().toISOString().split('T')[0]}.csv`);
  }

  /**
   * Import grades from CSV
   */
  async importCSV(file: File): Promise<{ imported: number; errors: any[] }> {
    return this.client.uploadFile<{ imported: number; errors: any[] }>('/grades/import/csv', file);
  }

  /**
   * Get grade categories for a class
   */
  async getCategories(classId: string): Promise<Array<{
    category: string;
    weight: number;
    totalAssignments: number;
    averageGrade: number;
  }>> {
    return this.client.get(`/grades/classes/${classId}/categories`);
  }

  /**
   * Update grade category weights
   */
  async updateCategoryWeights(classId: string, categories: Array<{
    category: string;
    weight: number;
  }>): Promise<void> {
    return this.client.put(`/grades/classes/${classId}/categories`, { categories });
  }

  /**
   * Get late/missing assignments
   */
  async getLateMissing(studentId?: string, classId?: string): Promise<Array<{
    studentId: string;
    assignmentId: string;
    assignmentName: string;
    dueDate: string;
    submittedDate?: string;
    isLate: boolean;
    isMissing: boolean;
    pointsDeducted: number;
  }>> {
    const params: any = {};
    if (studentId) params.studentId = studentId;
    if (classId) params.classId = classId;
    
    return this.client.get('/grades/late-missing', params);
  }

  /**
   * Excuse a grade
   */
  async excuseGrade(id: string, reason?: string): Promise<Grade> {
    return this.client.patch<Grade>(`/grades/${id}/excuse`, { reason });
  }

  /**
   * Unexcuse a grade
   */
  async unexcuseGrade(id: string): Promise<Grade> {
    return this.client.patch<Grade>(`/grades/${id}/unexcuse`);
  }

  /**
   * Add comment to a grade
   */
  async addComment(id: string, comment: string): Promise<Grade> {
    return this.client.patch<Grade>(`/grades/${id}/comment`, { comment });
  }

  /**
   * Get grade comments
   */
  async getComments(id: string): Promise<Array<{
    id: string;
    comment: string;
    author: string;
    createdAt: string;
  }>> {
    return this.client.get(`/grades/${id}/comments`);
  }
}
