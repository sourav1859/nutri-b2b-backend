import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Filter, Download, Upload, Heart } from "lucide-react";

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: customers, isLoading } = useQuery({
    queryKey: ['/api/v1/customers', searchQuery],
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <TopBar 
          title="Customer Management" 
          subtitle="Manage customer profiles and health data"
        />
        
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Customers</h2>
              <p className="text-sm text-gray-600">
                {customers?.data?.length || 0} customer profiles
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" data-testid="button-export-customers">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button data-testid="button-import-customers">
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Search Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search customers by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-customers"
                  />
                </div>
                <Button variant="outline" data-testid="button-advanced-filters">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customers?.data?.map((customer: any) => (
                <Card key={customer.id} className="hover:shadow-md transition-shadow" data-testid={`card-customer-${customer.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg" data-testid={`text-customer-name-${customer.id}`}>
                          {customer.full_name}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1" data-testid={`text-email-${customer.id}`}>
                          {customer.email}
                        </p>
                      </div>
                      {customer.health_profile && (
                        <Badge variant="outline" className="text-xs">
                          <Heart className="w-3 h-3 mr-1" />
                          Health Profile
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {customer.age && (
                          <div data-testid={`text-age-${customer.id}`}>
                            <span className="text-gray-500">Age:</span> {customer.age}
                          </div>
                        )}
                        {customer.gender && (
                          <div data-testid={`text-gender-${customer.id}`}>
                            <span className="text-gray-500">Gender:</span> {customer.gender}
                          </div>
                        )}
                      </div>

                      {customer.custom_tags && customer.custom_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {customer.custom_tags.slice(0, 3).map((tag: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs" data-testid={`badge-tag-${customer.id}-${index}`}>
                              {tag}
                            </Badge>
                          ))}
                          {customer.custom_tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{customer.custom_tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="text-xs text-gray-500" data-testid={`text-created-${customer.id}`}>
                        Joined {new Date(customer.created_at).toLocaleDateString()}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" data-testid={`button-view-${customer.id}`}>
                          View Profile
                        </Button>
                        <Button size="sm" variant="outline" data-testid={`button-health-${customer.id}`}>
                          Health Data
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && (!customers?.data || customers.data.length === 0) && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? "Try adjusting your search criteria." : "Start by importing your customer database."}
              </p>
              <Button data-testid="button-import-first-customers">
                <Upload className="w-4 h-4 mr-2" />
                Import Customer Data
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
