import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Upload,
  Download,
  Calendar,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Filter,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';

const BiometricAttendanceDashboard = () => {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filters
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedWorkType, setSelectedWorkType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Data
  const [kpis, setKpis] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [salaryData, setSalaryData] = useState(null);
  const [detailedLogs, setDetailedLogs] = useState([]);
  const [employeeAggregates, setEmployeeAggregates] = useState([]);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);

  // API base URL - use environment variable or fallback to localhost
  const API_BASE = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/biometric-attendance`
    : 'http://localhost:5001/api/biometric-attendance';
  const token = localStorage.getItem('WorkflowToken');

  const axiosConfig = {
    headers: {
      'x-auth-token': token,
      'Content-Type': 'application/json'
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetchDepartments();
    fetchUsers();
    fetchKPIs();
    fetchUploadHistory();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      fetchSalaryData();
      fetchDetailedLogs();
      fetchEmployeeAggregates();
    }
  }, [dateRange, selectedDepartment, selectedUser, selectedWorkType, selectedStatus]);

  // API Functions
  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API_BASE}/departments`, axiosConfig);
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = selectedDepartment && selectedDepartment !== 'all' ? { departmentId: selectedDepartment } : {};
      const response = await axios.get(`${API_BASE}/users`, { ...axiosConfig, params });
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchKPIs = async () => {
    try {
      const params = {
        departmentId: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        workType: selectedWorkType !== 'all' ? selectedWorkType : undefined
      };
      const response = await axios.get(`${API_BASE}/dashboard-kpis`, { ...axiosConfig, params });
      setKpis(response.data.data);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      setError('Failed to fetch dashboard KPIs');
    }
  };

  const fetchSalaryData = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/salary-calculation`, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        userId: selectedUser !== 'all' ? selectedUser : undefined,
        departmentId: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        workType: selectedWorkType !== 'all' ? selectedWorkType : undefined
      }, axiosConfig);
      setSalaryData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching salary data:', error);
      setError('Failed to calculate salary');
      setLoading(false);
    }
  };

  const fetchDetailedLogs = async () => {
    try {
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        userId: selectedUser !== 'all' ? selectedUser : undefined,
        departmentId: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        workType: selectedWorkType !== 'all' ? selectedWorkType : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined
      };
      const response = await axios.get(`${API_BASE}/detailed-logs`, { ...axiosConfig, params });
      setDetailedLogs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching detailed logs:', error);
    }
  };

  const fetchEmployeeAggregates = async () => {
    try {
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        departmentId: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        workType: selectedWorkType !== 'all' ? selectedWorkType : undefined
      };
      const response = await axios.get(`${API_BASE}/employee-aggregates`, { ...axiosConfig, params });
      setEmployeeAggregates(response.data.data || []);
    } catch (error) {
      console.error('Error fetching employee aggregates:', error);
    }
  };

  const fetchUploadHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE}/upload-history`, { ...axiosConfig, params: { limit: 10 } });
      setUploadHistory(response.data.data || []);
    } catch (error) {
      console.error('Error fetching upload history:', error);
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!uploadFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await axios.post(`${API_BASE}/upload`, formData, {
        headers: {
          'x-auth-token': localStorage.getItem('WorkflowToken'),
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(`File uploaded successfully! Processed ${response.data.data.processedRecords} records.`);
      setUploadFile(null);
      fetchUploadHistory();
      setLoading(false);
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.response?.data?.error || 'Failed to upload file');
      setLoading(false);
    }
  };

  // Derive attendance from punches
  const handleDeriveAttendance = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      setError('Please select date range');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await axios.post(`${API_BASE}/derive-attendance`, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }, axiosConfig);

      setSuccess(`Attendance derived successfully! Created ${response.data.data.created} records.`);
      fetchSalaryData();
      fetchDetailedLogs();
      fetchEmployeeAggregates();
      fetchKPIs();
      setLoading(false);
    } catch (error) {
      console.error('Error deriving attendance:', error);
      setError(error.response?.data?.error || 'Failed to derive attendance');
      setLoading(false);
    }
  };

  // Export functions
  const handleExportSalary = () => {
    const params = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      ...(selectedDepartment !== 'all' && { departmentId: selectedDepartment }),
      ...(selectedWorkType !== 'all' && { workType: selectedWorkType })
    });

    window.open(`${API_BASE}/export-salary?${params.toString()}`, '_blank');
  };

  const handleExportLogs = () => {
    const params = new URLSearchParams({
      ...(dateRange.startDate && { startDate: dateRange.startDate }),
      ...(dateRange.endDate && { endDate: dateRange.endDate }),
      ...(selectedDepartment !== 'all' && { departmentId: selectedDepartment }),
      ...(selectedWorkType !== 'all' && { workType: selectedWorkType }),
      ...(selectedStatus !== 'all' && { status: selectedStatus })
    });

    window.open(`${API_BASE}/export-detailed-logs?${params.toString()}`, '_blank');
  };

  // Helper function to get status badge
  const getStatusBadge = (status) => {
    const variants = {
      'Present': 'default',
      'Absent': 'destructive',
      'Half Day': 'secondary',
      'Late': 'outline',
      'On Leave': 'secondary'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Biometric Attendance & Salary Management</h1>
          <p className="text-muted-foreground mt-1">
            Live attendance tracking, biometric data processing, and salary calculations
          </p>
        </div>
        <Button onClick={() => {
          fetchKPIs();
          fetchSalaryData();
          fetchDetailedLogs();
          fetchEmployeeAggregates();
        }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      {kpis && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                Present: {kpis.presentToday} | Absent: {kpis.absentToday}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{kpis.presentToday}</div>
              <p className="text-xs text-muted-foreground">
                Late: {kpis.lateToday} | WFH: {kpis.wfhToday}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Hours Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.averageHoursToday.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Total: {kpis.totalHoursToday.toFixed(1)} hrs | OT: {kpis.overtimeToday.toFixed(1)} hrs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimated Payroll</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${salaryData?.grandTotal?.totalPayable?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                For selected period
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">
            <Upload className="w-4 h-4 mr-2" />
            Upload Data
          </TabsTrigger>
          <TabsTrigger value="salary">
            <DollarSign className="w-4 h-4 mr-2" />
            Salary Calculation
          </TabsTrigger>
          <TabsTrigger value="logs">
            <FileText className="w-4 h-4 mr-2" />
            Detailed Logs
          </TabsTrigger>
          <TabsTrigger value="aggregates">
            <TrendingUp className="w-4 h-4 mr-2" />
            Employee Summary
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Biometric Data</CardTitle>
              <CardDescription>
                Upload CSV or Excel files containing biometric punch data. The system will automatically parse and map employee records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Select File (CSV or Excel)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                />
                <p className="text-xs text-muted-foreground">
                  Expected columns: Employee ID, Biometric ID, Punch Time, Device ID, Location
                </p>
              </div>

              <Button
                onClick={handleFileUpload}
                disabled={loading || !uploadFile}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Process
                  </>
                )}
              </Button>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Derive Daily Attendance</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  After uploading biometric punches, click here to group them by employee and date, then calculate daily worked hours.
                </p>
                <Button
                  onClick={handleDeriveAttendance}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Derive Attendance from Punches
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upload History */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Matches</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadHistory.length > 0 ? (
                    uploadHistory.map((upload) => (
                      <TableRow key={upload._id}>
                        <TableCell className="font-medium">{upload.originalFileName}</TableCell>
                        <TableCell>{new Date(upload.uploadDate).toLocaleString()}</TableCell>
                        <TableCell>{upload.totalRecords}</TableCell>
                        <TableCell>{upload.successfulMatches}</TableCell>
                        <TableCell>
                          <Badge variant={upload.status === 'Completed' ? 'default' : 'secondary'}>
                            {upload.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No uploads yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salary Tab */}
        <TabsContent value="salary" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept._id} value={dept._id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Work Type</Label>
                  <Select value={selectedWorkType} onValueChange={setSelectedWorkType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Office">Office</SelectItem>
                      <SelectItem value="WFH">WFH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleExportSalary} variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grand Total */}
          {salaryData && (
            <Card>
              <CardHeader>
                <CardTitle>Grand Total Summary</CardTitle>
                <CardDescription>
                  Period: {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                    <p className="text-2xl font-bold">{salaryData.grandTotal.totalEmployees}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Present Days</p>
                    <p className="text-2xl font-bold text-green-600">{salaryData.grandTotal.totalPresentDays}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                    <p className="text-2xl font-bold">{salaryData.grandTotal.totalHours.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Overtime Hours</p>
                    <p className="text-2xl font-bold text-orange-600">{salaryData.grandTotal.totalOvertimeHours.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Payable</p>
                    <p className="text-2xl font-bold text-blue-600">${salaryData.grandTotal.totalPayable.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Employee-wise Salary */}
          <Card>
            <CardHeader>
              <CardTitle>Employee-wise Salary Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Present</TableHead>
                    <TableHead className="text-right">Absent</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">OT Hours</TableHead>
                    <TableHead className="text-right">Regular Pay</TableHead>
                    <TableHead className="text-right">OT Pay</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryData?.employees?.length > 0 ? (
                    salaryData.employees.map((emp) => (
                      <TableRow key={emp.user._id}>
                        <TableCell className="font-medium">{emp.user.name}</TableCell>
                        <TableCell>{emp.user.department?.name || 'N/A'}</TableCell>
                        <TableCell className="text-right">{emp.summary.presentDays}</TableCell>
                        <TableCell className="text-right">{emp.summary.absentDays}</TableCell>
                        <TableCell className="text-right">{emp.summary.totalHours.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{emp.summary.overtimeHours.toFixed(1)}</TableCell>
                        <TableCell className="text-right">${emp.summary.regularPay.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${emp.summary.overtimePay.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold">${emp.summary.totalPayable.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        {loading ? 'Loading...' : 'No data available for selected period'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept._id} value={dept._id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Work Type</Label>
                  <Select value={selectedWorkType} onValueChange={setSelectedWorkType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Office">Office</SelectItem>
                      <SelectItem value="WFH">WFH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Present">Present</SelectItem>
                      <SelectItem value="Absent">Absent</SelectItem>
                      <SelectItem value="Half Day">Half Day</SelectItem>
                      <SelectItem value="Late">Late</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleExportLogs} variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Attendance Logs</CardTitle>
              <CardDescription>
                Showing {detailedLogs.length} records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Punch In</TableHead>
                      <TableHead>Punch Out</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">OT</TableHead>
                      <TableHead>Work Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedLogs.length > 0 ? (
                      detailedLogs.map((log) => (
                        <TableRow key={log._id}>
                          <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{log.user?.name}</TableCell>
                          <TableCell>{log.user?.department?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {log.biometricTimeIn
                              ? new Date(log.biometricTimeIn).toLocaleTimeString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {log.biometricTimeOut
                              ? new Date(log.biometricTimeOut).toLocaleTimeString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            {log.totalHoursWorked?.toFixed(1) || '0.0'}
                          </TableCell>
                          <TableCell className="text-right">
                            {log.overtimeHours?.toFixed(1) || '0.0'}
                          </TableCell>
                          <TableCell>{log.workLocationType || 'Office'}</TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          No logs available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aggregates Tab */}
        <TabsContent value="aggregates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee Summary ({dateRange.startDate} to {dateRange.endDate})</CardTitle>
              <CardDescription>
                Aggregated attendance and salary data by employee
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Present</TableHead>
                    <TableHead className="text-right">Absent</TableHead>
                    <TableHead className="text-right">Half Day</TableHead>
                    <TableHead className="text-right">Leave</TableHead>
                    <TableHead className="text-right">Late</TableHead>
                    <TableHead className="text-right">Total Hrs</TableHead>
                    <TableHead className="text-right">OT Hrs</TableHead>
                    <TableHead className="text-right">Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeAggregates.length > 0 ? (
                    employeeAggregates.map((agg) => (
                      <TableRow key={agg._id}>
                        <TableCell className="font-medium">{agg.userName}</TableCell>
                        <TableCell>{agg.departmentName || 'N/A'}</TableCell>
                        <TableCell className="text-right">{agg.presentDays}</TableCell>
                        <TableCell className="text-right">{agg.absentDays}</TableCell>
                        <TableCell className="text-right">{agg.halfDays}</TableCell>
                        <TableCell className="text-right">{agg.leaveDays}</TableCell>
                        <TableCell className="text-right">{agg.lateDays}</TableCell>
                        <TableCell className="text-right">{agg.totalHours}</TableCell>
                        <TableCell className="text-right">{agg.overtimeHours}</TableCell>
                        <TableCell className="text-right font-bold">
                          ${agg.totalEarned.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BiometricAttendanceDashboard;
