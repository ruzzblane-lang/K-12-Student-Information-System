import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ComplianceDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchComplianceDashboard();
  }, []);

  const fetchComplianceDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/compliance/dashboard');
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch compliance dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getComplianceStatus = (compliant) => {
    return compliant ? (
      <Badge variant="success">Compliant</Badge>
    ) : (
      <Badge variant="destructive">Non-Compliant</Badge>
    );
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return <div>Loading compliance dashboard...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
        <Button onClick={fetchComplianceDashboard}>
          Refresh
        </Button>
      </div>

      {/* Overall Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Compliance Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            {getComplianceStatus(dashboardData?.overallCompliance)}
            <div className="text-sm text-muted-foreground">
              {dashboardData?.summary.compliantChecks} of {dashboardData?.summary.totalChecks} checks passed
            </div>
          </div>
          {dashboardData?.summary.criticalIssues > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                {dashboardData.summary.criticalIssues} critical compliance issues detected
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Compliance Standards */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Standards</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Standard</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead>Last Checked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(dashboardData?.standards || {}).map(([standard, data]) => (
                <TableRow key={standard}>
                  <TableCell className="font-medium">{standard}</TableCell>
                  <TableCell>{getComplianceStatus(data.overallCompliance)}</TableCell>
                  <TableCell>
                    {data.issues.length > 0 ? (
                      <div className="space-y-1">
                        {data.issues.map((issue, index) => (
                          <Badge
                            key={index}
                            variant={getSeverityColor(issue.severity)}
                            className="text-xs"
                          >
                            {issue.requirement}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="secondary">No Issues</Badge>
                    )}
                  </TableCell>
                  <TableCell>{new Date(data.checkedAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Audit Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {dashboardData?.auditStatistics?.totals?.totalEvents || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dashboardData?.auditStatistics?.totals?.successfulEvents || 0}
              </div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {dashboardData?.auditStatistics?.totals?.failedEvents || 0}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {dashboardData?.auditStatistics?.totals?.uniqueUsers || 0}
              </div>
              <div className="text-sm text-muted-foreground">Unique Users</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tokenization Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Tokenization Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {dashboardData?.tokenizationStatistics?.totalTokens || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Tokens</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceDashboard;
