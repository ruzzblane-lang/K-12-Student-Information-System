import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Eye,
  User,
  DollarSign,
  Calendar,
  FileText,
  CreditCard,
  Building2,
  Wallet,
  Coins,
  Flag,
  Check,
  X,
} from 'lucide-react';

const PaymentApprovalDashboard = () => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    priority: '',
    assignedTo: '',
    search: ''
  });
  const [approvalData, setApprovalData] = useState({
    notes: ''
  });
  const [rejectionData, setRejectionData] = useState({
    reason: '',
    notes: ''
  });

  useEffect(() => {
    loadPendingApprovals();
    loadStats();
  }, [filters]);

  const loadPendingApprovals = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);

      const response = await fetch(`/api/payments/manual/approvals?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingApprovals(data.data);
      }
    } catch (error) {
      console.error('Error loading pending approvals:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/payments/manual/approvals/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getPaymentTypeIcon = (type) => {
    switch (type) {
      case 'bank_transfer':
        return <Building2 className="h-4 w-4" />;
      case 'card_payment':
        return <CreditCard className="h-4 w-4" />;
      case 'e_wallet':
        return <Wallet className="h-4 w-4" />;
      case 'cryptocurrency':
        return <Coins className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low':
        return 'bg-gray-100 text-gray-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewDetails = async (requestId) => {
    try {
      const response = await fetch(`/api/payments/manual/requests/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedRequest(data.data);
      }
    } catch (error) {
      console.error('Error loading request details:', error);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/payments/manual/requests/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(approvalData)
      });

      if (response.ok) {
        setShowApprovalDialog(false);
        setSelectedRequest(null);
        setApprovalData({ notes: '' });
        loadPendingApprovals();
        loadStats();
      }
    } catch (error) {
      console.error('Error approving request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/payments/manual/requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rejectionData)
      });

      if (response.ok) {
        setShowRejectionDialog(false);
        setSelectedRequest(null);
        setRejectionData({ reason: '', notes: '' });
        loadPendingApprovals();
        loadStats();
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeUntilDue = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff < 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else if (hours < 1) {
      return <Badge variant="destructive">{minutes}m left</Badge>;
    } else if (hours < 4) {
      return <Badge variant="destructive">{hours}h left</Badge>;
    } else {
      return <Badge variant="secondary">{hours}h left</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Approval Dashboard</h1>
          <p className="text-gray-600">Review and approve manual payment requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadPendingApprovals}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Tickets</p>
                  <p className="text-2xl font-bold">{stats.total_tickets}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Open Tickets</p>
                  <p className="text-2xl font-bold">{stats.open_tickets}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical</p>
                  <p className="text-2xl font-bold">{stats.critical_tickets}</p>
                </div>
                <Flag className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold">{stats.overdue_tickets}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search requests..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Select value={filters.assignedTo} onValueChange={(value) => setFilters(prev => ({ ...prev, assignedTo: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All assignees</SelectItem>
                  <SelectItem value="me">Assigned to me</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={() => setFilters({ priority: '', assignedTo: '', search: '' })} variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Approvals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingApprovals.map((approval) => (
                <TableRow key={approval.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getPaymentTypeIcon(approval.payment_type)}
                      <div>
                        <p className="font-medium">{approval.payment_type.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-600">ID: {approval.payment_request_id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{formatCurrency(approval.amount, approval.currency)}</p>
                    <p className="text-sm text-gray-600">{approval.description}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <div>
                        <p className="font-medium">{approval.requester?.first_name} {approval.requester?.last_name}</p>
                        <p className="text-sm text-gray-600">{approval.requester?.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiskLevelColor(approval.fraud_risk_level)}>
                      {approval.fraud_risk_level} ({approval.fraud_risk_score}/100)
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(approval.priority)}>
                      {approval.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm">{formatDate(approval.due_date)}</p>
                      {getTimeUntilDue(approval.due_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {approval.assignee ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{approval.assignee.first_name} {approval.assignee.last_name}</span>
                      </div>
                    ) : (
                      <Badge variant="outline">Unassigned</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(approval.payment_request_id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approve Payment Request</DialogTitle>
            <DialogDescription>
              Review the payment request details and add approval notes.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-lg font-bold">{formatCurrency(selectedRequest.amount, selectedRequest.currency)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Type</Label>
                  <p>{selectedRequest.payment_type.replace('_', ' ')}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p>{selectedRequest.description}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Fraud Risk Assessment</Label>
                <Badge className={getRiskLevelColor(selectedRequest.fraud_risk_level)}>
                  {selectedRequest.fraud_risk_level} ({selectedRequest.fraud_risk_score}/100)
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approvalNotes">Approval Notes</Label>
                <Textarea
                  id="approvalNotes"
                  value={approvalData.notes}
                  onChange={(e) => setApprovalData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes about this approval..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={loading}>
              {loading ? 'Approving...' : 'Approve Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reject Payment Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this payment request.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-lg font-bold">{formatCurrency(selectedRequest.amount, selectedRequest.currency)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Type</Label>
                  <p>{selectedRequest.payment_type.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Select value={rejectionData.reason} onValueChange={(value) => setRejectionData(prev => ({ ...prev, reason: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rejection reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insufficient_documentation">Insufficient Documentation</SelectItem>
                    <SelectItem value="fraud_risk">High Fraud Risk</SelectItem>
                    <SelectItem value="invalid_payment_details">Invalid Payment Details</SelectItem>
                    <SelectItem value="policy_violation">Policy Violation</SelectItem>
                    <SelectItem value="duplicate_request">Duplicate Request</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejectionNotes">Additional Notes</Label>
                <Textarea
                  id="rejectionNotes"
                  value={rejectionData.notes}
                  onChange={(e) => setRejectionData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Provide additional details about the rejection..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading || !rejectionData.reason}>
              {loading ? 'Rejecting...' : 'Reject Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentApprovalDashboard;
