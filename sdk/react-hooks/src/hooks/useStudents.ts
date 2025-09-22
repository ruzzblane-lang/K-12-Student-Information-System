import { useState, useEffect, useCallback } from 'react';
import { useSIS } from './useSIS';
import { Student, ListParams, PaginationInfo } from '@school-sis/sdk';

interface UseStudentsOptions {
  autoLoad?: boolean;
  initialParams?: ListParams;
}

interface UseStudentsReturn {
  students: Student[];
  pagination: PaginationInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (studentData: Partial<Student>) => Promise<Student>;
  update: (id: string, studentData: Partial<Student>) => Promise<Student>;
  delete: (id: string) => Promise<void>;
  search: (query: string) => Promise<void>;
  setParams: (params: ListParams) => void;
}

export const useStudents = (options: UseStudentsOptions = {}): UseStudentsReturn => {
  const { client } = useSIS();
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<ListParams>(options.initialParams || {});

  const loadStudents = useCallback(async (searchParams: ListParams = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await client.students.list({ ...params, ...searchParams });
      setStudents(response.students);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load students');
      setStudents([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [client, params]);

  const refetch = useCallback(() => loadStudents(), [loadStudents]);

  const create = useCallback(async (studentData: Partial<Student>): Promise<Student> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newStudent = await client.students.create(studentData);
      setStudents(prev => [newStudent, ...prev]);
      return newStudent;
    } catch (err: any) {
      setError(err.message || 'Failed to create student');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const update = useCallback(async (id: string, studentData: Partial<Student>): Promise<Student> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedStudent = await client.students.update(id, studentData);
      setStudents(prev => prev.map(student => 
        student.id === id ? updatedStudent : student
      ));
      return updatedStudent;
    } catch (err: any) {
      setError(err.message || 'Failed to update student');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const deleteStudent = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await client.students.delete(id);
      setStudents(prev => prev.filter(student => student.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete student');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const search = useCallback(async (query: string): Promise<void> => {
    await loadStudents({ search: query });
  }, [loadStudents]);

  const updateParams = useCallback((newParams: ListParams) => {
    setParams(prev => ({ ...prev, ...newParams }));
  }, []);

  // Auto-load students on mount or when params change
  useEffect(() => {
    if (options.autoLoad !== false) {
      loadStudents();
    }
  }, [loadStudents, options.autoLoad]);

  return {
    students,
    pagination,
    isLoading,
    error,
    refetch,
    create,
    update,
    delete: deleteStudent,
    search,
    setParams: updateParams
  };
};

// Hook for a single student
interface UseStudentOptions {
  id: string;
  autoLoad?: boolean;
}

interface UseStudentReturn {
  student: Student | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  update: (studentData: Partial<Student>) => Promise<Student>;
  delete: () => Promise<void>;
}

export const useStudent = (options: UseStudentOptions): UseStudentReturn => {
  const { client } = useSIS();
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStudent = useCallback(async () => {
    if (!options.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const studentData = await client.students.get(options.id);
      setStudent(studentData);
    } catch (err: any) {
      setError(err.message || 'Failed to load student');
      setStudent(null);
    } finally {
      setIsLoading(false);
    }
  }, [client, options.id]);

  const refetch = useCallback(() => loadStudent(), [loadStudent]);

  const update = useCallback(async (studentData: Partial<Student>): Promise<Student> => {
    if (!options.id) throw new Error('Student ID is required');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedStudent = await client.students.update(options.id, studentData);
      setStudent(updatedStudent);
      return updatedStudent;
    } catch (err: any) {
      setError(err.message || 'Failed to update student');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client, options.id]);

  const deleteStudent = useCallback(async (): Promise<void> => {
    if (!options.id) throw new Error('Student ID is required');
    
    setIsLoading(true);
    setError(null);
    
    try {
      await client.students.delete(options.id);
      setStudent(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete student');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client, options.id]);

  // Auto-load student on mount
  useEffect(() => {
    if (options.autoLoad !== false) {
      loadStudent();
    }
  }, [loadStudent, options.autoLoad]);

  return {
    student,
    isLoading,
    error,
    refetch,
    update,
    delete: deleteStudent
  };
};

// Hook for student statistics
interface UseStudentStatsReturn {
  stats: any | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useStudentStats = (): UseStudentStatsReturn => {
  const { client } = useSIS();
  const [stats, setStats] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const statsData = await client.students.getStatistics();
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load student statistics');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const refetch = useCallback(() => loadStats(), [loadStats]);

  // Auto-load stats on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    isLoading,
    error,
    refetch
  };
};
