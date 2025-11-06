import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { 
  AlertCircle, 
  Users, 
  BarChart, 
  Zap, 
  TrendingUp, 
  Target,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  Activity
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";

export default function ProcurementDashboard() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const fetchAnalysis = async () => {
    try {
      const response = await api.procurement.runAnalysis();
      if (response.success) {
        setAnalysis(response.data);
      }
    } catch (error) {
      console.error('Error running procurement analysis:', error);
      setError(error.message || "Failed to run analysis");
    }
  };

  const handleRefreshAnalysis = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await fetchAnalysis();
      setSuccess("Analysis refreshed successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error.message || "Failed to refresh analysis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section - Separated */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Procurement Agent</h1>
              <p className="text-muted-foreground">
                AI-powered employee availability analysis and task optimization
              </p>
            </div>
          </div>
          <Button
            onClick={handleRefreshAnalysis}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing..." : "Refresh Analysis"}
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Available Employees</p>
                <p className="text-2xl font-bold">{analysis?.availableEmployees?.length || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Team Workload</p>
                <p className="text-2xl font-bold">{analysis?.teamWorkload || 0}%</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Low Task Employees</p>
                <p className="text-2xl font-bold">{analysis?.lowTaskEmployees?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Low Task Alert - Below Stats */}
        {analysis?.lowTaskEmployees?.length > 0 && (
          <Alert className="border-2 border-orange-500 bg-transparent shadow-lg animate-fade-in max-w-3xl">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertTitle className="text-base font-bold text-orange-900 dark:text-orange-100">
              ⚠️ Urgent: Low Task Alert
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p className="text-sm text-orange-900 dark:text-orange-100 font-medium mb-3">
                <span className="font-bold text-orange-700 dark:text-orange-300">
                  {analysis.lowTaskEmployees.length} employee{analysis.lowTaskEmployees.length > 1 ? 's' : ''}
                </span> {analysis.lowTaskEmployees.length > 1 ? 'have' : 'has'} less than 1 active task and need{analysis.lowTaskEmployees.length > 1 ? '' : 's'} immediate assignment:
              </p>
              <div className="mt-3 space-y-2 max-h-[250px] overflow-y-auto pr-2">
                {analysis.lowTaskEmployees.map((emp) => (
                  <div 
                    key={emp.employeeId} 
                    className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-orange-900/50 border border-orange-200 dark:border-orange-700 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="h-6 w-6 rounded-full bg-orange-500/20 dark:bg-orange-500/30 flex items-center justify-center flex-shrink-0">
                      <Users className="h-3 w-3 text-orange-700 dark:text-orange-300" />
                    </div>
                    <span className="font-semibold text-sm text-orange-900 dark:text-orange-100 flex-1">
                      {emp.name}
                    </span>
                    <Badge 
                      variant="outline" 
                      className="bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-600 font-medium text-xs"
                    >
                      {emp.activeTasks} active task{emp.activeTasks !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Alerts */}
      {success && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">Success</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900 animate-fade-in">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800 dark:text-red-200">Error</AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs Navigation - Separated */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-wrap gap-3 mb-6">
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="overview"
              className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl border-2 border-muted data-[state=active]:bg-green-500 data-[state=active]:border-green-500 data-[state=active]:text-white transition-all duration-200 hover:border-green-500/50"
            >
              <BarChart className="h-4 w-4" />
              <span className="font-semibold">Overview</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="available"
              className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl border-2 border-muted data-[state=active]:bg-green-500 data-[state=active]:border-green-500 data-[state=active]:text-white transition-all duration-200 hover:border-green-500/50"
            >
              <UserCheck className="h-4 w-4" />
              <span className="font-semibold">Available Employees</span>
              <span className="ml-1 text-xs opacity-70">({analysis?.availableEmployees?.length || 0})</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="recommendations"
              className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl border-2 border-muted data-[state=active]:bg-green-500 data-[state=active]:border-green-500 data-[state=active]:text-white transition-all duration-200 hover:border-green-500/50"
            >
              <Target className="h-4 w-4" />
              <span className="font-semibold">Recommendations</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <TabsContent value="overview" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Workload Distribution</CardTitle>
                  <Activity className="h-5 w-5 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Team Average</span>
                      <span className="font-medium">{analysis?.teamWorkload || 0}%</span>
                    </div>
                    <Progress value={analysis?.teamWorkload || 0} className="h-2" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current team workload distribution across all employees
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Resource Allocation</CardTitle>
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Available</span>
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                      {analysis?.availableEmployees?.length || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Low Tasks</span>
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400">
                      {analysis?.lowTaskEmployees?.length || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="available" className="mt-0">
          <div className="space-y-4">
            {analysis?.availableEmployees?.length > 0 ? (
              analysis.availableEmployees.map((employee) => (
                <Card 
                  key={employee.employeeId}
                  className="border-l-4 border-l-green-500 transition-all hover:shadow-md"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{employee.name}</h3>
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                            Available
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Active Tasks:</span>
                            <span className="ml-2 font-medium">{employee.activeTasks}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Completion Rate:</span>
                            <span className="ml-2 font-medium">{employee.completionRate}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground mb-1">Availability Score</div>
                        <div className="text-2xl font-bold text-green-600">{employee.availabilityScore}</div>
                        <Progress value={employee.availabilityScore} className="w-24 h-2 mt-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No Available Employees</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    All employees are currently at capacity. Try refreshing the analysis or check back later.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="mt-0">
          <div className="space-y-4">
            {analysis?.recommendations?.length > 0 ? (
              analysis.recommendations.map((rec, index) => (
                <Card 
                  key={index}
                  className="border-l-4 border-l-primary transition-all hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{rec.taskType}</CardTitle>
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Recommended Assignee:</span>
                        <span className="font-medium">{rec.recommendedEmployee}</span>
                      </div>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {rec.reason}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No Recommendations Available</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Run an analysis to get AI-powered task assignment recommendations.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}