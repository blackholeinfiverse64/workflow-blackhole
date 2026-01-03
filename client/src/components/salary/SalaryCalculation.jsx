import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calculator, CalendarIcon, X, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const SalaryCalculation = ({ userId }) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [perHourRate, setPerHourRate] = useState('');
  const [workingHours, setWorkingHours] = useState(0);
  const [holidayHours, setHolidayHours] = useState(0);
  const [totalCumulativeHours, setTotalCumulativeHours] = useState(0);
  const [calculatedSalary, setCalculatedSalary] = useState(0);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();

  // Calculate working hours when date range changes
  useEffect(() => {
    if (startDate && endDate && userId) {
      fetchWorkingHours();
    }
  }, [startDate, endDate, userId]);

  // Calculate holiday hours when holidays change
  useEffect(() => {
    setHolidayHours(holidays.length * 8);
  }, [holidays]);

  // Calculate total cumulative hours
  useEffect(() => {
    setTotalCumulativeHours(workingHours + holidayHours);
  }, [workingHours, holidayHours]);

  // Calculate salary when rate or hours change
  useEffect(() => {
    if (perHourRate && totalCumulativeHours) {
      const salary = parseFloat(perHourRate) * totalCumulativeHours;
      setCalculatedSalary(salary);
    } else {
      setCalculatedSalary(0);
    }
  }, [perHourRate, totalCumulativeHours]);

  const fetchWorkingHours = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      const response = await api.get(`/new-salary/hours/${userId}`, {
        params: {
          fromDate: format(startDate, 'yyyy-MM-dd'),
          toDate: format(endDate, 'yyyy-MM-dd')
        }
      });

      if (response.success) {
        setWorkingHours(response.data.cumulativeTotal);
      }
    } catch (error) {
      console.error('Error fetching working hours:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch working hours',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = (date) => {
    if (!date) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    if (!holidays.includes(dateStr)) {
      setHolidays([...holidays, dateStr]);
    }
  };

  const handleRemoveHoliday = (dateStr) => {
    setHolidays(holidays.filter(h => h !== dateStr));
  };

  const handleCalculateSalary = async () => {
    if (!startDate || !endDate || !perHourRate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (parseFloat(perHourRate) <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Per hour rate must be greater than 0',
        variant: 'destructive'
      });
      return;
    }

    setCalculating(true);
    try {
      const response = await api.post('/new-salary/calculate', {
        userId,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        holidays: holidays,
        perHourRate: parseFloat(perHourRate)
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Salary calculated and saved successfully',
        });
        
        // Optionally refresh or show success message
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      console.error('Error calculating salary:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to calculate salary',
        variant: 'destructive'
      });
    } finally {
      setCalculating(false);
    }
  };

  return (
    <Card className="neo-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Salary Calculation
        </CardTitle>
        <CardDescription>
          Calculate salary based on working hours, holidays, and hourly rate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="startDate"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="endDate"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Holiday Selection */}
        <div className="space-y-2">
          <Label>Holidays (Each = 8 hours)</Label>
          <div className="flex gap-2 flex-wrap">
            {holidays.map((holiday, index) => (
              <Badge key={index} variant="secondary" className="px-3 py-1">
                {format(new Date(holiday), 'dd MMM yyyy')}
                <button
                  onClick={() => handleRemoveHoliday(holiday)}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Add Holiday
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  onSelect={handleAddHoliday}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-xs text-muted-foreground">
            Selected holidays: {holidays.length} ({holidays.length * 8} hours)
          </p>
        </div>

        {/* Cumulative Hours Display */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Working Hours:</span>
                <span className="font-semibold">
                  {loading ? 'Calculating...' : `${workingHours.toFixed(2)} hrs`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Holiday Hours:</span>
                <span className="font-semibold">{holidayHours} hrs</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-sm font-medium">Total Cumulative Hours:</span>
                <span className="text-lg font-bold text-primary">
                  {totalCumulativeHours.toFixed(2)} hrs
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Per Hour Rate Input */}
        <div className="space-y-2">
          <Label htmlFor="perHourRate">Per Hour Rate *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="perHourRate"
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter per hour rate"
              value={perHourRate}
              onChange={(e) => setPerHourRate(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Salary Calculation Result */}
        {calculatedSalary > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Calculated Salary</p>
                <p className="text-4xl font-bold text-primary">
                  ₹{calculatedSalary.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {totalCumulativeHours.toFixed(2)} hrs × ₹{parseFloat(perHourRate || 0).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calculate Button */}
        <Button
          onClick={handleCalculateSalary}
          disabled={calculating || !startDate || !endDate || !perHourRate || calculatedSalary === 0}
          className="w-full"
          size="lg"
        >
          <Calculator className="h-4 w-4 mr-2" />
          {calculating ? 'Calculating...' : 'Calculate & Save Salary'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SalaryCalculation;

