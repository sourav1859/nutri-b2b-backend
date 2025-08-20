import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Settings, Webhook, RefreshCw, AlertCircle } from "lucide-react";

const connectors = [
  {
    id: "1",
    name: "NutritionIX API",
    vendor: "Vendor A",
    status: "active",
    lastSync: "2 minutes ago",
    recordsProcessed: 15420,
    endpoint: "https://api.nutritionix.com/v2"
  },
  {
    id: "2", 
    name: "FoodData Central",
    vendor: "USDA",
    status: "active",
    lastSync: "1 hour ago",
    recordsProcessed: 89342,
    endpoint: "https://api.nal.usda.gov/fdc/v1"
  },
  {
    id: "3",
    name: "Custom Vendor API",
    vendor: "Vendor B",
    status: "error",
    lastSync: "Failed",
    recordsProcessed: 0,
    endpoint: "https://api.vendor-b.com/nutrition"
  }
];

export default function Connectors() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <TopBar 
          title="API Connectors" 
          subtitle="Manage external data integrations and real-time synchronization"
        />
        
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">External Data Connectors</h2>
              <p className="text-gray-600 mt-1">Configure and monitor API integrations for real-time data synchronization</p>
            </div>
            <Button className="flex items-center gap-2" data-testid="button-add-connector">
              <Plus className="w-4 h-4" />
              Add Connector
            </Button>
          </div>

          <div className="grid gap-6">
            {connectors.map((connector) => (
              <Card key={connector.id} data-testid={`card-connector-${connector.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Webhook className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{connector.name}</CardTitle>
                        <CardDescription>{connector.vendor} • {connector.endpoint}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={connector.status === 'active' ? 'default' : 'destructive'}
                        data-testid={`badge-status-${connector.id}`}
                      >
                        {connector.status}
                      </Badge>
                      <Switch 
                        checked={connector.status === 'active'}
                        data-testid={`switch-enabled-${connector.id}`}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-gray-500">Last Sync</p>
                      <p className="font-medium flex items-center gap-2" data-testid={`text-last-sync-${connector.id}`}>
                        {connector.status === 'error' ? (
                          <><AlertCircle className="w-4 h-4 text-red-500" /> {connector.lastSync}</>
                        ) : (
                          <><RefreshCw className="w-4 h-4 text-green-500" /> {connector.lastSync}</>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Records Processed</p>
                      <p className="font-medium" data-testid={`text-records-${connector.id}`}>
                        {connector.recordsProcessed.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" className="flex items-center gap-2" data-testid={`button-configure-${connector.id}`}>
                        <Settings className="w-4 h-4" />
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}