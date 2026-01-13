import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoaderCircle, ArrowLeft, Calendar, Users, UserPlus, Plus, X, CheckCircle2 } from "lucide-react";
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

  // Effect to populate selected players with already registered players when dialog opens
  useEffect(() => {
    if (showAddPlayers && registeredPlayers?.registrations && eligiblePlayers?.players) {
      // Extract player IDs from registered players that are also in eligible players
      const registeredPlayerIds = registeredPlayers.registrations
        .map((registration: any) => registration.player.id)
        .filter((playerId: number) =>
          eligiblePlayers.players.some((eligiblePlayer: any) => eligiblePlayer.id === playerId)
        );

      setSelectedPlayers(registeredPlayerIds);
    }
  }, [showAddPlayers, registeredPlayers, eligiblePlayers]);

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
  const calculateAge = (dateOfBirth: string, refDate: Date = new Date()) => {
    const birthDate = new Date(dateOfBirth);
    let age = refDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = refDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const parseEndOfDay = (dateString?: string) => {
    if (!dateString) return null;
    const s = String(dateString).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const d = new Date(`${s}T23:59:59`);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const competitionEnd = parseEndOfDay(competition?.toDate);
  const isCompetitionOver = competitionEnd ? new Date() > competitionEnd : false;

  const handleDownloadMeritCertificate = async (playerId: number, playerName?: string) => {
    try {
      const resp: any = await get(
        `/competitions/${id}/players/${playerId}/merit-certificate`,
        undefined,
        { responseType: "blob" }
      );

      const blob = resp?.data;
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60_000);
    } catch (error: any) {
      toast.error(error?.errors?.message || error?.message || "Failed to download merit certificate");
    }
  };

  const getPlayerAge = (player: any, refDate: Date = new Date()) => {
    if (!player) return null;
    if (player.dateOfBirth) return calculateAge(player.dateOfBirth, refDate);
    if (typeof player.age === "number") return player.age;
    return null;
  };

  const ageReferenceDate = new Date();
  const isSeniorCompetition = competition?.ageEligibilityDate
    ? calculateAge(competition.ageEligibilityDate, new Date()) > 30
    : false;

  const hasMenOrWomenGroupSelected = Array.isArray(competition?.groups)
    ? competition.groups.some((g: any) => {
      const name = String(g?.groupName || "").trim().toLowerCase();
      return name === "men" || name === "women";
    })
    : false;

  const allowU18Extras = isSeniorCompetition && hasMenOrWomenGroupSelected;

  // Check if player is eligible based on age
  const isPlayerEligible = (player: any) => {
    if (!player?.dateOfBirth) return true;

    // Primary eligibility: competition ageEligibilityDate acts as a DOB cutoff.
    // Players born on or after this date are eligible.
    if (competition?.ageEligibilityDate) {
      const cutoff = new Date(`${competition.ageEligibilityDate}T00:00:00`);
      const dobStr = String(player.dateOfBirth);
      const dob = /^\d{4}-\d{2}-\d{2}$/.test(dobStr) ? new Date(`${dobStr}T00:00:00`) : new Date(dobStr);
      if (!Number.isNaN(cutoff.getTime()) && !Number.isNaN(dob.getTime())) {
        if (dob < cutoff) return false;
      }
    } else if (competition?.age) {
      // Legacy fallback: parse age label/range and compare using current age.
      const playerAge = calculateAge(player.dateOfBirth, ageReferenceDate);
      const ageRange = competition.age.toLowerCase();

      // Parse age range (e.g., "16-18", "Under 21", "Above 18", "21", "U21", "U-21")
      if (ageRange.includes("-") && !ageRange.includes("u-")) {
        // Range format like "16-18"
        const [minAge, maxAge] = ageRange.split("-").map(Number);
        if (!(playerAge >= minAge && playerAge <= maxAge)) return false;
      } else if (ageRange.includes("under") || ageRange.startsWith("u")) {
        // Under format like "Under 21", "U21", "U-21"
        const maxAge = parseInt(ageRange.match(/\d+/)?.[0] || "0");
        if (!(playerAge <= maxAge)) return false;
      } else if (ageRange.includes("above") || ageRange.includes("over")) {
        // Above format like "Above 18", "Over 18"
        const minAge = parseInt(ageRange.match(/\d+/)?.[0] || "0");
        if (!(playerAge >= minAge)) return false;
      } else if (/^\d+$/.test(ageRange)) {
        // Single number format like "21" (treat as "equal to or under")
        const maxAge = parseInt(ageRange);
        if (!(playerAge <= maxAge)) return false;
      }
    }

    // Senior competition U18 rule (based on current age)
    const playerAge = calculateAge(player.dateOfBirth, ageReferenceDate);
    if (isSeniorCompetition && playerAge <= 18 && !allowU18Extras) return false;

    return true;
  };

  // Handle player selection with animation support
  const selectedPlayersData = eligiblePlayers?.players?.filter((p: any) => selectedPlayers.includes(p.id)) || [];
  const selectedU18Count = selectedPlayersData.filter((p: any) => calculateAge(p.dateOfBirth, ageReferenceDate) <= 18).length;
  const existingU18Count = registeredPlayers?.registrations?.filter((reg: any) => {
    const age = getPlayerAge(reg.player, ageReferenceDate);
    return typeof age === "number" && age <= 18;
  }).length || 0;
  const remainingU18Slots = allowU18Extras
    ? Math.max(0, 3 - existingU18Count - selectedU18Count)
    : 0;

  const handlePlayerSelect = (player: any, checked: boolean) => {
    const playerAge = calculateAge(player.dateOfBirth, ageReferenceDate);
    const isU18 = playerAge <= 18;

    if (checked) {
      if (selectedPlayers.includes(player.id)) return;
      if (selectedPlayers.length >= (competition?.maxPlayers || 0)) {
        toast.error(`Maximum ${competition?.maxPlayers} players allowed`);
        return;
      }
      if (isSeniorCompetition) {
        if (!allowU18Extras && isU18) {
          toast.error("U18 (age 18 or below) players are not allowed for this competition");
          return;
        }
        if (allowU18Extras && isU18) {
          const totalU18 = existingU18Count + selectedU18Count + 1;
          if (totalU18 > 3) {
            const remaining = Math.max(0, 3 - existingU18Count - selectedU18Count);
            toast.error(remaining === 0
              ? "Maximum 3 U18 (age 18 or below) players already selected/registered"
              : `Only ${remaining} U18 (age 18 or below) slot(s) remaining`);
            return;
          }
        }
      }

      setSelectedPlayers(prev => [...prev, player.id]);
    } else {
      setSelectedPlayers(prev => prev.filter(id => id !== player.id));
    }
  };

  // Handle add players
  const handleAddPlayers = () => {
    if (selectedPlayers.length === 0) {
      toast.error("Please select at least one player");
      return;
    }

    // Filter out already registered players to only add new ones
    const registeredPlayerIds = registeredPlayers?.registrations?.map((reg: any) => reg.player.id) || [];
    const newPlayersToAdd = selectedPlayers.filter(playerId => !registeredPlayerIds.includes(playerId));

    if (newPlayersToAdd.length === 0) {
      toast.info("All selected players are already registered for this competition");
      return;
    }

    addPlayersMutation.mutate(newPlayersToAdd);
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
                              const playerAge = calculateAge(player.dateOfBirth, ageReferenceDate);
                              const u18Constraint = !(isSeniorCompetition && playerAge <= 18 && (
                                (!allowU18Extras) || (allowU18Extras && remainingU18Slots <= 0)
                              ));
                              const canSelect = eligible && selectedPlayers.length < (competition?.maxPlayers || 0) && u18Constraint;

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
                                      handlePlayerSelect(player, true);
                                    } else if (eligible && selectedPlayers.length >= (competition?.maxPlayers || 0)) {
                                      toast.error(`Maximum ${competition?.maxPlayers} players allowed`);
                                    } else if (eligible && isSeniorCompetition && playerAge <= 18 && allowU18Extras && remainingU18Slots <= 0) {
                                      toast.error("U18 (age 18 or below) slots are full (max 3)");
                                    } else if (eligible && isSeniorCompetition && playerAge <= 18 && !allowU18Extras) {
                                      toast.error("U18 (age 18 or below) players are not allowed for this competition");
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

                              const playerAge = calculateAge(player.dateOfBirth, ageReferenceDate);
                              const isAlreadyRegistered = registeredPlayers?.registrations?.some((reg: any) => reg.player.id === playerId) || false;

                              return (
                                <motion.div
                                  key={`selected-${player.id}`}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -20, scale: 0.9 }}
                                  layout
                                  transition={{ duration: 0.3, ease: "easeInOut" }}
                                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm ${isAlreadyRegistered
                                    ? 'bg-green-50 border-green-200 hover:bg-green-100'
                                    : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                                    }`}
                                  onClick={() => handlePlayerSelect(player, false)}
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
                                      {isAlreadyRegistered && (
                                        <Badge variant="secondary" className="text-xs flex-shrink-0 bg-green-100 text-green-800">
                                          Already Registered
                                        </Badge>
                                      )}
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
                ) : (() => {
                  const registeredPlayerIds = registeredPlayers?.registrations?.map((reg: any) => reg.player.id) || [];
                  const newPlayersCount = selectedPlayers.filter(playerId => !registeredPlayerIds.includes(playerId)).length;
                  const alreadyRegisteredCount = selectedPlayers.length - newPlayersCount;

                  if (newPlayersCount === 0) {
                    return "All Selected Players Already Registered";
                  }

                  return `Add ${newPlayersCount} New Player${newPlayersCount !== 1 ? 's' : ''}${alreadyRegisteredCount > 0 ? ` (${alreadyRegisteredCount} already registered)` : ''}`;
                })()}
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

              {/* Weight */}
              {competition?.weight && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Weight</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{competition.weight}</div>
                </div>
              )}
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
                      <TableCell>
                        {(() => {
                          const age = getPlayerAge(registration.player);
                          return typeof age === "number" ? `${age} years` : "";
                        })()}
                      </TableCell>
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
                        {isCompetitionOver ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadMeritCertificate(registration.player.id, registration.player.name)}
                          >
                            Download Merit Certificate
                          </Button>
                        ) : (
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
                        )}
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