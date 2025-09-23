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
  Upload,
  CreditCard,
  Building2,
  Wallet,
  Coins,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Shield,
  Clock,
} from 'lucide-react';

const ManualPaymentRequestForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    paymentType: '',
    amount: '',
    currency: 'USD',
    description: '',
    studentId: '',
    priority: 'normal',
    paymentDetails: {},
    supportingDocuments: []
  });

  const [paymentTypes, setPaymentTypes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [fraudAssessment, setFraudAssessment] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // Load payment types and students on component mount
  useEffect(() => {
    loadPaymentTypes();
    loadStudents();
  }, []);

  const loadPaymentTypes = async () => {
    try {
      const response = await fetch('/api/payments/manual/types', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPaymentTypes(data.data);
      }
    } catch (error) {
      console.error('Error loading payment types:', error);
    }
  };

  const loadStudents = async () => {
    try {
      // This would be replaced with actual API call to get students
      // For now, using mock data
      setStudents([
        { id: '1', name: 'John Doe', grade: '10th Grade' },
        { id: '2', name: 'Jane Smith', grade: '11th Grade' },
        { id: '3', name: 'Bob Johnson', grade: '12th Grade' }
      ]);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear related errors
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handlePaymentDetailsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      paymentDetails: {
        ...prev.paymentDetails,
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    const newValidationErrors = [];

    // Basic validation
    if (!formData.paymentType) {
      newErrors.paymentType = 'Payment type is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (!formData.description) {
      newErrors.description = 'Description is required';
    }

    // Payment type specific validation
    const selectedType = paymentTypes.find(type => type.name === formData.paymentType);
    if (selectedType) {
      selectedType.required_fields.forEach(field => {
        if (!formData.paymentDetails[field]) {
          newValidationErrors.push(`${field} is required for ${selectedType.display_name}`);
        }
      });
    }

    setErrors(newErrors);
    setValidationErrors(newValidationErrors);

    return Object.keys(newErrors).length === 0 && newValidationErrors.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/payments/manual/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          studentId: formData.studentId || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setFraudAssessment(data.data.fraudAssessment);
        if (onSuccess) {
          onSuccess(data.data);
        }
      } else {
        setErrors({ submit: data.error || 'Failed to submit payment request' });
        if (data.details) {
          setValidationErrors(data.details);
        }
      }
    } catch (error) {
      console.error('Error submitting payment request:', error);
      setErrors({ submit: 'Network error occurred' });
    } finally {
      setLoading(false);
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

  const renderPaymentDetailsFields = () => {
    const selectedType = paymentTypes.find(type => type.name === formData.paymentType);
    if (!selectedType) return null;

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">
          {selectedType.display_name} Details
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          {selectedType.description}
        </p>

        {selectedType.required_fields.map(field => (
          <div key={field} className="space-y-2">
            <Label htmlFor={field} className="text-sm font-medium">
              {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Label>
            <Input
              id={field}
              type={field.includes('number') || field.includes('cvv') ? 'password' : 'text'}
              value={formData.paymentDetails[field] || ''}
              onChange={(e) => handlePaymentDetailsChange(field, e.target.value)}
              placeholder={`Enter ${field.replace(/_/g, ' ')}`}
              className="w-full"
            />
          </div>
        ))}
      </div>
    );
  };

  if (fraudAssessment) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Payment Request Submitted
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className={fraudAssessment.riskLevel === 'low' ? 'border-green-200 bg-green-50' : 
                          fraudAssessment.riskLevel === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                          fraudAssessment.riskLevel === 'high' ? 'border-orange-200 bg-orange-50' :
                          'border-red-200 bg-red-50'}>
            <div className="flex items-center gap-2">
              {fraudAssessment.riskLevel === 'low' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
               fraudAssessment.riskLevel === 'medium' ? <Clock className="h-4 w-4 text-yellow-600" /> :
               fraudAssessment.riskLevel === 'high' ? <AlertTriangle className="h-4 w-4 text-orange-600" /> :
               <XCircle className="h-4 w-4 text-red-600" />}
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <span>Risk Assessment:</span>
                  <Badge className={getRiskLevelColor(fraudAssessment.riskLevel)}>
                    {fraudAssessment.riskLevel.toUpperCase()} ({fraudAssessment.riskScore}/100)
                  </Badge>
                </div>
              </AlertDescription>
            </div>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium">Recommendation:</h4>
            <p className="text-sm text-gray-600">
              {fraudAssessment.recommendation === 'approve' ? 
                'Your payment request has been submitted and will be processed automatically.' :
                fraudAssessment.recommendation === 'review' ?
                'Your payment request requires manual review due to risk assessment.' :
                'Your payment request has been flagged for additional verification.'}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Next Steps:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• You will receive email notifications about status updates</li>
              <li>• Check your dashboard for real-time status updates</li>
              <li>• Contact support if you have any questions</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={onCancel} className="w-full">
            Close
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Manual Payment Request
        </CardTitle>
        <p className="text-sm text-gray-600">
          Submit a payment request for alternative payment methods
        </p>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {errors.submit && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Payment Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="paymentType" className="text-sm font-medium">
              Payment Type *
            </Label>
            <Select value={formData.paymentType} onValueChange={(value) => handleInputChange('paymentType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>
              <SelectContent>
                {paymentTypes.map(type => (
                  <SelectItem key={type.name} value={type.name}>
                    <div className="flex items-center gap-2">
                      {getPaymentTypeIcon(type.name)}
                      {type.display_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.paymentType && (
              <p className="text-sm text-red-600">{errors.paymentType}</p>
            )}
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Amount *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency" className="text-sm font-medium">
                Currency
              </Label>
              <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Student Selection */}
          <div className="space-y-2">
            <Label htmlFor="studentId" className="text-sm font-medium">
              Student (Optional)
            </Label>
            <Select value={formData.studentId} onValueChange={(value) => handleInputChange('studentId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select student (if applicable)" />
              </SelectTrigger>
              <SelectContent>
                {students.map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name} - {student.grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description *
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the purpose of this payment..."
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="text-sm font-medium">
              Priority
            </Label>
            <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Standard processing</SelectItem>
                <SelectItem value="normal">Normal - Regular processing</SelectItem>
                <SelectItem value="high">High - Expedited processing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Payment Details */}
          {formData.paymentType && (
            <div className="space-y-4">
              {renderPaymentDetailsFields()}
            </div>
          )}

          {/* Supporting Documents */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Supporting Documents (Optional)
            </Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Upload supporting documents (receipts, invoices, etc.)
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-2">
                Choose Files
              </Button>
            </div>
          </div>

          {/* Security Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Notice:</strong> All payment information is encrypted and processed securely. 
              We use advanced fraud detection to protect your transactions.
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Submitting...' : 'Submit Payment Request'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ManualPaymentRequestForm;
