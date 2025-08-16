import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
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
import { LoaderCircle, ArrowLeft, MapPin, Phone, Mail, Calendar, Users, Trophy } from "lucide-react";
import { get } from "@/services/apiService";

const CompetitionClubDetails = () => {
  const { competitionId, clubId } = useParams<{ competitionId: string; clubId: string }>();
  const navigate = useNavigate();

  // Fetch competition details
  const {
    data: competition,
    isLoading: isLoadingCompetition,
  } = useQuery({
    queryKey: ["competition", competitionId],
    queryFn: () => get(`/competitions/${competitionId}`),
    enabled: !!competitionId,
  });

  // Fetch club details
  const {
    data: club,
    isLoading: isLoadingClub,
  } = useQuery({
    queryKey: ["club", clubId],
    queryFn: () => get(`/clubs/${clubId}`),
    enabled: !!clubId,
  });

  // Fetch registered players for this club in this competition
  const {
    data: registeredPlayers,
    isLoading: isLoadingPlayers,
    isError,
    error,
  } = useQuery({
    queryKey: ["competition-club-players", competitionId, clubId],
    queryFn: () => get(`/competitions/${competitionId}/clubs/${clubId}/players`),
    enabled: !!competitionId && !!clubId,
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

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Handle error
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Details</h2>
        <p>{(error as any)?.message || "Failed to load club competition details"}</p>
        <Button className="mt-4" onClick={() => navigate(`/competitions/${competitionId}`)}>
          Back to Competition
        </Button>
      </div>
    );
  }

  if (isLoadingCompetition || isLoadingClub || isLoadingPlayers) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <LoaderCircle className="h-8 w-8 animate-spin mb-4" />
        <p>Loading club competition details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/competitions/${competitionId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Competition
        </Button>
      </div>

      {/* Competition & Club Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            {club?.clubName} - {competition?.competitionName}
          </CardTitle>
          <CardDescription>Club participation details for this competition</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Competition Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Competition Information
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Competition:</span>
                  <span>{competition?.competitionName}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Period:</span>
                  <span>{formatDate(competition?.fromDate)} to {formatDate(competition?.toDate)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium">Age Category:</span>
                  <Badge variant="secondary">{competition?.age}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Max Players:</span>
                  <span>{competition?.maxPlayers}</span>
                </div>
              </div>
            </div>

            {/* Club Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Club Information
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Club Name:</span>
                  <span>{club?.clubName}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="font-medium">Affiliation Number:</span>
                  <Badge variant="outline">{club?.affiliationNumber}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Location:</span>
                  <span>{club?.city}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Contact:</span>
                  <span>{club?.mobile}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span>{club?.email}</span>
                </div>

                {club?.region && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Region:</span>
                    <span>{club.region.regionName}</span>
                    {club.region.taluka && (
                      <span className="text-muted-foreground">({club.region.taluka.talukaName})</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registered Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registered Players ({registeredPlayers?.registrations?.length || 0})
          </CardTitle>
          <CardDescription>
            Players from {club?.clubName} registered for {competition?.competitionName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!registeredPlayers?.registrations || registeredPlayers.registrations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No players registered for this competition yet.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Player Name</TableHead>
                    <TableHead>Unique ID</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Aadhar Verified</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registeredPlayers.registrations.map((registration: any) => (
                    <TableRow key={registration.id}>
                      <TableCell className="font-medium">
                        {registration.player.name}
                      </TableCell>
                      <TableCell>{registration.player.uniqueIdNumber}</TableCell>
                      <TableCell>{registration.player.position || 'N/A'}</TableCell>
                      <TableCell>{registration.player.age} years</TableCell>
                      <TableCell>{registration.player.mobile || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={registration.player.aadharVerified ? 'default' : 'secondary'}>
                          {registration.player.aadharVerified ? 'Verified' : 'Not Verified'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(registration.registrationDate)}</TableCell>
                      <TableCell>
                        <Badge variant={registration.status === 'registered' ? 'default' : 'secondary'}>
                          {registration.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {registeredPlayers?.registrations && registeredPlayers.registrations.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Players:</span> {registeredPlayers.registrations.length}
                </div>
                <div>
                  <span className="font-medium">Max Allowed:</span> {competition?.maxPlayers}
                </div>
                <div>
                  <span className="font-medium">Remaining Slots:</span> {(competition?.maxPlayers || 0) - registeredPlayers.registrations.length}
                </div>
                <div>
                  <span className="font-medium text-green-600">Verified:</span> {registeredPlayers.registrations.filter((reg: any) => reg.player.aadharVerified).length}
                </div>
                <div>
                  <span className="font-medium text-orange-600">Not Verified:</span> {registeredPlayers.registrations.filter((reg: any) => !reg.player.aadharVerified).length}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompetitionClubDetails;