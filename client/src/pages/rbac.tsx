import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { PanelRightDashed, Users, Shield, Plus, Settings } from "lucide-react";

const roles = [
  {
    id: "1",
    name: "Admin",
    description: "Full system access and vendor management",
    userCount: 12,
    permissions: ["read:all", "write:all", "delete:all", "admin:*"],
    color: "bg-red-100 text-red-800"
  },
  {
    id: "2",
    name: "Vendor Manager",
    description: "Manage vendor products and customer data",
    userCount: 47,
    permissions: ["read:products", "write:products", "read:customers", "write:customers"],
    color: "bg-blue-100 text-blue-800"
  },
  {
    id: "3",
    name: "Data Analyst", 
    description: "Read-only access to analytics and reports",
    userCount: 23,
    permissions: ["read:analytics", "read:reports", "read:audit"],
    color: "bg-green-100 text-green-800"
  },
  {
    id: "4",
    name: "Customer Support",
    description: "Limited customer service access",
    userCount: 156,
    permissions: ["read:customers", "read:support"],
    color: "bg-purple-100 text-purple-800"
  }
];

const recentUsers = [
  {
    id: "1",
    email: "admin@vendor-a.com",
    role: "Admin",
    vendor: "Vendor A",
    lastActive: "2 mins ago",
    status: "active"
  },
  {
    id: "2",
    email: "manager@vendor-b.com", 
    role: "Vendor Manager",
    vendor: "Vendor B",
    lastActive: "15 mins ago",
    status: "active"
  },
  {
    id: "3",
    email: "analyst@vendor-a.com",
    role: "Data Analyst",
    vendor: "Vendor A", 
    lastActive: "1 hour ago",
    status: "inactive"
  }
];

export default function RBAC() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <TopBar 
          title="Role-Based Access Control" 
          subtitle="Manage user permissions and access control across vendors and data types"
        />
        
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Access Control Management</h2>
              <p className="text-gray-600 mt-1">Configure roles, permissions, and user access across the platform</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex items-center gap-2" data-testid="button-invite-user">
                <Users className="w-4 h-4" />
                Invite User
              </Button>
              <Button className="flex items-center gap-2" data-testid="button-create-role">
                <Plus className="w-4 h-4" />
                Create Role
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-users">238</div>
                <p className="text-xs text-muted-foreground">
                  Across 47 vendors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
                <PanelRightDashed className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-roles">4</div>
                <p className="text-xs text-muted-foreground">
                  Custom role definitions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                <Shield className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-active-sessions">89</div>
                <p className="text-xs text-muted-foreground">
                  Currently logged in
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Score</CardTitle>
                <Shield className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600" data-testid="text-security-score">98.5%</div>
                <p className="text-xs text-muted-foreground">
                  Access control compliance
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PanelRightDashed className="w-5 h-5" />
                  Role Definitions
                </CardTitle>
                <CardDescription>Configure permissions and access levels for different user types</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {roles.map((role) => (
                  <div key={role.id} className="border rounded-lg p-4" data-testid={`card-role-${role.id}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={role.color}>{role.name}</Badge>
                        <span className="text-sm text-gray-500" data-testid={`text-user-count-${role.id}`}>
                          {role.userCount} users
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" data-testid={`button-configure-${role.id}`}>
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map((permission, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs"
                          data-testid={`badge-permission-${role.id}-${index}`}
                        >
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Recent User Activity
                </CardTitle>
                <CardDescription>Monitor user access and session activity</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentUsers.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.email}</p>
                            <p className="text-sm text-gray-500">{user.vendor}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{user.lastActive}</TableCell>
                        <TableCell>
                          <Switch 
                            checked={user.status === 'active'}
                            data-testid={`switch-user-status-${user.id}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}