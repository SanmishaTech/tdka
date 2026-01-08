import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  LoaderCircle,
  PenSquare,
  Search,
  Trash2,
  ChevronUp,
  ChevronDown,
  PlusCircle,
  Info,
  FileDown,
  MoreHorizontal,
  UserPlus,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CustomPagination from "@/components/common/custom-pagination";
import { get, del, post, put } from "@/services/apiService";

const CompetitionList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("competitionName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Role-based UI control
  let userRole = 'admin';
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      userRole = JSON.parse(storedUser)?.role || 'admin';
    }
  } catch {}
  const isAdmin = userRole === 'admin';
  const isClubAdmin = userRole === 'clubadmin';

  // Observer dialog state
  const [observerDialogOpen, setObserverDialogOpen] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<any | null>(null);
  const [observerEmail, setObserverEmail] = useState("");
  const [observerPassword, setObserverPassword] = useState("");
  const [existingObserver, setExistingObserver] = useState<any | null>(null);
  const [isFetchingObserver, setIsFetchingObserver] = useState(false);

  // Referee dialog state
  const [refereeDialogOpen, setRefereeDialogOpen] = useState(false);
  const [existingReferee, setExistingReferee] = useState<any | null>(null);
  const [isFetchingReferee, setIsFetchingReferee] = useState(false);
  const [selectedRefereeId, setSelectedRefereeId] = useState<string>("");

  // Fetch competitions
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["competitions", page, limit, search, sortBy, sortOrder],
    queryFn: () => get("/competitions", { page, limit, search, sortBy, sortOrder }),
  });

  const {
    data: refereesData,
    isLoading: isLoadingReferees,
  } = useQuery({
    queryKey: ["referees", "all"],
    queryFn: () =>
      get("/referees", {
        page: 1,
        limit: 1000,
        search: "",
        sortBy: "createdAt",
        sortOrder: "asc",
      }),
    enabled: !!refereeDialogOpen && isAdmin,
  });

  // Assign referee mutation
  const assignRefereeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompetition) throw new Error("No competition selected");
      if (!selectedRefereeId) throw new Error("No referee selected");
      const path = `/competitions/${selectedCompetition.id}/referee`;
      const payload = { refereeId: Number(selectedRefereeId) };
      return existingReferee ? await put(path, payload) : await post(path, payload);
    },
    onSuccess: () => {
      const updated = !!existingReferee;
      toast.success(updated ? "Referee updated successfully" : "Referee assigned successfully");
      setRefereeDialogOpen(false);
      setSelectedCompetition(null);
      setExistingReferee(null);
      setSelectedRefereeId("");
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || error?.errors?.message || (existingReferee ? "Failed to update referee" : "Failed to assign referee"));
    },
  });

  // Delete competition mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/competitions/${id}`),
    onSuccess: () => {
      toast.success("Competition deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
    },
    onError: (error: any) => {
      toast.error(error.errors?.message || error.message || "Failed to delete competition");
    },
  });

  // Create/assign observer mutation
  const createObserverMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompetition) throw new Error("No competition selected");
      const path = `/competitions/${selectedCompetition.id}/observer`;
      if (existingObserver) {
        // Update existing observer
        return await put(path, {
          email: observerEmail || undefined,
          password: observerPassword || undefined,
        });
      } else {
        // Create new observer
        return await post(path, {
          email: observerEmail,
          password: observerPassword,
        });
      }
    },
    onSuccess: () => {
      const updated = !!existingObserver;
      toast.success(updated ? "Observer updated successfully" : "Observer created and assigned successfully");
      setObserverDialogOpen(false);
      setObserverEmail("");
      setObserverPassword("");
      setSelectedCompetition(null);
      setExistingObserver(null);
      // No need to refetch list, but safe to invalidate
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || error?.errors?.message || (existingObserver ? "Failed to update observer" : "Failed to create observer"));
    },
  });

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page when search changes
  };

  // Handle open referee dialog
  const handleOpenRefereeDialog = async (competition: any) => {
    setSelectedCompetition(competition);
    setExistingReferee(null);
    setSelectedRefereeId("");
    setRefereeDialogOpen(true);
    // Fetch existing referee details if any
    try {
      setIsFetchingReferee(true);
      const data: any = await get(`/competitions/${competition.id}/referee`);
      const ref = data?.referee || data;
      if (ref?.id) {
        setExistingReferee(ref);
        setSelectedRefereeId(String(ref.id));
      } else {
        setExistingReferee(null);
      }
    } catch (err: any) {
      // 404 -> no referee assigned
      setExistingReferee(null);
    } finally {
      setIsFetchingReferee(false);
    }
  };

  // Handle sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPage(1); // Reset to first page when sort changes
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && (!data || newPage <= data.totalPages)) {
      setPage(newPage);
    }
  };

  // Handle records per page change
  const handleRecordsPerPageChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when limit changes
  };

  // Handle edit competition - navigate to edit page
  const handleEdit = (id: string) => {
    navigate(`/competitions/edit/${id}`);
  };

  // Handle view competition details - navigate to details page
  const handleViewDetails = (id: string) => {
    const isObserverRole = userRole === 'observer';
    const isRefereeRole = userRole === 'referee';
    navigate(
      isObserverRole
        ? `/observercompetitions/${id}`
        : isRefereeRole
        ? `/refereecompetitions/${id}`
        : `/competitions/${id}`
    );
  };

  // Handle open observer dialog
  const handleOpenObserverDialog = async (competition: any) => {
    setSelectedCompetition(competition);
    setObserverEmail("");
    setObserverPassword("");
    setExistingObserver(null);
    setObserverDialogOpen(true);
    // Fetch existing observer details if any
    try {
      setIsFetchingObserver(true);
      const data: any = await get(`/competitions/${competition.id}/observer`);
      const obs = data?.observer || data;
      if (obs?.email) {
        setExistingObserver(obs);
        setObserverEmail(obs.email);
      } else {
        setExistingObserver(null);
      }
    } catch (err: any) {
      // 404 -> no observer assigned
      setExistingObserver(null);
    } finally {
      setIsFetchingObserver(false);
    }
  };

  // Handle create competition - navigate to create page
  const handleCreate = () => {
    navigate('/competitions/create');
  };

  // Handle download participating clubs PDF for a competition
  const handleDownloadClubsPDF = async (competitionId: number, competitionName: string) => {
    try {
      const response: any = await get(`/competitions/${competitionId}/clubs/pdf`, undefined, { responseType: 'blob' });
      const blob: Blob = response?.data || response; // apiService.get returns axios response when responseType is 'blob'
      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${competitionName}_Participating_Clubs.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to download PDF');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  };

  // Handle error
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Competitions</h2>
        <p>{(error as any)?.message || "Failed to load competitions"}</p>
        <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["competitions"] })}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <Card className="border border-border">
        <CardHeader className="text-xl font-bold">
          Competitions
          <CardDescription>
            Manage competitions
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-4 mb-4 ">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search competitions..."
                value={search}
                onChange={handleSearchChange}
                className="pl-8 w-full"
              />
            </div>

            {/* Action Buttons (Admins only) */}
            {isAdmin && (
              <Button onClick={handleCreate} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add
              </Button>
            )}
          </div>

          {/* Competitions Table */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-auto cursor-pointer" onClick={() => handleSort("competitionName")}>
                    Competition Name
                    {sortBy === "competitionName" && (
                      <span className="ml-2 inline-block">
                        {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    )}
                  </TableHead>
                  <TableHead>Max Players</TableHead>
                  <TableHead>From Date</TableHead>
                  <TableHead>To Date</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Age Eligibility Date</TableHead>
                  <TableHead>Last Entry Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <LoaderCircle className="h-6 w-6 animate-spin mx-auto" />
                      <p className="mt-2">Loading competitions...</p>
                    </TableCell>
                  </TableRow>
                ) : data?.competitions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No competitions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.competitions?.map((competition: any) => (
                    <TableRow key={competition.id}>
                      <TableCell>{competition.competitionName}</TableCell>
                      <TableCell>{competition.maxPlayers}</TableCell>
                      <TableCell>{formatDate(competition.fromDate)}</TableCell>
                      <TableCell>{formatDate(competition.toDate)}</TableCell>
                      <TableCell>{competition.age}</TableCell>
                      <TableCell>{formatDate(competition.ageEligibilityDate)}</TableCell>
                      <TableCell>{formatDate(competition.lastEntryDate)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                handleViewDetails(competition.id.toString());
                              }}
                            >
                              <Info className="h-4 w-4" />
                              View details
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleOpenObserverDialog(competition);
                                }}
                              >
                                <UserPlus className="h-4 w-4" />
                                Set observer
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleOpenRefereeDialog(competition);
                                }}
                              >
                                <UserPlus className="h-4 w-4" />
                                Set referee
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleEdit(competition.id.toString());
                                }}
                              >
                                <PenSquare className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {(isAdmin || isClubAdmin) && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleDownloadClubsPDF(competition.id, competition.competitionName);
                                }}
                              >
                                <FileDown className="h-4 w-4" />
                                Download clubs PDF
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this competition? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(competition.id)}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      {deleteMutation.isPending ? (
                                        <>
                                          <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                                          Deleting...
                                        </>
                                      ) : (
                                        "Delete"
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <CustomPagination
                currentPage={page}
                totalPages={data.totalPages}
                totalRecords={data.totalCompetitions}
                recordsPerPage={limit}
                onPageChange={handlePageChange}
                onRecordsPerPageChange={handleRecordsPerPageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observer Creation Dialog */}
      <Dialog open={observerDialogOpen} onOpenChange={setObserverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCompetition ? `${existingObserver ? 'Update' : 'Set'} Observer - ${selectedCompetition.competitionName}` : "Set Observer"}
            </DialogTitle>
            <DialogDescription>
              {existingObserver
                ? 'An observer is already assigned. You can update the email and/or password.'
                : 'Create a single observer account for this competition. Provide an email and password. Only one observer is allowed per competition.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="observer-email">Email</Label>
              <Input
                id="observer-email"
                type="email"
                placeholder={isFetchingObserver ? 'Loading...' : 'observer@example.com'}
                value={observerEmail}
                onChange={(e) => setObserverEmail(e.target.value)}
                disabled={isFetchingObserver || createObserverMutation.isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="observer-password">Password</Label>
              <Input
                id="observer-password"
                type="password"
                placeholder={existingObserver ? 'Leave blank to keep current password' : 'Enter a password'}
                value={observerPassword}
                onChange={(e) => setObserverPassword(e.target.value)}
                disabled={createObserverMutation.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setObserverDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createObserverMutation.mutate()}
              disabled={
                createObserverMutation.isPending ||
                !observerEmail ||
                (!existingObserver && !observerPassword) // password required only when creating
              }
            >
              {(createObserverMutation.isPending || isFetchingObserver) && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}
              {existingObserver ? 'Update Observer' : 'Create Observer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Referee Creation Dialog */}
      <Dialog open={refereeDialogOpen} onOpenChange={setRefereeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCompetition ? `${existingReferee ? 'Update' : 'Set'} Referee - ${selectedCompetition.competitionName}` : "Set Referee"}
            </DialogTitle>
            <DialogDescription>
              {existingReferee
                ? 'A referee is already assigned. Select another referee to update the assignment.'
                : 'Select a referee to assign to this competition. Only one referee is allowed per competition.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="referee-select">Referee</Label>
              <Select
                value={selectedRefereeId || undefined}
                onValueChange={(v) => setSelectedRefereeId(v)}
                disabled={isFetchingReferee || isLoadingReferees || assignRefereeMutation.isPending}
              >
                <SelectTrigger id="referee-select" className="w-full">
                  <SelectValue
                    placeholder={
                      isLoadingReferees
                        ? 'Loading referees...'
                        : 'Select a referee'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(refereesData?.referees || []).map((r: any) => {
                    const fullName = [r?.firstName, r?.middleName, r?.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim();
                    const label = fullName || r?.user?.email || r?.emailId || `Referee #${r?.id}`;
                    const userIdValue = String(r?.userId);
                    return (
                      <SelectItem key={userIdValue} value={userIdValue}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefereeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => assignRefereeMutation.mutate()}
              disabled={assignRefereeMutation.isPending || !selectedRefereeId}
            >
              {(assignRefereeMutation.isPending || isFetchingReferee) && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}
              {existingReferee ? 'Update Referee' : 'Assign Referee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompetitionList;