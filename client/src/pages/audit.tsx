import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Eye, Download, Search, Filter } from "lucide-react";

const auditLogs = [
  {
    id: "1",
    timestamp: "2025-08-20 15:42:33",
    userId: "user@vendor-a.com",
    action: "health_profile.accessed",
    resource: "customer:C-12847",
    vendorId: "vendor-a",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 Chrome/119.0",
    compliance: "HIPAA"
  },
  {
    id: "2",
    timestamp: "2025-08-20 15:41:15",
    userId: "admin@vendor-b.com", 
    action: "product.created",
    resource: "product:P-98765",
    vendorId: "vendor-b",
    ipAddress: "10.0.0.50",
    userAgent: "PostmanRuntime/7.34.0",
    compliance: "SOC2"
  },
  {
    id: "3",
    timestamp: "2025-08-20 15:39:22",
    userId: "analyst@vendor-a.com",
    action: "customer.exported",
    resource: "customer:bulk_export",
    vendorId: "vendor-a",
    ipAddress: "192.168.1.105",
    userAgent: "Mozilla/5.0 Firefox/118.0",
    compliance: "HIPAA"
  },
  {
    id: "4",
    timestamp: "2025-08-20 15:37:44",
    userId: "system@odyssey.com",
    action: "health_match.computed",
    resource: "matching_session:MS-445566",
    vendorId: "vendor-c",
    ipAddress: "172.16.0.10",
    userAgent: "OdysseyMatchingEngine/2.1",
    compliance: "HIPAA"
  }
];

export default function Audit() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <TopBar 
          title="HIPAA Audit Logs" 
          subtitle="Comprehensive audit trail for health data access and system operations"
        />
        
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Compliance Audit Trail</h2>
              <p className="text-gray-600 mt-1">Monitor all health data access and system operations for regulatory compliance</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex items-center gap-2" data-testid="button-filter">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
              <Button className="flex items-center gap-2" data-testid="button-export">
                <Download className="w-4 h-4" />
                Export Logs
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events Today</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-events-today">8,947</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+12%</span> from yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">HIPAA Events</CardTitle>
                <Shield className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="text-hipaa-events">2,341</div>
                <p className="text-xs text-muted-foreground">
                  Health data access logs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-unique-users">347</div>
                <p className="text-xs text-muted-foreground">
                  Across 47 vendors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
                <Shield className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-compliance-score">99.97%</div>
                <p className="text-xs text-muted-foreground">
                  All requirements met
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Audit Event Log
                  </CardTitle>
                  <CardDescription>Real-time monitoring of all system actions and data access</CardDescription>
                </div>
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input 
                      placeholder="Search logs..." 
                      className="pl-10 w-64" 
                      data-testid="input-search"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                      <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                      <TableCell className="font-medium">{log.userId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.resource}</TableCell>
                      <TableCell>{log.vendorId}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={log.compliance === 'HIPAA' ? 'destructive' : 'default'}
                          data-testid={`badge-compliance-${log.id}`}
                        >
                          {log.compliance}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-500">{log.ipAddress}</TableCell>
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