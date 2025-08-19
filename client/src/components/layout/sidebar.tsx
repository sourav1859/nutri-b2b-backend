import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Building, 
  Package, 
  Users, 
  Upload, 
  Webhook, 
  Search, 
  Zap, 
  Shield, 
  Settings, 
  Database,
  PanelRightDashed
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    current: true
  }
];

const mainNavigation = [
  {
    name: "Vendors",
    href: "/vendors",
    icon: Building,
    badge: "47"
  },
  {
    name: "Products", 
    href: "/products",
    icon: Package,
    badge: "2.3M"
  },
  {
    name: "Customers",
    href: "/customers", 
    icon: Users,
    badge: "890K"
  }
];

const pipelineNavigation = [
  {
    name: "Ingestion Jobs",
    href: "/ingestion",
    icon: Upload,
    badge: "3",
    badgeColor: "bg-orange-100 text-orange-600"
  },
  {
    name: "API Connectors",
    href: "/connectors",
    icon: Webhook
  },
  {
    name: "Webhooks",
    href: "/webhooks",
    icon: Webhook
  }
];

const analyticsNavigation = [
  {
    name: "Search Performance", 
    href: "/analytics",
    icon: Search
  },
  {
    name: "Matching Engine",
    href: "/matching",
    icon: Zap
  },
  {
    name: "Audit Logs",
    href: "/audit",
    icon: Shield,
    badge: "HIPAA",
    badgeColor: "bg-red-100 text-red-600"
  }
];

const systemNavigation = [
  {
    name: "RBAC Management",
    href: "/rbac",
    icon: PanelRightDashed
  },
  {
    name: "Database Health",
    href: "/database",
    icon: Database
  },
  {
    name: "Configuration",
    href: "/settings",
    icon: Settings
  }
];

export function Sidebar() {
  const [location] = useLocation();

  const NavSection = ({ 
    title, 
    items, 
    className = "" 
  }: { 
    title?: string; 
    items: typeof navigation; 
    className?: string;
  }) => (
    <div className={className}>
      {title && (
        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {title}
        </h3>
      )}
      <div className="space-y-1">
        {items.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon 
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-blue-500" : "text-gray-400"
                )} 
              />
              {item.name}
              {item.badge && (
                <span 
                  className={cn(
                    "ml-auto text-xs px-2 py-1 rounded-full",
                    item.badgeColor || "bg-gray-200 text-gray-600"
                  )}
                  data-testid={`badge-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="w-64 bg-white shadow-md flex-shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
            <Zap className="text-white text-sm w-4 h-4" />
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-medium text-gray-900" data-testid="text-app-name">
              Odyssey B2B
            </h1>
            <p className="text-sm text-gray-500" data-testid="text-app-subtitle">
              Nutrition Platform
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="mt-6 px-3 space-y-8">
        <NavSection items={navigation} />
        <NavSection items={mainNavigation} />
        <NavSection title="Data Pipeline" items={pipelineNavigation} />
        <NavSection title="Analytics" items={analyticsNavigation} />
        <NavSection title="System" items={systemNavigation} />
      </nav>
    </aside>
  );
}
