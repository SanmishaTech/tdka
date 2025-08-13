import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoaderCircle, ArrowLeft, Calendar, Users, MapPin, UserPlus, Plus, X, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { get, post, del } from "@/services/apiService";

const ClubCompetitionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);

  // Fetch competition details
  const {
    data: competition,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["clubcompetition", id],
    queryFn: () => get(`/competitions/${id}`),
    enabled: !!id,
  });

  // Fetch eligible players from club
  const {
    data: eligiblePlayers,
    isLoading: isLoadingPlayers,
  } = useQuery({
    queryKey: ["eligibleplayers", id],
    queryFn: () => get(`/competitions/${id}/eligible-players`),
    enabled: !!id && showAddPlayers,
  });

  // Fetch registered players for this competition
  const {
    data: registeredPlayers,
    isLoading: isLoadingRegistered,
  } = useQuery({
    queryKey: ["registeredplayers", id],
    queryFn: () => get(`/competitions/${id}/registered-players`),
    enabled: !!id,
  });

  // #clubyers to competition mutation
  const addPlayersMutation = useMutation({
    mutationFn: (playerIds: number[]) =>
      post(`/competitions/${id}/add-players`, { playerIds }),
    onSuccess: () => {
      toast.success("Players added to competition successfully");
      setShowAddPlayers(false);
      setSelectedPlayers([]);
      queryClient.invalidateQueries({ queryKey: ["clubcompetition", id] });
      queryClient.invalidateQueries({ queryKey: ["registeredplayers", id] });
    },
    onError: (error: any) => {
      toast.error(error.errors?.message || error.message || "Failed to add players");
    },
  });

  // Remove player from competition mutation
  const removePlayerMutation = useMutation({
    mutationFn: (playerId: number) =>
      del(`/competitions/${id}/players/${playerId}`),
    onSuccess: () => {
      toast.success("Player removed from competition successfully");
      queryClient.invalidateQueries({ queryKey: ["registeredplayers", id] });
    },
    onError: (error: any) => {
      toast.error(error.errors?.message || error.message || "Failed to remove player");
    },
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
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Check if player is eligible based on age
  const isPlayerEligible = (player: any) => {
    if (!competition?.age || !player.dateOfBirth) return true;

    const playerAge = calculateAge(player.dateOfBirth);
    const ageRange = competition.age;

    // Parse age range (e.g., "16-18", "Under 21", "Above 18")
    if (ageRange.includes("-")) {
      const [minAge, maxAge] = ageRange.split("-").map(Number);
      return playerAge >= minAge && playerAge <= maxAge;
    } else if (ageRange.toLowerCase().includes("under")) {
      const maxAge = parseInt(ageRange.match(/\d+/)?.[0] || "0");
      return playerAge < maxAge;
    } else if (ageRange.toLowerCase().includes("above")) {
      const minAge = parseInt(ageRange.match(/\d+/)?.[0] || "0");
      return playerAge > minAge;
    }

    return true;
  };

  // Handle player selection with animation support
  const handlePlayerSelect = (playerId: number, checked: boolean) => {
    if (checked) {
      if (selectedPlayers.length < (competition?.maxPlayers || 0)) {
        setSelectedPlayers(prev => [...prev, playerId]);
      } else {
        toast.error(`Maximum ${competition?.maxPlayers} players allowed`);
      }
    } else {
      setSelectedPlayers(prev => prev.filter(id => id !== playerId));
    }
  };

  // Handle add players
  const handleAddPlayers = () => {
    if (selectedPlayers.length === 0) {
      toast.error("Please select at least one player");
      return;
    }
    addPlayersMutation.mutate(selectedPlayers);
  };

  // Handle error
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Competition</h2>
        <p>{(error as any)?.message || "Failed to load competition details"}</p>
        <Button className="mt-4" onClick={() => navigate("/clubcompetitions")}>
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
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/clubcompetitions")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Competitions
        </Button>

        <Dialog open={showAddPlayers} onOpenChange={setShowAddPlayers}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Players
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Players to Competition</DialogTitle>
              <DialogDescription>
                Select players from your club to participate in "{competition?.competitionName}".
                Maximum {competition?.maxPlayers} players allowed.
                {competition?.age && ` Age requirement: ${competition.age}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {isLoadingPlayers ? (
                <div className="flex justify-center py-8">
                  <LoaderCircle className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading eligible players...</span>
                </div>
              ) : eligiblePlayers?.players?.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No eligible players found in your club.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground text-center">
                    Selected: {selectedPlayers.length} / {competition?.maxPlayers || 0} players
                  </div>

                  <div className="grid grid-cols-2 gap-6 h-96">
                    {/* Available Players Column */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground border-b pb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Available Players ({eligiblePlayers?.players?.filter((p: any) => !selectedPlayers.includes(p.id)).length})
                      </h4>
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                        <AnimatePresence mode="popLayout">
                          {eligiblePlayers?.players
                            ?.filter((player: any) => !selectedPlayers.includes(player.id))
                            ?.map((player: any) => {
                              const eligible = isPlayerEligible(player);
                              const playerAge = calculateAge(player.dateOfBirth);
                              const canSelect = eligible && selectedPlayers.length < (competition?.maxPlayers || 0);

                              return (
                                <motion.div
                                  key={`available-${player.id}`}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20, scale: 0.9 }}
                                  layout
                                  transition={{ duration: 0.3, ease: "easeInOut" }}
                                  className={`flex items-center justify-between p-3 border rounded-lg transition-all duration-200 ${!eligible ? 'bg-muted opacity-50 cursor-not-allowed' :
                                    canSelect ? 'cursor-pointer hover:bg-muted/50 hover:shadow-sm hover:border-primary/30' :
                                      'cursor-not-allowed opacity-60'
                                    }`}
                                  onClick={() => {
                                    if (canSelect) {
                                      handlePlayerSelect(player.id, true);
                                    } else if (eligible && selectedPlayers.length >= (competition?.maxPlayers || 0)) {
                                      toast.error(`Maximum ${competition?.maxPlayers} players allowed`);
                                    }
                                  }}
                                  whileHover={canSelect ? { scale: 1.02 } : {}}
                                  whileTap={canSelect ? { scale: 0.98 } : {}}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-sm truncate">
                                        {player.firstName} {player.lastName}
                                      </span>
                                      <Badge variant="outline" className="text-xs flex-shrink-0">
                                        Age: {playerAge}
                                      </Badge>
                                      {!eligible && (
                                        <Badge variant="destructive" className="text-xs flex-shrink-0">
                                          Ineligible
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {player.uniqueIdNumber} • {player.position || 'N/A'}
                                    </div>
                                  </div>
                                  {canSelect && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="flex items-center text-muted-foreground"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </motion.div>
                                  )}
                                </motion.div>
                              );
                            })}
                        </AnimatePresence>
                        {eligiblePlayers?.players?.filter((p: any) => !selectedPlayers.includes(p.id)).length === 0 && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-8 text-muted-foreground text-sm"
                          >
                            All eligible players have been selected
                          </motion.p>
                        )}
                      </div>
                    </div>

                    {/* Selected Players Column */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground border-b pb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Selected Players ({selectedPlayers.length})
                      </h4>
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                        <AnimatePresence mode="popLayout">
                          {selectedPlayers.length === 0 ? (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-center py-8 text-muted-foreground text-sm"
                            >
                              No players selected yet
                            </motion.p>
                          ) : (
                            selectedPlayers.map((playerId) => {
                              const player = eligiblePlayers?.players?.find((p: any) => p.id === playerId);
                              if (!player) return null;

                              const playerAge = calculateAge(player.dateOfBirth);

                              return (
                                <motion.div
                                  key={`selected-${player.id}`}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -20, scale: 0.9 }}
                                  layout
                                  transition={{ duration: 0.3, ease: "easeInOut" }}
                                  className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10 transition-all duration-200 hover:shadow-sm"
                                  onClick={() => handlePlayerSelect(player.id, false)}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-sm truncate">
                                        {player.firstName} {player.lastName}
                                      </span>
                                      <Badge variant="outline" className="text-xs flex-shrink-0">
                                        Age: {playerAge}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {player.uniqueIdNumber} • {player.position || 'N/A'}
                                    </div>
                                  </div>
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center text-red-500 hover:text-red-600"
                                  >
                                    <X className="h-4 w-4" />
                                  </motion.div>
                                </motion.div>
                              );
                            })
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddPlayers(false);
                  setSelectedPlayers([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddPlayers}
                disabled={selectedPlayers.length === 0 || addPlayersMutation.isPending}
              >
                {addPlayersMutation.isPending ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                    Adding Players...
                  </>
                ) : (
                  `Add ${selectedPlayers.length} Player${selectedPlayers.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Competition Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{competition?.competitionName}</CardTitle>
          <CardDescription>Competition Details and Information</CardDescription>
        </CardHeader>
        <CardContent>
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

      {/* Participating Groups */}
      {competition?.groups && competition.groups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Participating Groups</CardTitle>
            <CardDescription>
              Groups eligible for this competition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {competition.groups.map((group: any) => (
                <div key={group.id} className="border rounded-lg p-4">
                  <h4 className="font-medium">{group.groupName}</h4>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{group.gender}</Badge>
                    <Badge variant="outline">{group.age}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participating Clubs */}
      {competition?.clubs && competition.clubs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Participating Clubs</CardTitle>
            <CardDescription>
              {competition.clubs.length} clubs are participating in this competition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Club Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competition.clubs.map((club: any) => (
                    <TableRow key={club.id}>
                      <TableCell className="font-medium">{club.clubName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {club.city}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">Participating</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registered Players from Your Club */}
      <Card>
        <CardHeader>
          <CardTitle>Your Club's Registered Players</CardTitle>
          <CardDescription>
            Players from your club registered for this competition
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRegistered ? (
            <div className="flex justify-center py-8">
              <LoaderCircle className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading registered players...</span>
            </div>
          ) : registeredPlayers?.registrations?.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No players registered yet. Click "Add Players" to register players for this competition.
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Player Name</TableHead>
                    <TableHead>Unique ID</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registeredPlayers?.registrations?.map((registration: any) => (
                    <TableRow key={registration.id}>
                      <TableCell className="font-medium">
                        {registration.player.name}
                      </TableCell>
                      <TableCell>{registration.player.uniqueIdNumber}</TableCell>
                      <TableCell>{registration.player.position || 'N/A'}</TableCell>
                      <TableCell>{registration.player.age} years</TableCell>
                      <TableCell>
                        {formatDate(registration.registrationDate)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={registration.status === 'registered' ? 'default' : 'secondary'}
                        >
                          {registration.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePlayerMutation.mutate(registration.player.id)}
                          disabled={removePlayerMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          {removePlayerMutation.isPending ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            "Remove"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {registeredPlayers?.registrations?.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Total registered: {registeredPlayers.registrations.length} / {competition?.maxPlayers} players
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClubCompetitionDetails;