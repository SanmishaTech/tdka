import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  LoaderCircle,
  PenSquare,
  Search,
  Ban,
  ChevronUp,
  ChevronDown,
  PlusCircle,
  CheckCircle,
  XCircle,
  FileText,
  Download
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import CustomPagination from "@/components/common/custom-pagination";
import { get, patch } from "@/services/apiService";
// Import components from current directory
import CreatePlayer from "./CreatePlayer";
import EditPlayer from "./EditPlayer";

const PlayerList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("firstName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isSuspended, setIsSuspended] = useState<boolean | undefined>(undefined);
  const [aadharVerified, setAadharVerified] = useState<boolean | undefined>(undefined);
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch players
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["players", page, limit, search, sortBy, sortOrder, isSuspended, aadharVerified],
    queryFn: () => get("/players", { 
      page, 
      limit, 
      search, 
      sortBy, 
      sortOrder,
      isSuspended: isSuspended !== undefined ? isSuspended.toString() : undefined,
      aadharVerified: aadharVerified !== undefined ? aadharVerified.toString() : undefined
    }),
  });

  // Toggle suspension mutation
  const toggleSuspensionMutation = useMutation({
    mutationFn: ({ id, isSuspended }: { id: number, isSuspended: boolean }) => 
      patch(`/players/${id}/suspension`, { isSuspended }),
    onSuccess: () => {
      toast.success("Player status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
    onError: (error: any) => {
      toast.error(error.errors?.message || error.message || "Failed to update player status");
    },
  });

  // Toggle Aadhar verification mutation
  const toggleAadharVerificationMutation = useMutation({
    mutationFn: ({ id, aadharVerified }: { id: number, aadharVerified: boolean }) => 
      patch(`/players/${id}/aadhar-verification`, { aadharVerified }),
    onSuccess: () => {
      toast.success("Aadhar verification status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
    onError: (error: any) => {
      toast.error(error.errors?.message || error.message || "Failed to update Aadhar verification status");
    },
  });

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page when search changes
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

  // Handle filter changes
  const handleFilterChange = (filter: 'suspended' | 'active' | 'verified' | 'unverified' | 'all') => {
    if (filter === 'suspended') {
      setIsSuspended(true);
    } else if (filter === 'active') {
      setIsSuspended(false);
    } else if (filter === 'verified') {
      setAadharVerified(true);
    } else if (filter === 'unverified') {
      setAadharVerified(false);
    } else {
      setIsSuspended(undefined);
      setAadharVerified(undefined);
    }
    setPage(1); // Reset to first page when filters change
  };

  // Handle edit player
  const handleEdit = (id: string) => {
    setEditPlayerId(id);
    setIsEditDialogOpen(true);
  };

  // Handle dialog close
  const handleCreateDialogClose = () => {
    setIsCreateDialogOpen(false);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditPlayerId(null);
  };

  // Handle export to Excel
  const handleExport = () => {
    window.location.href = `/api/players?export=true&search=${search}${isSuspended !== undefined ? `&isSuspended=${isSuspended}` : ''}${aadharVerified !== undefined ? `&aadharVerified=${aadharVerified}` : ''}`;
  };

  // Format date of birth
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
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

  // Handle error
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Players</h2>
        <p>{(error as any)?.message || "Failed to load players"}</p>
        <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["players"] })}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <Card className="border border-border">
        <CardHeader className="text-xl font-bold">
          Players
          <CardDescription>
            Manage players
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={search}
                onChange={handleSearchChange}
                className="pl-8 w-full"
              />
            </div>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Filters
                  {(isSuspended !== undefined || aadharVerified !== undefined) && (
                    <Badge variant="secondary" className="ml-2 px-1 py-0 h-5">
                      {(isSuspended !== undefined ? 1 : 0) + (aadharVerified !== undefined ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter Players</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleFilterChange('all')}>
                  All Players
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleFilterChange('active')}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Active Players
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('suspended')}>
                  <Ban className="mr-2 h-4 w-4 text-red-500" />
                  Suspended Players
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Aadhar Verification</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleFilterChange('verified')}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Verified
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('unverified')}>
                  <XCircle className="mr-2 h-4 w-4 text-amber-500" />
                  Unverified
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export Button */}
            {/* <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button> */}

            {/* Add Button */}
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              size="sm"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Active Filters Display */}
          {(isSuspended !== undefined || aadharVerified !== undefined) && (
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="text-sm text-muted-foreground">Active filters:</div>
              {isSuspended !== undefined && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {isSuspended ? 'Suspended' : 'Active'}
                  <button 
                    onClick={() => setIsSuspended(undefined)}
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {aadharVerified !== undefined && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Aadhar: {aadharVerified ? 'Verified' : 'Unverified'}
                  <button 
                    onClick={() => setAadharVerified(undefined)}
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setIsSuspended(undefined);
                  setAadharVerified(undefined);
                }}
              >
                Clear all
              </Button>
            </div>
          )}

          {/* Players Table */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-auto cursor-pointer" onClick={() => handleSort("uniqueIdNumber")}>
                    ID
                    {sortBy === "uniqueIdNumber" && (
                      <span className="ml-2 inline-block">
                        {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    )}
                  </TableHead>
                  <TableHead className="w-auto cursor-pointer" onClick={() => handleSort("firstName")}>
                    Name
                    {sortBy === "firstName" && (
                      <span className="ml-2 inline-block">
                        {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    )}
                  </TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Groups</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aadhar</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <LoaderCircle className="h-6 w-6 animate-spin mx-auto" />
                      <p className="mt-2">Loading players...</p>
                    </TableCell>
                  </TableRow>
                ) : data?.players?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No players found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.players?.map((player: any) => (
                    <TableRow key={player.id} className={player.isSuspended ? "bg-red-50" : ""}>
                      <TableCell className="font-mono text-xs">{player.uniqueIdNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {player.profileImage && (
                            <img 
                              src={`/uploads${player.profileImage}`} 
                              alt={`${player.firstName} ${player.lastName}`} 
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <div>{player.firstName} {player.lastName}</div>
                            <div className="text-xs text-muted-foreground">{player.position || 'No position'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{calculateAge(player.dateOfBirth)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {player.groups.map((group: any) => (
                            <Badge key={group.id} variant="outline" className="text-xs">
                              {group.groupName}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{player.mobile}</TableCell>
                      <TableCell>
                        {player.isSuspended ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {player.aadharVerified ? (
                          <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">Verified</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">Unverified</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(player.id.toString())}
                          >
                            <PenSquare className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <FileText className="h-4 w-4" />
                                <span className="sr-only">More</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              
                              {/* Toggle Suspension */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    {player.isSuspended ? (
                                      <>
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                        Activate Player
                                      </>
                                    ) : (
                                      <>
                                        <Ban className="mr-2 h-4 w-4 text-red-500" />
                                        Suspend Player
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {player.isSuspended ? "Activate Player" : "Suspend Player"}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {player.isSuspended 
                                        ? `Are you sure you want to activate ${player.firstName} ${player.lastName}?`
                                        : `Are you sure you want to suspend ${player.firstName} ${player.lastName}? This will prevent them from participating in competitions.`
                                      }
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => toggleSuspensionMutation.mutate({
                                        id: player.id,
                                        isSuspended: !player.isSuspended
                                      })}
                                      className={player.isSuspended ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}
                                    >
                                      {toggleSuspensionMutation.isPending ? (
                                        <>
                                          <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                                          Processing...
                                        </>
                                      ) : (
                                        player.isSuspended ? "Activate" : "Suspend"
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              {/* Toggle Aadhar Verification */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    {player.aadharVerified ? (
                                      <>
                                        <XCircle className="mr-2 h-4 w-4 text-amber-500" />
                                        Mark Aadhar as Unverified
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                        Verify Aadhar
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {player.aadharVerified ? "Mark Aadhar as Unverified" : "Verify Aadhar"}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {player.aadharVerified 
                                        ? `Are you sure you want to mark ${player.firstName} ${player.lastName}'s Aadhar as unverified?`
                                        : `Are you sure you want to verify ${player.firstName} ${player.lastName}'s Aadhar?`
                                      }
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => toggleAadharVerificationMutation.mutate({
                                        id: player.id,
                                        aadharVerified: !player.aadharVerified
                                      })}
                                      className={player.aadharVerified ? "bg-amber-500 hover:bg-amber-600" : "bg-green-500 hover:bg-green-600"}
                                    >
                                      {toggleAadharVerificationMutation.isPending ? (
                                        <>
                                          <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                                          Processing...
                                        </>
                                      ) : (
                                        player.aadharVerified ? "Mark as Unverified" : "Verify"
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Show</span>
                <select
                  className="border rounded p-1 text-sm"
                  value={limit}
                  onChange={(e) => handleRecordsPerPageChange(Number(e.target.value))}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-sm">per page</span>
              </div>

              <CustomPagination
                currentPage={page}
                totalPages={data.totalPages}
                totalRecords={data.totalPlayers}
                recordsPerPage={limit}
                onPageChange={handlePageChange}
                onRecordsPerPageChange={handleRecordsPerPageChange}
              />

              <div className="text-sm">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data.totalPlayers)} of {data.totalPlayers}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Player Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Player</DialogTitle>
          </DialogHeader>
          <CreatePlayer onSuccess={handleCreateDialogClose} />
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog */}
      {editPlayerId && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Player</DialogTitle>
            </DialogHeader>
            <EditPlayer playerId={editPlayerId} onSuccess={handleEditDialogClose} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PlayerList;