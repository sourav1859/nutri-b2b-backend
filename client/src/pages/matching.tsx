import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Zap, Target, Activity, TrendingUp } from "lucide-react";

const matchingMetrics = [
  {
    label: "Average Match Accuracy",
    value: "94.7%",
    change: "+2.3%",
    icon: Target
  },
  {
    label: "Response Time (P95)",
    value: "247ms",
    change: "-15ms",
    icon: Zap
  },
  {
    label: "Matches Per Second",
    value: "1,247",
    change: "+89",
    icon: Activity
  },
  {
    label: "Health Score Impact",
    value: "96.2%",
    change: "+1.8%",
    icon: TrendingUp
  }
];

const recentMatches = [
  {
    id: "1",
    customerId: "C-12847",
    productName: "Organic Quinoa Bowl",
    healthGoal: "Weight Loss",
    matchScore: 97,
    caloriesPerServing: 420,
    processingTime: "189ms"
  },
  {
    id: "2", 
    customerId: "C-89432",
    productName: "Keto Avocado Salad",
    healthGoal: "Keto Diet",
    matchScore: 95,
    caloriesPerServing: 380,
    processingTime: "156ms"
  },
  {
    id: "3",
    customerId: "C-55671",
    productName: "High-Protein Smoothie",
    healthGoal: "Muscle Gain",
    matchScore: 92,
    caloriesPerServing: 280,
    processingTime: "203ms"
  }
];

export default function Matching() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <TopBar 
          title="Health Matching Engine" 
          subtitle="AI-powered nutrition matching based on customer health profiles and dietary goals"
        />
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {matchingMetrics.map((metric, index) => (
              <Card key={index} data-testid={`card-metric-${index}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                  <metric.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid={`text-value-${index}`}>{metric.value}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600" data-testid={`text-change-${index}`}>{metric.change}</span> from last hour
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Matching Algorithm Performance
                </CardTitle>
                <CardDescription>Real-time health-aware matching accuracy by category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Weight Management</span>
                    <span className="font-medium" data-testid="text-weight-accuracy">96.4%</span>
                  </div>
                  <Progress value={96.4} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Diabetes Control</span>
                    <span className="font-medium" data-testid="text-diabetes-accuracy">94.8%</span>
                  </div>
                  <Progress value={94.8} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Heart Health</span>
                    <span className="font-medium" data-testid="text-heart-accuracy">95.2%</span>
                  </div>
                  <Progress value={95.2} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Athletic Performance</span>
                    <span className="font-medium" data-testid="text-athletic-accuracy">92.7%</span>
                  </div>
                  <Progress value={92.7} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Response Time Distribution
                </CardTitle>
                <CardDescription>Latency percentiles for match API responses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">P50 (Median)</span>
                  <span className="font-medium" data-testid="text-p50">142ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">P90</span>
                  <span className="font-medium" data-testid="text-p90">198ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">P95</span>
                  <span className="font-medium" data-testid="text-p95">247ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">P99</span>
                  <span className="font-medium" data-testid="text-p99">389ms</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">SLA Target (500ms)</span>
                    <Badge variant="default" data-testid="badge-sla-status">99.8% Compliant</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Match Results
              </CardTitle>
              <CardDescription>Live matching results with health scoring and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product Matched</TableHead>
                    <TableHead>Health Goal</TableHead>
                    <TableHead>Match Score</TableHead>
                    <TableHead>Calories</TableHead>
                    <TableHead>Processing Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMatches.map((match) => (
                    <TableRow key={match.id} data-testid={`row-match-${match.id}`}>
                      <TableCell className="font-medium">{match.customerId}</TableCell>
                      <TableCell>{match.productName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{match.healthGoal}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium" data-testid={`text-score-${match.id}`}>{match.matchScore}%</span>
                          <Progress value={match.matchScore} className="w-12 h-2" />
                        </div>
                      </TableCell>
                      <TableCell>{match.caloriesPerServing} cal</TableCell>
                      <TableCell className="text-green-600 font-medium">{match.processingTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}