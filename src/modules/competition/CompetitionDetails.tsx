import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoaderCircle, ArrowLeft, Calendar, Users, Trophy, MapPin, Download, Info } from "lucide-react";
import { get } from "@/services/apiService";

const CompetitionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Determine user role for role-based navigation/UI
  let userRole: string = 'admin';
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      userRole = JSON.parse(storedUser)?.role || 'admin';
    }
  } catch {}
  const isAdmin = userRole === 'admin';
  const isClubAdmin = userRole === 'clubadmin';
  const isObserver = userRole === 'observer';
  const isReferee = userRole === 'referee';

  // Fetch competition details
  const {
    data: competition,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["competition", id],
    queryFn: () => get(`/competitions/${id}`),
    enabled: !!id,
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  // Handle view club competition details
  const handleViewClubDetails = (clubId: number) => {
    navigate(
      isObserver
        ? `/observercompetitions/${id}/clubs/${clubId}`
        : isReferee
        ? `/refereecompetitions/${id}/clubs/${clubId}`
        : `/competitions/${id}/clubs/${clubId}`
    );
  };

  // Handle PDF download for club details and players
  const handleDownloadClubPDF = async (clubId: number, clubName: string) => {
    try {
      console.log('Starting PDF download for club:', clubId, clubName);
      
      // Get the auth token from localStorage
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.error('No authentication token found');
        toast.error('Authentication required. Please log in again.');
        return;
      }

      console.log('Making request to:', `/api/competitions/${id}/clubs/${clubId}/pdf`);
      
      // Show loading toast
      toast.loading('Generating PDF...', { id: 'pdf-download' });

      // Make authenticated fetch request
      const response = await fetch(`/api/competitions/${id}/clubs/${clubId}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      // Get the PDF blob
      const blob = await response.blob();
      console.log('Blob size:', blob.size, 'Type:', blob.type);
      
      if (blob.size === 0) {
        throw new Error('Received empty PDF file');
      }
      
      // Create blob URL and open in new tab
      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow) {
        // Fallback: if popup blocked, show message and provide download option
        toast.error('Popup blocked. Please allow popups or download the PDF instead.', { id: 'pdf-download' });
        
        // Provide download as fallback
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${clubName}_${competition?.competitionName}_Details.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        // Success toast
        toast.success('PDF opened in new tab!', { id: 'pdf-download' });
        console.log('PDF opened in new tab successfully');
        
        // Clean up the blob URL after a delay to ensure the PDF loads
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
      }
      
    } catch (err: unknown) {
      console.error('Error downloading PDF:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      toast.error(`Failed to download PDF: ${message}`, { id: 'pdf-download' });
    }
  };

  // Handle error
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Competition</h2>
        <p>{(error as any)?.message || "Failed to load competition details"}</p>
        <Button className="mt-4" onClick={() => navigate(isObserver ? "/observercompetitions" : "/competitions")}>
          Back to Competitions
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <LoaderCircle className="h-8 w-8 animate-spin mb-4" />
        <p>Loading competition details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(isObserver ? "/observercompetitions" : isReferee ? "/refereecompetitions" : "/competitions")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Competitions
        </Button>
      </div>

      {/* Competition Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            {competition?.competitionName}
          </CardTitle>
          <CardDescription>Competition Details and Information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Competition Dates */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Competition Period</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>From: {formatDate(competition?.fromDate)}</p>
                  <p>To: {formatDate(competition?.toDate)}</p>
                </div>
              </div>

              {/* Last Entry Date */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Last Entry Date</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(competition?.lastEntryDate)}
                </div>
              </div>

              {/* Max Players */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Max Players</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {competition?.maxPlayers} players
                </div>
              </div>

              {/* Age Category */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{competition?.age}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">Age Category</div>
              </div>
            </div>

            {/* Participating Groups */}
            {competition?.groups && competition.groups.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Participating Groups</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {competition.groups.map((group: any) => (
                    <div key={group.id} className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-2">{group.groupName}</h4>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">{group.gender}</Badge>
                        <Badge variant="outline" className="text-xs">{group.age}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Competition Rules */}
      {competition?.rules && (
        <Card>
          <CardHeader>
            <CardTitle>Competition Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: competition.rules }}
            />
          </CardContent>
        </Card>
      )}

      {/* Participating Clubs */}
      {competition?.clubs && competition.clubs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Participating Clubs ({competition.clubs.length})
            </CardTitle>
            <CardDescription>
              Clubs registered for this competition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Club Name</TableHead>
                    <TableHead>Affiliation Number</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Players</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competition.clubs.map((club: any) => (
                    <TableRow key={club.id}>
                      <TableCell className="font-medium">{club.clubName}</TableCell>
                      <TableCell>{club.affiliationNumber}</TableCell>
                      <TableCell>{club.city}</TableCell>
                      <TableCell>{club.region?.regionName || 'N/A'}</TableCell>
                      <TableCell>{club.mobile}</TableCell>
                      <TableCell>
                        <Badge variant="default">Participating</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {club.registeredPlayersCount || 0}/{competition?.maxPlayers}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewClubDetails(club.id)}
                            title="View Club Details"
                          >
                            <Info className="h-4 w-4" />
                            <span className="sr-only">View Details</span>
                          </Button>
                          
                          {(isAdmin || isClubAdmin) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadClubPDF(club.id, club.clubName)}
                              title="Download Club Details PDF"
                            >
                              <Download className="h-4 w-4" />
                              <span className="sr-only">Download PDF</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Clubs Message */}
      {competition?.clubs && competition.clubs.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Participating Clubs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No clubs have registered for this competition yet.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competition Statistics */}
      {competition?.registrations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registration Statistics
            </CardTitle>
            <CardDescription>
              Overview of registrations for this competition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {competition.registrations.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Registrations</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {competition.clubs?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Participating Clubs</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {competition.maxPlayers}
                </div>
                <div className="text-sm text-muted-foreground">Max Players Allowed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CompetitionDetails;