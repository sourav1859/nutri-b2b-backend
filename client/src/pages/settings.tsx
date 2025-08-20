import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Shield, Database, Bell, Mail } from "lucide-react";

export default function Configuration() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <TopBar 
          title="System Configuration" 
          subtitle="Configure platform settings, integrations, and operational parameters"
        />
        
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Platform Configuration</h2>
            <p className="text-gray-600 mt-1">Manage system-wide settings and operational parameters</p>
          </div>

          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="database">Database</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    General Settings
                  </CardTitle>
                  <CardDescription>Basic platform configuration and operational settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="platform-name">Platform Name</Label>
                      <Input 
                        id="platform-name" 
                        defaultValue="Odyssey B2B Nutrition Platform"
                        data-testid="input-platform-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="api-version">API Version</Label>
                      <Select defaultValue="v1">
                        <SelectTrigger data-testid="select-api-version">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="v1">v1 (Current)</SelectItem>
                          <SelectItem value="v2">v2 (Beta)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Maintenance Mode</Label>
                        <p className="text-sm text-gray-500">Enable to temporarily disable API access</p>
                      </div>
                      <Switch data-testid="switch-maintenance-mode" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Debug Logging</Label>
                        <p className="text-sm text-gray-500">Enable detailed system logging</p>
                      </div>
                      <Switch defaultChecked data-testid="switch-debug-logging" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Real-time Metrics</Label>
                        <p className="text-sm text-gray-500">Enable live performance monitoring</p>
                      </div>
                      <Switch defaultChecked data-testid="switch-metrics" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Security Configuration
                  </CardTitle>
                  <CardDescription>Authentication, authorization, and compliance settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                      <Input 
                        id="session-timeout" 
                        type="number"
                        defaultValue="60"
                        data-testid="input-session-timeout"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
                      <Input 
                        id="max-login-attempts" 
                        type="number"
                        defaultValue="5"
                        data-testid="input-max-login-attempts"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-gray-500">Require 2FA for all admin users</p>
                      </div>
                      <Switch defaultChecked data-testid="switch-2fa" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>HIPAA Compliance Mode</Label>
                        <p className="text-sm text-gray-500">Enable strict health data protections</p>
                      </div>
                      <Switch defaultChecked data-testid="switch-hipaa" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Audit All API Calls</Label>
                        <p className="text-sm text-gray-500">Log every API request for compliance</p>
                      </div>
                      <Switch defaultChecked data-testid="switch-audit-api" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cors-origins">Allowed CORS Origins</Label>
                    <Textarea 
                      id="cors-origins"
                      placeholder="https://vendor-a.com&#10;https://vendor-b.com"
                      className="h-20"
                      data-testid="textarea-cors-origins"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="database" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Database Configuration
                  </CardTitle>
                  <CardDescription>Performance tuning and connection settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="max-connections">Max Pool Connections</Label>
                      <Input 
                        id="max-connections" 
                        type="number"
                        defaultValue="100"
                        data-testid="input-max-connections"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="query-timeout">Query Timeout (ms)</Label>
                      <Input 
                        id="query-timeout" 
                        type="number"
                        defaultValue="30000"
                        data-testid="input-query-timeout"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-vacuum</Label>
                        <p className="text-sm text-gray-500">Automatically clean up deleted records</p>
                      </div>
                      <Switch defaultChecked data-testid="switch-auto-vacuum" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Query Performance Logging</Label>
                        <p className="text-sm text-gray-500">Log slow queries for optimization</p>
                      </div>
                      <Switch defaultChecked data-testid="switch-query-logging" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Read Replica Routing</Label>
                        <p className="text-sm text-gray-500">Route read queries to replica database</p>
                      </div>
                      <Switch data-testid="switch-read-replica" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Settings
                  </CardTitle>
                  <CardDescription>Configure alerts and notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>System Health Alerts</Label>
                        <p className="text-sm text-gray-500">Notify on database or API issues</p>
                      </div>
                      <Switch defaultChecked data-testid="switch-health-alerts" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Security Notifications</Label>
                        <p className="text-sm text-gray-500">Alert on suspicious activity</p>
                      </div>
                      <Switch defaultChecked data-testid="switch-security-alerts" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Ingestion Job Updates</Label>
                        <p className="text-sm text-gray-500">Notify on job completion/failure</p>
                      </div>
                      <Switch defaultChecked data-testid="switch-job-alerts" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alert-email">Alert Email Recipients</Label>
                    <Textarea 
                      id="alert-email"
                      placeholder="admin@odyssey.com&#10;security@odyssey.com"
                      className="h-20"
                      data-testid="textarea-alert-emails"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integrations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    External Integrations
                  </CardTitle>
                  <CardDescription>Configure third-party services and API keys</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="webhook-secret">Webhook Secret Key</Label>
                      <Input 
                        id="webhook-secret" 
                        type="password"
                        defaultValue="••••••••••••••••"
                        data-testid="input-webhook-secret"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appwrite-endpoint">Appwrite Endpoint</Label>
                      <Input 
                        id="appwrite-endpoint"
                        defaultValue="https://cloud.appwrite.io/v1"
                        data-testid="input-appwrite-endpoint"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Analytics Tracking</Label>
                        <p className="text-sm text-gray-500">Send usage data to analytics service</p>
                      </div>
                      <Switch defaultChecked data-testid="switch-analytics" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Error Reporting</Label>
                        <p className="text-sm text-gray-500">Automatically report system errors</p>
                      </div>
                      <Switch defaultChecked data-testid="switch-error-reporting" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3">
            <Button variant="outline" data-testid="button-reset">
              Reset to Defaults
            </Button>
            <Button data-testid="button-save">
              Save Configuration
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}