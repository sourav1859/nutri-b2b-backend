import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, HardDrive, Zap, TrendingUp, Server, Activity } from "lucide-react";

const databaseMetrics = [
  {
    label: "Connection Pool",
    value: "847/1000",
    percentage: 84.7,
    status: "healthy",
    icon: Database
  },
  {
    label: "Query Performance",
    value: "156ms avg",
    change: "-23ms",
    status: "excellent",
    icon: Zap
  },
  {
    label: "Storage Usage",
    value: "2.3TB/5TB",
    percentage: 46,
    status: "healthy",
    icon: HardDrive
  },
  {
    label: "Throughput",
    value: "12.4K qps",
    change: "+2.1K",
    status: "excellent",
    icon: TrendingUp
  }
];

const partitionStatus = [
  {
    vendor: "Vendor A",
    tableName: "products_vendor_a",
    recordCount: "487,234",
    sizeGB: "23.4",
    lastOptimized: "2 hours ago",
    indexHealth: "Optimal"
  },
  {
    vendor: "Vendor B", 
    tableName: "products_vendor_b",
    recordCount: "1,247,891",
    sizeGB: "67.8",
    lastOptimized: "4 hours ago", 
    indexHealth: "Good"
  },
  {
    vendor: "Vendor C",
    tableName: "products_vendor_c",
    recordCount: "892,445",
    sizeGB: "45.2",
    lastOptimized: "1 day ago",
    indexHealth: "Needs Attention"
  }
];

const slowQueries = [
  {
    id: "1",
    query: "SELECT * FROM products WHERE health_benefits ILIKE '%protein%'",
    avgTime: "2.34s",
    callCount: 247,
    impact: "High"
  },
  {
    id: "2",
    query: "SELECT customer_id, health_profile FROM customers WHERE...",
    avgTime: "1.89s", 
    callCount: 156,
    impact: "Medium"
  },
  {
    id: "3",
    query: "UPDATE ingestion_jobs SET status = 'completed' WHERE...",
    avgTime: "943ms",
    callCount: 89,
    impact: "Low"
  }
];

export default function DatabaseHealth() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <TopBar 
          title="Database Health & Performance" 
          subtitle="Monitor PostgreSQL performance, partitioning strategy, and query optimization"
        />
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {databaseMetrics.map((metric, index) => (
              <Card key={index} data-testid={`card-metric-${index}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                  <metric.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid={`text-value-${index}`}>{metric.value}</div>
                  {metric.percentage && (
                    <Progress value={metric.percentage} className="mt-2 h-2" />
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    <Badge 
                      variant={metric.status === 'excellent' ? 'default' : metric.status === 'healthy' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {metric.status}
                    </Badge>
                    {metric.change && (
                      <span className="ml-2 text-green-600">{metric.change} from last hour</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  Partition Health Status
                </CardTitle>
                <CardDescription>Monitor vendor-based table partitioning and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Index Health</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partitionStatus.map((partition, index) => (
                      <TableRow key={index} data-testid={`row-partition-${index}`}>
                        <TableCell className="font-medium">{partition.vendor}</TableCell>
                        <TableCell>{partition.recordCount}</TableCell>
                        <TableCell>{partition.sizeGB} GB</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              partition.indexHealth === 'Optimal' ? 'default' : 
                              partition.indexHealth === 'Good' ? 'secondary' : 'destructive'
                            }
                            data-testid={`badge-health-${index}`}
                          >
                            {partition.indexHealth}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Real-time Metrics
                </CardTitle>
                <CardDescription>Live database performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>CPU Usage</span>
                    <span className="font-medium" data-testid="text-cpu-usage">23.4%</span>
                  </div>
                  <Progress value={23.4} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Memory Usage</span>
                    <span className="font-medium" data-testid="text-memory-usage">67.8%</span>
                  </div>
                  <Progress value={67.8} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Disk I/O</span>
                    <span className="font-medium" data-testid="text-disk-io">12.3%</span>
                  </div>
                  <Progress value={12.3} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Cache Hit Ratio</span>
                    <span className="font-medium text-green-600" data-testid="text-cache-hit">98.7%</span>
                  </div>
                  <Progress value={98.7} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Slow Query Analysis
              </CardTitle>
              <CardDescription>Identify and optimize performance bottlenecks</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead>Avg Time</TableHead>
                    <TableHead>Call Count</TableHead>
                    <TableHead>Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowQueries.map((query) => (
                    <TableRow key={query.id} data-testid={`row-query-${query.id}`}>
                      <TableCell className="font-mono text-sm max-w-xs truncate" title={query.query}>
                        {query.query}
                      </TableCell>
                      <TableCell className="font-medium text-red-600">{query.avgTime}</TableCell>
                      <TableCell>{query.callCount}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            query.impact === 'High' ? 'destructive' : 
                            query.impact === 'Medium' ? 'secondary' : 'outline'
                          }
                          data-testid={`badge-impact-${query.id}`}
                        >
                          {query.impact}
                        </Badge>
                      </TableCell>
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