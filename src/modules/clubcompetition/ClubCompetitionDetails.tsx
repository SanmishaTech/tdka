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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LoaderCircle, ArrowLeft, Calendar, Users, UserPlus, Plus, X, CheckCircle2, Crown, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { get, post, del, put } from "@/services/apiService";
import { Input } from "@/components/ui/input";

const ClubCompetitionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [managerName, setManagerName] = useState("");
  const [coachName, setCoachName] = useState("");

  // Get clubId from localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const clubId = user?.clubId;

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

  // Set captain mutation
  const setCaptainMutation = useMutation({
    mutationFn: (registrationId: number) => {
      // Get clubId from localStorage user (for clubadmin/CLUB users)
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const clubId = user?.clubId;

      if (!clubId) {
        throw new Error("Club ID not found. Please log in again.");
      }

      return put(`/competitions/${id}/clubs/${clubId}/players/${registrationId}/captain`, {});
    },
    onSuccess: () => {
      toast.success("Captain set successfully");
      queryClient.invalidateQueries({ queryKey: ["registeredplayers", id] });
    },
    onError: (error: any) => {
      toast.error(error.errors?.message || error.message || "Failed to set captain");
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

  // Fetch club info (manager and coach names)
  const {
    data: clubInfo,
    isLoading: isLoadingClubInfo,
  } = useQuery({
    queryKey: ["clubcompetition-info", id, clubId],
    queryFn: () => get(`/competitions/${id}/clubs/${clubId}/info`),
    enabled: !!id && !!clubId,
  });

  // Update club info mutation
  const updateClubInfoMutation = useMutation({
    mutationFn: (data: { managerName: string; coachName: string }) =>
      put(`/competitions/${id}/clubs/${clubId}/info`, data),
    onSuccess: () => {
      toast.success("Manager and coach information saved successfully");
      queryClient.invalidateQueries({ queryKey: ["clubcompetition-info", id, clubId] });
    },
    onError: (error: any) => {
      toast.error(error.errors?.message || error.message || "Failed to save manager and coach information");
    },
  });

  // Effect to populate manager and coach names when data is fetched
  useEffect(() => {
    if (clubInfo) {
      setManagerName(clubInfo.managerName || "");
      setCoachName(clubInfo.coachName || "");
    }
  }, [clubInfo]);
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
      const safeName = String(playerName || `player_${playerId}`).replace(/[^a-z0-9_-]+/gi, "_");
      const resp: any = await get(
        `/competitions/${id}/players/${playerId}/merit-certificate`,
        undefined,
        { responseType: "blob" }
      );

      const blob: Blob | undefined = resp?.data;
      if (!blob) {
        throw new Error('Empty PDF response');
      }
      const pdfBlob = blob.type ? blob : new Blob([blob], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `Merit_Certificate_${safeName}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
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
  // Check if player is eligible based on age or groups and return status + reason
  const getEligibilityStatus = (player: any) => {
    // If no DOB, assume eligible (or handle as error if strict)
    if (!player?.dateOfBirth) return { eligible: true, reason: "" };

    let isEligible = false;
    let reason = "Does not meet age criteria for any group";

    // Primary eligibility: Check against ALL groups
    if (competition?.groups && competition.groups.length > 0) {
      const dobStr = String(player.dateOfBirth);
      const dob = /^\d{4}-\d{2}-\d{2}$/.test(dobStr) ? new Date(`${dobStr}T00:00:00`) : new Date(dobStr);

      if (isNaN(dob.getTime())) return { eligible: false, reason: "Invalid Date of Birth" };

      // Check if eligible for AT LEAST ONE group
      const qualifyingGroups = competition.groups.filter((group: any) => {
        // First check: Does the player belong to this group?
        // group is a CompetitionGroup (has groupId)
        // player has groups array (Group objects with id)
        const playerBelongsToGroup = player.groups?.some((pg: any) => pg.id === group.groupId);
        if (!playerBelongsToGroup) return false;

        if (!group.ageEligibilityDate) return true; // Open group
        const cutoff = new Date(`${group.ageEligibilityDate}T00:00:00`);
        if (isNaN(cutoff.getTime())) return true;

        // Check based on ageType from the group
        const ageType = group.ageType || group.group?.ageType || "UNDER";
        if (ageType === "ABOVE") {
          return dob <= cutoff; // Must be born ON or BEFORE (older)
        }
        return dob >= cutoff; // UNDER: Must be born ON or AFTER (younger);
      });

      if (qualifyingGroups.length > 0) {
        isEligible = true;
        reason = "";
      } else {
        // Construct a reason
        // If they don't belong to any groups
        const matchingGroups = competition.groups.filter((g: any) => player.groups?.some((pg: any) => pg.id === g.groupId));

        if (matchingGroups.length === 0) {
          isEligible = false;
          const compGroupIds = competition.groups.map((g: any) => `${g.groupName} (${g.groupId})`).join(", ");
          reason = `Player does not belong to any of the competition groups. Required: ${compGroupIds}`;
        } else {
          isEligible = false;
          reason = "Born before eligibility date for all qualifying groups";
        }
      }

    } else if (competition?.ageEligibilityDate) {
      // Fallback for legacy single-date
      const cutoff = new Date(`${competition.ageEligibilityDate}T00:00:00`);
      const dobStr = String(player.dateOfBirth);
      const dob = /^\d{4}-\d{2}-\d{2}$/.test(dobStr) ? new Date(`${dobStr}T00:00:00`) : new Date(dobStr);

      if (!Number.isNaN(cutoff.getTime()) && !Number.isNaN(dob.getTime())) {
        if (dob < cutoff) {
          isEligible = false;
          reason = `Born before ${cutoff.toLocaleDateString()}`;
        } else {
          isEligible = true;
        }
      }
    } else if (competition?.age) {
      // Fallback or Legacy check
      // For simplicity, if groups exist, we should rely on them. 
      // If we fall through here, it might be a purely label-based legacy comp.
      if (competition.groups && competition.groups.length > 0) {
        // Should have been caught above, unless groups had no dates?
        // If we are here, assume eligible if we passed above checks or if logic fell through
        isEligible = true;
      } else {
        // Legacy parse logic (omitted for brevity, assume eligible for now to avoid false negatives)
        isEligible = true;
      }
    } else {
      isEligible = true;
    }

    // Senior competition U18 rule (based on current age)
    const playerAge = calculateAge(player.dateOfBirth, ageReferenceDate);
    if (isEligible && isSeniorCompetition && playerAge <= 18 && !allowU18Extras) {
      return { eligible: false, reason: "U18 players not allowed in Senior competition" };
    }

    return { eligible: isEligible, reason: isEligible ? "" : reason };
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
          <DialogContent className="w-[95vw] max-w-none h-[90vh] max-h-[90vh] overflow-y-auto">
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

                  <div className="grid grid-cols-2 gap-6 h-[600px]">
                    {/* Available Players Column */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground border-b pb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Available Players ({eligiblePlayers?.players?.filter((p: any) => !selectedPlayers.includes(p.id)).length})
                      </h4>
                      <div className="space-y-2 max-h-[550px] overflow-y-auto pr-2">
                        <AnimatePresence mode="popLayout">
                          {(() => {
                            const available = eligiblePlayers?.players?.filter((player: any) => !selectedPlayers.includes(player.id)) || [];

                            // Sort: Eligible first, then Ineligible, then by Name
                            const sortedPlayers = [...available].sort((a: any, b: any) => {
                              const aStatus = getEligibilityStatus(a);
                              const bStatus = getEligibilityStatus(b);
                              if (aStatus.eligible && !bStatus.eligible) return -1;
                              if (!aStatus.eligible && bStatus.eligible) return 1;
                              return (a.firstName || "").localeCompare(b.firstName || "");
                            });

                            return sortedPlayers.map((player: any) => {
                              const { eligible, reason } = getEligibilityStatus(player);
                              const playerAge = getPlayerAge(player, ageReferenceDate); // Use helper
                              const playerGroupNames = player.groups?.map((g: any) => g.groupName).join(", ") || "No Group";

                              // Recalculate u18 constraint for visual disable
                              // Note: We might want to allow selecting ineligible players if the user insists? 
                              // No, usually best to disable. But user said "show ineligible", usually implies read-only.
                              // Check standard constraints
                              const u18Constraint = !(isSeniorCompetition && (typeof playerAge === 'number' && playerAge <= 18) && (
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
                                  className={`flex items-center justify-between p-3 border rounded-lg transition-all duration-200 ${!eligible ? 'bg-muted opacity-70' :
                                    canSelect ? 'cursor-pointer hover:bg-muted/50 hover:shadow-sm hover:border-primary/30' :
                                      'cursor-not-allowed opacity-60'
                                    }`}
                                  onClick={() => {
                                    if (canSelect) {
                                      handlePlayerSelect(player, true);
                                    } else if (eligible && selectedPlayers.length >= (competition?.maxPlayers || 0)) {
                                      toast.error(`Maximum ${competition?.maxPlayers} players allowed`);
                                    } else if (eligible && isSeniorCompetition && (typeof playerAge === 'number' && playerAge <= 18) && allowU18Extras && remainingU18Slots <= 0) {
                                      toast.error("U18 (age 18 or below) slots are full (max 3)");
                                    } else if (eligible && isSeniorCompetition && (typeof playerAge === 'number' && playerAge <= 18) && !allowU18Extras) {
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
                                        Age: {playerAge ?? 'N/A'}
                                      </Badge>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge variant={eligible ? "outline" : "destructive"} className={`text-xs flex-shrink-0 cursor-help ${eligible ? "border-green-500 text-green-600 bg-green-50" : ""}`}>
                                              {eligible ? "Eligible" : "Ineligible"}
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs">
                                            <div className="text-xs space-y-2">
                                              <div>
                                                <p className="font-semibold mb-1">Player Details:</p>
                                                <p>DOB: {new Date(player.dateOfBirth).toLocaleDateString()}</p>
                                                <p>Group: <span className="font-mono bg-black/10 px-1 rounded">{player.groups?.map((g: any) => `${g.groupName} (${g.id})`).join(", ") || "No Group"}</span></p>
                                                {!eligible && reason && (
                                                  <p className="text-red-500 mt-1 font-medium">{reason}</p>
                                                )}
                                              </div>

                                              {eligible && (
                                                <div>
                                                  <p className="font-semibold mb-1">Qualified For:</p>
                                                  <ul className="list-disc pl-3">
                                                    {competition.groups
                                                      .filter((g: any) => player.groups?.some((pg: any) => pg.id === g.groupId))
                                                      .filter((g: any) => {
                                                        if (!g.ageEligibilityDate) return true;
                                                        const dob = new Date(player.dateOfBirth);
                                                        const cutoff = new Date(g.ageEligibilityDate);
                                                        const ageType = g.ageType || g.group?.ageType || "UNDER";
                                                        if (ageType === "ABOVE") return dob <= cutoff;
                                                        return dob >= cutoff;
                                                      })
                                                      .map((g: any) => (
                                                        <li key={g.id} className="text-green-600 font-medium">
                                                          {g.groupName}
                                                        </li>
                                                      ))}
                                                  </ul>
                                                </div>
                                              )}
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
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
                            });
                          })()}
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
                      <div className="space-y-2 max-h-[550px] overflow-y-auto pr-2">
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
                      <div className="flex gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{group.gender}</Badge>
                        <Badge variant="outline" className="text-xs">{group.age}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 p-1.5 rounded">
                        <Calendar className="h-3 w-3" />
                        <span className="font-medium">Born On/After:</span>
                        <span>
                          {group.ageEligibilityDate
                            ? new Date(group.ageEligibilityDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                            : 'N/A'}
                        </span>
                      </div>
                      {group.ageEligibilityDate && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground bg-blue-50/50 p-1.5 rounded border border-blue-100">
                          <Info className="h-3 w-3 text-blue-500" />
                          <span className="font-medium text-blue-700">Max Age:</span>
                          <span className="text-blue-600">~{calculateAge(group.ageEligibilityDate)} years</span>
                        </div>
                      )}
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

      {/* Club Info Card - Manager and Coach */}
      <Card>
        <CardHeader>
          <CardTitle>Club Information</CardTitle>
          <CardDescription>
            Manager and Coach details for this competition
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingClubInfo ? (
            <div className="flex justify-center py-4">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              <span className="ml-2 text-sm">Loading...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Manager Name</label>
                <Input
                  placeholder="Enter manager name"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  disabled={updateClubInfoMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Coach Name</label>
                <Input
                  placeholder="Enter coach name"
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  disabled={updateClubInfoMutation.isPending}
                />
              </div>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => updateClubInfoMutation.mutate({ managerName, coachName })}
              disabled={updateClubInfoMutation.isPending || isLoadingClubInfo}
            >
              {updateClubInfoMutation.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Club Info"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

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
                    <TableHead>Captain</TableHead>
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
                      <TableCell>
                        {registration.captain ? (
                          <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                            <Crown className="h-3 w-3 mr-1" />
                            Captain
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCaptainMutation.mutate(registration.id)}
                            disabled={setCaptainMutation.isPending}
                          >
                            {setCaptainMutation.isPending ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <Crown className="h-4 w-4 text-muted-foreground" />
                            )}
                            Set Captain
                          </Button>
                        )}
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