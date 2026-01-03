import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Appraisal {
  id: number;
  appraiser_name: string;
  appraiser_id: string;
  total_items: number;
  purity: string;
  created_at: string;
  status: string;
  jewellery_items?: JewelleryItem[];
  purity_results?: any[];
  rbi_compliance?: any;
  source?: string;
}

interface JewelleryItem {
  id: number;
  item_number: number;
  image_url: string;
  description: string;
}

const Records = () => {
  const navigate = useNavigate();
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppraisal, setSelectedAppraisal] = useState<Appraisal | null>(null);
  const [jewelleryItems, setJewelleryItems] = useState<JewelleryItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchAppraisals();
  }, []);

  const fetchAppraisals = async () => {
    try {
      // First try to get from localStorage
      const localAppraisals = [];
      
      // Check for completed appraisals in localStorage
      const appraiserData = localStorage.getItem('currentAppraiser');
      const jewelleryItems = localStorage.getItem('jewelleryItems');
      const purityResults = localStorage.getItem('purityResults');
      const rbiCompliance = localStorage.getItem('rbiCompliance');
      
      // Check for stored appraisal records
      const storedRecords = localStorage.getItem('appraisalRecords');
      if (storedRecords) {
        const records = JSON.parse(storedRecords);
        localAppraisals.push(...records);
      }
      
      // If we have current session data, create a record from it
      if (appraiserData && jewelleryItems && purityResults) {
        const appraiser = JSON.parse(appraiserData);
        const items = JSON.parse(jewelleryItems);
        const purity = JSON.parse(purityResults);
        
        const sessionRecord = {
          id: Date.now(),
          appraiser_name: appraiser.name || 'Unknown',
          appraiser_id: appraiser.id || 'N/A',
          total_items: items.length,
          purity: purity.map((p: any) => `${p.purity} (${p.method})`).join(', '),
          created_at: new Date().toISOString(),
          status: 'completed',
          jewellery_items: items,
          purity_results: purity,
          rbi_compliance: rbiCompliance ? JSON.parse(rbiCompliance) : null
        };
        
        // Check if this session record already exists
        const existingRecord = localAppraisals.find(record => 
          record.appraiser_name === sessionRecord.appraiser_name && 
          record.total_items === sessionRecord.total_items &&
          Math.abs(new Date(record.created_at).getTime() - new Date(sessionRecord.created_at).getTime()) < 60000 // within 1 minute
        );
        
        if (!existingRecord) {
          localAppraisals.unshift(sessionRecord); // Add to beginning
        }
      }
      
      // Try API call as fallback
      try {
        const response = await apiService.getAllAppraisals();
        if (response.appraisals && response.appraisals.length > 0) {
          // Merge API data with local data
          const apiRecords = response.appraisals.map((record: any) => ({
            ...record,
            source: 'api'
          }));
          localAppraisals.push(...apiRecords);
        }
      } catch (apiError) {
        console.log('API not available, using local data only');
      }
      
      setAppraisals(localAppraisals);
      
      if (localAppraisals.length === 0) {
        toast({
          title: "No Records",
          description: "No appraisal records found. Complete an appraisal to see records here.",
        });
      }
    } catch (error: any) {
      console.error('Error fetching records:', error);
      toast({
        title: "Error",
        description: "Failed to fetch records",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const viewAppraisal = async (appraisal: Appraisal) => {
    setSelectedAppraisal(appraisal);
    setIsDialogOpen(true);
    
    // If this record has local data, use it
    if (appraisal.jewellery_items) {
      setJewelleryItems(appraisal.jewellery_items);
    } else {
      setJewelleryItems([]);
      toast({
        title: "Limited Details",
        description: "Detailed item view not available for this record",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-primary">Appraisal Records</h1>
            <p className="text-sm text-muted-foreground">View all appraisal history</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>All Appraisals</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : appraisals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No appraisal records found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Appraiser</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Results</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appraisals.map((appraisal) => (
                    <TableRow key={appraisal.id}>
                      <TableCell>
                        {new Date(appraisal.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{appraisal.appraiser_name}</TableCell>
                      <TableCell>{appraisal.total_items}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {appraisal.purity || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewAppraisal(appraisal)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* View Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Appraisal Details</DialogTitle>
          </DialogHeader>
          
          {selectedAppraisal && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Appraiser Information</h3>
                  <p className="text-sm"><span className="font-medium">Name:</span> {selectedAppraisal.appraiser_name}</p>
                  <p className="text-sm"><span className="font-medium">ID:</span> {selectedAppraisal.appraiser_id}</p>
                  <p className="text-sm"><span className="font-medium">Date:</span> {new Date(selectedAppraisal.created_at).toLocaleString()}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Appraisal Information</h3>
                  <p className="text-sm"><span className="font-medium">Total Items:</span> {selectedAppraisal.total_items}</p>
                  <p className="text-sm"><span className="font-medium">Purity:</span> {selectedAppraisal.purity || "N/A"}</p>
                  <p className="text-sm"><span className="font-medium">Status:</span> {selectedAppraisal.status}</p>
                </div>
              </div>


              <div>
                <h3 className="font-semibold mb-2">Jewellery Items</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {jewelleryItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Item {item.item_number}</p>
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={`Item ${item.item_number}`}
                          className="w-full rounded-lg border"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Records;
