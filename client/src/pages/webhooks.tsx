import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Send, Clock, CheckCircle, XCircle } from "lucide-react";

const webhooks = [
  {
    id: "1",
    endpoint: "https://vendor-a.com/webhooks/nutrition",
    vendor: "Vendor A",
    events: ["product.created", "product.updated"],
    status: "active",
    lastDelivery: "2 minutes ago",
    successRate: 98.5
  },
  {
    id: "2",
    endpoint: "https://vendor-b.com/api/webhooks",
    vendor: "Vendor B", 
    events: ["customer.created", "order.completed"],
    status: "active",
    lastDelivery: "5 minutes ago",
    successRate: 99.2
  },
  {
    id: "3",
    endpoint: "https://analytics.vendor-c.com/hooks",
    vendor: "Vendor C",
    events: ["analytics.updated"],
    status: "failed",
    lastDelivery: "2 hours ago",
    successRate: 87.3
  }
];

const recentDeliveries = [
  {
    id: "1",
    endpoint: "vendor-a.com",
    event: "product.created",
    status: "success",
    timestamp: "2 mins ago",
    responseCode: 200
  },
  {
    id: "2", 
    endpoint: "vendor-b.com",
    event: "customer.created",
    status: "success",
    timestamp: "5 mins ago",
    responseCode: 200
  },
  {
    id: "3",
    endpoint: "vendor-c.com",
    event: "analytics.updated",
    status: "failed",
    timestamp: "2 hours ago",
    responseCode: 500
  }
];

export default function Webhooks() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <TopBar 
          title="Webhook Management" 
          subtitle="Configure and monitor real-time event notifications to vendor endpoints"
        />
        
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Webhook Endpoints</h2>
              <p className="text-gray-600 mt-1">Manage real-time notifications and delivery monitoring</p>
            </div>
            <Button className="flex items-center gap-2" data-testid="button-add-webhook">
              <Plus className="w-4 h-4" />
              Add Webhook
            </Button>
          </div>

          <div className="grid gap-6">
            {webhooks.map((webhook) => (
              <Card key={webhook.id} data-testid={`card-webhook-${webhook.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{webhook.vendor}</CardTitle>
                      <CardDescription>{webhook.endpoint}</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={webhook.status === 'active' ? 'default' : 'destructive'}
                        data-testid={`badge-status-${webhook.id}`}
                      >
                        {webhook.status}
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm font-medium" data-testid={`text-success-rate-${webhook.id}`}>
                          {webhook.successRate}% success
                        </p>
                        <p className="text-xs text-gray-500">{webhook.lastDelivery}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {webhook.events.map((event, index) => (
                      <Badge key={index} variant="outline" data-testid={`badge-event-${webhook.id}-${index}`}>
                        {event}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Recent Deliveries
              </CardTitle>
              <CardDescription>Monitor webhook delivery status and response codes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Code</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDeliveries.map((delivery) => (
                    <TableRow key={delivery.id} data-testid={`row-delivery-${delivery.id}`}>
                      <TableCell>{delivery.endpoint}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{delivery.event}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {delivery.status === 'success' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className={delivery.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                            {delivery.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={delivery.responseCode === 200 ? 'default' : 'destructive'}>
                          {delivery.responseCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">{delivery.timestamp}</TableCell>
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