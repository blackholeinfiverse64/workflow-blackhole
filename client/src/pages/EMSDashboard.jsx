import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Bell, Calendar, Mail, Send, FileText, Clock, X, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { format } from "date-fns";

export default function EMSDashboard() {
  const [stats, setStats] = useState({
    totalScheduled: 0,
    sentToday: 0,
    pending: 0,
  });
  const [templates, setTemplates] = useState([]);
  const [scheduledEmails, setScheduledEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingScheduled, setLoadingScheduled] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchTemplates();
    fetchScheduledEmails();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.ems.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching EMS stats:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await api.ems.getTemplates();
      if (response.success) {
        setTemplates(response.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchScheduledEmails = async () => {
    try {
      setLoadingScheduled(true);
      const response = await api.ems.getScheduledEmails();
      if (response.success) {
        setScheduledEmails(response.emails || []);
      }
    } catch (error) {
      console.error('Error fetching scheduled emails:', error);
    } finally {
      setLoadingScheduled(false);
    }
  };

  const handleCancelScheduledEmail = async (emailId) => {
    try {
      const response = await api.ems.cancelScheduledEmail(emailId);
      if (response.success) {
        setSuccess("Scheduled email cancelled successfully!");
        fetchScheduledEmails();
        fetchStats();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      setError(error.message || "Failed to cancel scheduled email");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSendTaskReminders = async () => {
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const response = await api.ems.sendTaskReminders({
        reminderType: "due_soon"
      });

      if (response.success) {
        setSuccess("Task reminders sent successfully!");
        fetchStats(); // Refresh stats
      }
    } catch (error) {
      setError(error.message || "Failed to send task reminders");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">EMS Dashboard</h1>
          <p className="text-muted-foreground">
            Manage automated email notifications and communications
          </p>
        </div>
        <Button
          onClick={handleSendTaskReminders}
          disabled={loading}
          className="bg-primary hover:bg-primary/90"
        >
          <Send className="h-4 w-4 mr-2" />
          Send Task Reminders
        </Button>
      </div>

      {success && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
          <Bell className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900">
          <Bell className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Emails</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalScheduled}</div>
            <p className="text-xs text-muted-foreground">
              Total emails scheduled for delivery
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sentToday}</div>
            <p className="text-xs text-muted-foreground">
              Emails sent in the last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Delivery</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Emails queued for sending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email Templates Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Email Templates
          </CardTitle>
          <CardDescription>
            Manage and customize email templates for different notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTemplates ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No email templates found
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template._id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="truncate">{template.name}</span>
                      <Badge variant="outline" className="ml-2 shrink-0">
                        {template.category}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.subject}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>Template ID: {template.templateId}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Emails Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Emails
          </CardTitle>
          <CardDescription>
            View and manage upcoming scheduled email communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingScheduled ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading scheduled emails...
            </div>
          ) : scheduledEmails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scheduled emails found
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledEmails.map((email) => (
                <Card key={email._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{email.subject}</h4>
                          <Badge 
                            variant={email.status === 'scheduled' ? 'default' : email.status === 'sent' ? 'success' : 'destructive'}
                            className="text-xs"
                          >
                            {email.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {email.scheduledTime 
                                ? format(new Date(email.scheduledTime), 'PPpp')
                                : 'Not scheduled'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{email.recipients?.length || 0} recipient(s)</span>
                          </div>
                        </div>
                        {email.status === 'sent' && email.sentAt && (
                          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>Sent: {format(new Date(email.sentAt), 'PPpp')}</span>
                          </div>
                        )}
                      </div>
                      {email.status === 'scheduled' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelScheduledEmail(email._id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}