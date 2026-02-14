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


import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LoaderCircle, ArrowLeft, Calendar, Users, Plus, X, CheckCircle2, Info, UserPlus, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { get, post, put, del } from "@/services/apiService";
import { formatDate } from "@/lib/formatter";
import { Input } from "@/components/ui/input";

const ClubCompetitionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [managerNames, setManagerNames] = useState<Record<number, string>>({});
  const [coachNames, setCoachNames] = useState<Record<number, string>>({});
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [captainId, setCaptainId] = useState<number | null>(null);

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

  // Fetch eligible players from club (filtered for the active group)
  const {
    data: eligiblePlayers,
    isLoading: isLoadingPlayers,
  } = useQuery({
    queryKey: ["eligibleplayers", id, activeGroupId],
    queryFn: () => get(`/competitions/${id}/eligible-players?groupId=${activeGroupId}`),
    enabled: !!id && showAddPlayers && !!activeGroupId,
  });

  // Fetch registered players for this competition
  const {
    data: registeredPlayers,
  } = useQuery({
    queryKey: ["registeredplayers", id],
    queryFn: () => get(`/competitions/${id}/registered-players`),
    enabled: !!id,
  });

  // Add players to competition mutation
  const addPlayersMutation = useMutation({
    mutationFn: ({ playerIds, groupId, captainId }: { playerIds: number[], groupId: number, captainId?: number | null }) =>
      post(`/competitions/${id}/add-players`, { playerIds, groupId, captainId }),
    onSuccess: () => {
      toast.success("Players added to competition successfully");
      setShowAddPlayers(false);
      setSelectedPlayers([]);
      setActiveGroupId(null);
      setCaptainId(null);
      queryClient.invalidateQueries({ queryKey: ["clubcompetition", id] });
      queryClient.invalidateQueries({ queryKey: ["registeredplayers", id] });
    },
    onError: (error: any) => {
      toast.error(error.errors?.message || error.message || "Failed to add players");
    },
  });

  // Set captain mutation (for already-registered players)
  const setCaptainMutation = useMutation({
    mutationFn: ({ registrationId }: { registrationId: number }) =>
      put(`/competitions/${id}/clubs/${clubId}/players/${registrationId}/captain`, {}),
    onSuccess: () => {
      toast.success("Captain updated successfully");
      queryClient.invalidateQueries({ queryKey: ["registeredplayers", id] });
    },
    onError: (error: any) => {
      toast.error(error.errors?.message || error.message || "Failed to set captain");
    },
  });

  // Remove player from competition mutation
  const removePlayerFromCompetitionMutation = useMutation({
    mutationFn: ({ playerId }: { playerId: number }) =>
      del(`/competitions/${id}/players/${playerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registeredplayers", id] });
    },
    onError: (error: any) => {
      toast.error(error.errors?.message || error.message || "Failed to remove player");
    },
  });


  // Update club info mutation (per-group)
  const updateClubInfoMutation = useMutation({
    mutationFn: (data: { managerName: string; coachName: string; groupId: number }) =>
      put(`/competitions/${id}/clubs/${clubId}/info`, data),
    onSuccess: () => {
      toast.success(`Manager and coach information saved for group`);
      queryClient.invalidateQueries({ queryKey: ["clubcompetition-info", id, clubId] });
    },
    onError: (error: any) => {
      toast.error(error.errors?.message || error.message || "Failed to save manager and coach information");
    },
  });

  // Populate manager and coach names per group from registered players data
  useEffect(() => {
    if (registeredPlayers?.registrations) {
      const managers: Record<number, string> = {};
      const coaches: Record<number, string> = {};
      for (const reg of registeredPlayers.registrations) {
        if (reg.groupId && reg.managerName && !managers[reg.groupId]) {
          managers[reg.groupId] = reg.managerName;
        }
        if (reg.groupId && reg.coachName && !coaches[reg.groupId]) {
          coaches[reg.groupId] = reg.coachName;
        }
      }
      setManagerNames(prev => ({ ...prev, ...managers }));
      setCoachNames(prev => ({ ...prev, ...coaches }));
    }
  }, [registeredPlayers]);
  useEffect(() => {
    if (showAddPlayers && activeGroupId && registeredPlayers?.registrations && eligiblePlayers?.players) {
      // Extract player IDs from registered players for this specific group
      const groupRegistrations = registeredPlayers.registrations
        .filter((registration: any) => registration.groupId === activeGroupId);
      const registeredPlayerIds = groupRegistrations
        .map((registration: any) => registration.player.id)
        .filter((playerId: number) =>
          eligiblePlayers.players.some((eligiblePlayer: any) => eligiblePlayer.id === playerId)
        );

      setSelectedPlayers(registeredPlayerIds);

      // Pre-populate captain from registered data
      const captainReg = groupRegistrations.find((reg: any) => reg.captain === true);
      setCaptainId(captainReg ? captainReg.player.id : null);
    }
  }, [showAddPlayers, activeGroupId, registeredPlayers, eligiblePlayers]);

  // Format date for display


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
      // If removing the captain, clear captainId
      if (captainId === player.id) setCaptainId(null);
    }
  };

  // Handle save players (add new + remove deselected)
  const handleSavePlayers = async () => {
    if (!activeGroupId) {
      toast.error("No group selected");
      return;
    }

    // Get currently registered player IDs for this specific group
    const registeredPlayerIds = registeredPlayers?.registrations
      ?.filter((reg: any) => reg.groupId === activeGroupId)
      ?.map((reg: any) => reg.player.id) || [];

    // Determine which players to ADD (selected but not registered)
    const playersToAdd = selectedPlayers.filter(playerId => !registeredPlayerIds.includes(playerId));

    // Determine which players to REMOVE (registered but not selected)
    const playersToRemove = registeredPlayerIds.filter((playerId: number) => !selectedPlayers.includes(playerId));

    // If no changes, just close the dialog
    if (playersToAdd.length === 0 && playersToRemove.length === 0) {
      toast.info("No changes to save");
      setShowAddPlayers(false);
      return;
    }

    try {
      // Remove deselected players first
      if (playersToRemove.length > 0) {
        for (const playerId of playersToRemove) {
          await removePlayerFromCompetitionMutation.mutateAsync({ playerId });
        }
      }

      // Add new players
      if (playersToAdd.length > 0) {
        await addPlayersMutation.mutateAsync({
          playerIds: playersToAdd,
          groupId: activeGroupId,
          captainId
        });
      }

      toast.success(`Successfully saved changes: ${playersToAdd.length} added, ${playersToRemove.length} removed`);
      setShowAddPlayers(false);
      setSelectedPlayers([]);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save players");
    }
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

  const activeGroupData = competition?.groups?.find((g: any) => g.groupId === activeGroupId);

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
      </div>

      <Dialog open={showAddPlayers} onOpenChange={(open) => {
        setShowAddPlayers(open);
        if (!open) { setActiveGroupId(null); setSelectedPlayers([]); setCaptainId(null); }
      }}>
        <DialogContent className="max-w-[95vw] w-[95vw] sm:max-w-[95vw] h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap text-left">
              <span>Add Players — {activeGroupData?.groupName || 'Group'}</span>
              {activeGroupData && (
                <div className="flex items-center gap-2 flex-wrap mt-1 sm:mt-0">
                  <Badge variant="outline" className="text-xs ml-2">{activeGroupData.gender}</Badge>
                  <Badge variant="outline" className="text-xs">{activeGroupData.age}</Badge>
                  {activeGroupData.ageEligibilityDate && (
                    <>
                      <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                        Born On/After: {formatDate(activeGroupData.ageEligibilityDate)}
                      </span>
                      <span className="text-xs text-blue-600 ml-2 font-medium whitespace-nowrap">
                        (Max Age: ~{calculateAge(activeGroupData.ageEligibilityDate)} years)
                      </span>
                    </>
                  )}
                </div>
              )}
            </DialogTitle>
            <DialogDescription>
              Select players for group "{activeGroupData?.groupName}" in "{competition?.competitionName}".
              Maximum {competition?.maxPlayers} players allowed per group.
            </DialogDescription>
          </DialogHeader>

          {/* Coach & Manager for this group */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium">Manager Name</label>
              <Input
                placeholder="Enter manager name"
                value={activeGroupId ? (managerNames[activeGroupId] || '') : ''}
                onChange={(e) => {
                  if (activeGroupId) setManagerNames(prev => ({ ...prev, [activeGroupId]: e.target.value }));
                }}
                disabled={updateClubInfoMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Coach Name</label>
              <Input
                placeholder="Enter coach name"
                value={activeGroupId ? (coachNames[activeGroupId] || '') : ''}
                onChange={(e) => {
                  if (activeGroupId) setCoachNames(prev => ({ ...prev, [activeGroupId]: e.target.value }));
                }}
                disabled={updateClubInfoMutation.isPending}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (activeGroupId) {
                    updateClubInfoMutation.mutate({
                      managerName: managerNames[activeGroupId] || '',
                      coachName: coachNames[activeGroupId] || '',
                      groupId: activeGroupId,
                    });
                  }
                }}
                disabled={updateClubInfoMutation.isPending || !activeGroupId}
              >
                {updateClubInfoMutation.isPending ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Coach/Manager"
                )}
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col space-y-4">
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
              <div className="flex-1 min-h-0 flex flex-col space-y-4">
                <div className="text-sm text-muted-foreground text-center">
                  Selected: {selectedPlayers.length} / {competition?.maxPlayers || 0} players
                </div>

                <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                  {/* Available Players Column */}
                  <div className="space-y-2 flex flex-col min-h-0">
                    <h4 className="font-medium text-sm text-muted-foreground border-b pb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Available Players ({eligiblePlayers?.players?.filter((p: any) => !selectedPlayers.includes(p.id)).length})
                    </h4>
                    <div className="space-y-2 flex-1 overflow-y-auto pr-2">
                      <AnimatePresence mode="popLayout">
                        {(() => {
                          const available = eligiblePlayers?.players?.filter((player: any) => !selectedPlayers.includes(player.id)) || [];

                          // Sort: Eligible first, then Ineligible, then by Name
                          const sortedPlayers = [...available].sort((a: any, b: any) => {
                            if (a.eligible && !b.eligible) return -1;
                            if (!a.eligible && b.eligible) return 1;
                            return (a.firstName || "").localeCompare(b.firstName || "");
                          });

                          return sortedPlayers.map((player: any) => {
                            const eligible = player.eligible;
                            const reason = player.reason || "";
                            const playerAge = getPlayerAge(player, ageReferenceDate); // Use helper

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
                                              <p>DOB: {formatDate(player.dateOfBirth)}</p>
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
                  <div className="space-y-2 flex flex-col min-h-0">
                    <h4 className="font-medium text-sm text-muted-foreground border-b pb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Selected Players ({selectedPlayers.length})
                    </h4>
                    <div className="space-y-2 flex-1 overflow-y-auto pr-2">
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
                                    {captainId === player.id && (
                                      <Badge className="text-xs flex-shrink-0 bg-amber-100 text-amber-800 border-amber-300">
                                        <Crown className="h-3 w-3 mr-1" /> Captain
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {player.uniqueIdNumber} • {player.position || 'N/A'}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <motion.button
                                    type="button"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className={`p-1.5 rounded-md transition-colors ${captainId === player.id ? 'text-amber-600 bg-amber-100' : 'text-muted-foreground hover:text-amber-600 hover:bg-amber-50'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCaptainId(captainId === player.id ? null : player.id);
                                      // If already registered, also call the API to persist
                                      if (isAlreadyRegistered && captainId !== player.id) {
                                        const reg = registeredPlayers?.registrations?.find(
                                          (r: any) => r.player.id === player.id && r.groupId === activeGroupId
                                        );
                                        if (reg) setCaptainMutation.mutate({ registrationId: reg.id });
                                      }
                                    }}
                                    title={captainId === player.id ? 'Remove Captain' : 'Set as Captain'}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Crown className="h-4 w-4" />
                                  </motion.button>
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center text-red-500 hover:text-red-600 p-1.5 cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); handlePlayerSelect(player, false); }}
                                  >
                                    <X className="h-4 w-4" />
                                  </motion.div>
                                </div>
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
              onClick={handleSavePlayers}
              disabled={addPlayersMutation.isPending || removePlayerFromCompetitionMutation.isPending}
            >
              {(addPlayersMutation.isPending || removePlayerFromCompetitionMutation.isPending) ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (() => {
                const registeredPlayerIds = registeredPlayers?.registrations
                  ?.filter((reg: any) => reg.groupId === activeGroupId)
                  ?.map((reg: any) => reg.player.id) || [];
                const playersToAdd = selectedPlayers.filter(playerId => !registeredPlayerIds.includes(playerId)).length;
                const playersToRemove = registeredPlayerIds.filter((playerId: number) => !selectedPlayers.includes(playerId)).length;
                const totalChanges = playersToAdd + playersToRemove;

                if (totalChanges === 0) {
                  return "No Changes to Save";
                }

                return `Save Players (${playersToAdd} to add, ${playersToRemove} to remove)`;
              })()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                            ? formatDate(group.ageEligibilityDate)
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

                      <Button
                        size="sm"
                        className="w-full mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Determine the correct group ID - handle both structures if needed
                          const gid = group.groupId || group.id;
                          setActiveGroupId(gid);
                          setShowAddPlayers(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Players
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Competition Rules */}
      {
        competition?.rules && (
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
        )
      }


    </div >
  );
};

export default ClubCompetitionDetails;