import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Clock, AlertTriangle } from 'lucide-react';
import HoursManagement from '@/components/salary/HoursManagement';
import SalaryCalculation from '@/components/salary/SalaryCalculation';
import SpamUsers from '@/components/salary/SpamUsers';
import { useAuth } from '@/context/auth-context';

const NewSalaryManagement = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('hours');

  // Use userId from params or current user
  const targetUserId = userId || user?._id || user?.id;

  if (!targetUserId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please select an employee or log in to view salary management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Salary Management</h1>
        <p className="text-muted-foreground">
          Manage working hours and calculate salaries based on hourly rates
        </p>
      </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="hours" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Hours Management
                  </TabsTrigger>
                  <TabsTrigger value="calculation" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Salary Calculation
                  </TabsTrigger>
                  <TabsTrigger value="spam" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Spam Users
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="hours" className="mt-6">
                  <HoursManagement userId={targetUserId} />
                </TabsContent>

                <TabsContent value="calculation" className="mt-6">
                  <SalaryCalculation userId={targetUserId} />
                </TabsContent>

                <TabsContent value="spam" className="mt-6">
                  <SpamUsers />
                </TabsContent>
              </Tabs>
    </div>
  );
};

export default NewSalaryManagement;

