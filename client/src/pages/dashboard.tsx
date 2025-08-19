import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { ActiveJobsCard } from "@/components/dashboard/active-jobs-card";
import { DatabaseHealthCard } from "@/components/dashboard/database-health-card";
import { AuditLogTable } from "@/components/dashboard/audit-log-table";
import { QuickActionsGrid } from "@/components/dashboard/quick-actions-grid";

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <TopBar 
          title="Dashboard Overview" 
          subtitle="Monitor your B2B nutrition platform performance"
        />
        
        <div className="p-6 space-y-8">
          <MetricsGrid />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActiveJobsCard />
            <DatabaseHealthCard />
          </div>
          
          <AuditLogTable />
          
          <QuickActionsGrid />
        </div>
      </main>
    </div>
  );
}
