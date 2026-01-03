import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Download, Users } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

const HoursManagement = ({ userId }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  
  const [hoursData, setHoursData] = useState([]);
  const [allUsersHours, setAllUsersHours] = useState([]);
  const [cumulativeTotal, setCumulativeTotal] = useState(0);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState(isAdmin ? 'all' : 'single'); // 'all' or 'single'
  const { toast } = useToast();

  // Set default date range (last month)
  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1); // First day of last month
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of last month
    
    setFromDate(format(lastMonth, 'yyyy-MM-dd'));
    setToDate(format(lastDayOfLastMonth, 'yyyy-MM-dd'));
  }, []);

  // Check if dates are in the future
  useEffect(() => {
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      const today = new Date();
      
      if (from > today || to > today) {
        console.warn('⚠️ Warning: Selected dates are in the future. Make sure you meant to query future dates.');
      }
    }
  }, [fromDate, toDate]);

  // Fetch hours data when dates change
  useEffect(() => {
    if (fromDate && toDate) {
      if (viewMode === 'all' && isAdmin) {
        fetchAllUsersHours();
      } else if (userId) {
        fetchHoursData();
      }
    }
  }, [fromDate, toDate, userId, viewMode, isAdmin]);

  const fetchAllUsersHours = async () => {
    if (!fromDate || !toDate) return;

    setLoading(true);
    try {
      console.log('Fetching all users hours from AIMS:', { fromDate, toDate });
      
      const response = await api.get('/new-salary/hours/all', {
        params: {
          fromDate: fromDate,
          toDate: toDate
        }
      });

      console.log('All users hours API response:', response);

      if (response.success) {
        const users = response.data?.users || [];
        const totalHours = response.data?.totalCumulativeHours || 0;
        
        console.log(`Found ${users.length} users with total ${totalHours} hours`);
        
        setAllUsersHours(users);
        setCumulativeTotal(totalHours);
        
        if (users.length === 0) {
          toast({
            title: 'No Data Found',
            description: `No AIMS records found for ${fromDate} to ${toDate}.`,
            variant: 'default'
          });
        }
      } else {
        throw new Error(response.error || 'Failed to fetch users hours');
      }
    } catch (error) {
      console.error('Error fetching all users hours:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch users hours data';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      setAllUsersHours([]);
      setCumulativeTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchHoursData = async () => {
    if (!fromDate || !toDate || !userId) return;

    setLoading(true);
    try {
      console.log('Fetching hours for:', { userId, fromDate, toDate });
      
      const response = await api.get(`/new-salary/hours/${userId}`, {
        params: {
          fromDate: fromDate,
          toDate: toDate
        }
      });

      console.log('Hours API response:', response);
      console.log('Hours data:', response.data?.hoursData);
      console.log('Cumulative total:', response.data?.cumulativeTotal);
      console.log('Total days:', response.data?.totalDays);

      if (response.success) {
        const hoursData = response.data?.hoursData || [];
        const cumulative = response.data?.cumulativeTotal || 0;
        
        console.log(`Found ${hoursData.length} records with ${cumulative} total hours`);
        
        setHoursData(hoursData);
        setCumulativeTotal(cumulative);
        
        if (hoursData.length === 0) {
          toast({
            title: 'No Data Found',
            description: `No attendance records found for ${fromDate} to ${toDate}. Please check if the dates are correct (use 2024 for past months).`,
            variant: 'default'
          });
        }
      } else {
        throw new Error(response.error || 'Failed to fetch hours');
      }
    } catch (error) {
      console.error('Error fetching hours:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch hours data';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      setHoursData([]);
      setCumulativeTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'HH:mm:ss');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd MMM yyyy');
  };

  return (
    <Card className="neo-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Hours Management
        </CardTitle>
        <CardDescription>
          View date-wise working hours and cumulative total
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* View Mode Toggle (Admin only) */}
        {isAdmin && (
          <div className="flex items-center gap-4 mb-4">
          <Label>View Mode:</Label>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('all')}
            >
              <Users className="h-4 w-4 mr-2" />
              All Users
            </Button>
            <Button
              variant={viewMode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('single')}
            >
              <Clock className="h-4 w-4 mr-2" />
              Single User
            </Button>
          </div>
        </div>
        )}

        {/* Date Range Filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fromDate">From Date</Label>
            <Input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="toDate">To Date</Label>
            <Input
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={() => {
                console.log('🔍 Applying filter:', { fromDate, toDate, viewMode });
                if (viewMode === 'all' && isAdmin) {
                  fetchAllUsersHours();
                } else if (userId) {
                  fetchHoursData();
                }
              }} 
              disabled={loading || !fromDate || !toDate}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Apply Filter
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {viewMode === 'all' ? 'Total Cumulative Hours (All Users)' : 'Total Cumulative Hours'}
                </p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {cumulativeTotal.toFixed(2)} hrs
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {viewMode === 'all' ? 'Total Users' : 'Total Days'}
                </p>
                <p className="text-2xl font-semibold text-foreground mt-1">
                  {viewMode === 'all' ? allUsersHours.length : hoursData.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All Users Hours Table (Admin View) */}
        {viewMode === 'all' && isAdmin ? (
          loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading users hours data...
            </div>
          ) : allUsersHours.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No AIMS data found for the selected date range
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead className="text-right">Total Days</TableHead>
                    <TableHead className="text-right">Cumulative Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsersHours.map((user, index) => (
                    <TableRow key={user.userId || index}>
                      <TableCell className="font-medium">
                        {user.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.department}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.employeeId || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.totalDays}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {user.cumulativeHours.toFixed(2)} hrs
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          /* Single User Hours Table */
          loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading hours data...
            </div>
          ) : hoursData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hours data found for the selected date range
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Check-Out</TableHead>
                    <TableHead className="text-right">Daily Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hoursData.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {formatDate(record.date)}
                      </TableCell>
                      <TableCell>
                        {formatTime(record.checkIn)}
                      </TableCell>
                      <TableCell>
                        {formatTime(record.checkOut)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {record.dailyHours.toFixed(2)} hrs
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default HoursManagement;

