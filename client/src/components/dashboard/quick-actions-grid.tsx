import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FolderSync, Heart } from "lucide-react";

export function QuickActionsGrid() {
  const actions = [
    {
      title: "Start CSV Import",
      description: "Upload and process product or customer data",
      icon: Upload,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      buttonText: "Upload CSV File",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
      testId: "start-csv-import"
    },
    {
      title: "API FolderSync",
      description: "FolderSync data from external vendor APIs",
      icon: FolderSync,
      iconBg: "bg-purple-100", 
      iconColor: "text-purple-600",
      buttonText: "Configure FolderSync",
      buttonColor: "bg-purple-600 hover:bg-purple-700",
      testId: "configure-api-sync"
    },
    {
      title: "Health Analytics",
      description: "Review matching performance and health insights",
      icon: Heart,
      iconBg: "bg-green-100",
      iconColor: "text-green-600", 
      buttonText: "View Analytics",
      buttonColor: "bg-green-600 hover:bg-green-700",
      testId: "view-health-analytics"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {actions.map((action) => (
        <Card key={action.testId} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className={`p-3 ${action.iconBg} rounded-lg`}>
                <action.icon className={`w-6 h-6 ${action.iconColor}`} />
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900" data-testid={`text-${action.testId}-title`}>
                  {action.title}
                </h4>
                <p className="text-sm text-gray-500" data-testid={`text-${action.testId}-description`}>
                  {action.description}
                </p>
              </div>
            </div>
            <Button 
              className={`w-full text-white ${action.buttonColor} transition-colors`}
              data-testid={`button-${action.testId}`}
            >
              {action.buttonText}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
