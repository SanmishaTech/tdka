import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  LoaderCircle,
  Check,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import CustomPagination from "@/components/common/custom-pagination";
import { get, patch } from "@/services/apiService";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const PlayerList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("firstName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isSuspended, setIsSuspended] = useState<boolean | undefined>(undefined);
  const [aadharVerified, setAadharVerified] = useState<boolean | undefined>(undefined);
  const [clubId, setClubId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [isExportPopoverOpen, setIsExportPopoverOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const exportProgressIntervalRef = useRef<number | null>(null);
  const exportSawDownloadProgressRef = useRef(false);
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>("");
  const [photoPreviewTitle, setPhotoPreviewTitle] = useState<string>("");

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const colCount = isAdmin ? 9 : 8;

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3000").replace(/\/$/, "");
  const resolveUploadUrl = (p: string) => {
    const s = String(p || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    const normalized = s.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${backendBaseUrl}/${normalized}`;
  };

  const activeFilterCount =
    (isSuspended !== undefined ? 1 : 0) +
    (aadharVerified !== undefined ? 1 : 0) +
    (isAdmin && clubId ? 1 : 0) +
    (groupId ? 1 : 0);

  // Fetch players
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["players", page, limit, search, sortBy, sortOrder, isSuspended, aadharVerified, clubId, groupId, isAdmin],
    queryFn: () =>
      get("/players", {
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        clubId: isAdmin && clubId ? clubId : undefined,
        groupId: groupId ? groupId : undefined,
        isSuspended: isSuspended !== undefined ? isSuspended.toString() : undefined,
        aadharVerified: aadharVerified !== undefined ? aadharVerified.toString() : undefined,
      }),
  });

  const { data: clubsData, isLoading: isLoadingClubs } = useQuery({
    queryKey: ["clubs", "all"],
    queryFn: async () => {
      const response = await get("/clubs", {
        page: 1,
        limit: 5000,
        sortBy: "clubName",
        sortOrder: "asc",
      });
      return response.clubs || response;
    },
    enabled: isAdmin,
    refetchOnWindowFocus: false,
  });

  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["groups", "all"],
    queryFn: async () => {
      const response = await get("/groups", {
        page: 1,
        limit: 5000,
        sortBy: "groupName",
        sortOrder: "asc",
      });
      return response.groups || response;
    },
    refetchOnWindowFocus: false,
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
      setClubId("");
      setGroupId("");
    }
    setPage(1); // Reset to first page when filters change
  };

  // Handle edit player
  const handleEdit = (id: string) => {
    navigate(`/players/edit/${id}`);
  };

  const handleDownloadICard = async (player: any) => {
    try {
      const response: any = await get(`/players/${player.id}/icard/pdf`, undefined, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const safeName = (player.uniqueIdNumber || `player_${player.id}`).replace(/[^a-zA-Z0-9_-]/g, "_");

      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}_icard.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.errors?.message || error.message || "Failed to download iCard");
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

  const handleExportExcel = async () => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      const response: any = await get(
        "/players/export",
        {
          search,
          sortBy,
          sortOrder,
          clubId: isAdmin && clubId ? clubId : undefined,
          groupId: groupId ? groupId : undefined,
          isSuspended: isSuspended !== undefined ? isSuspended.toString() : undefined,
          aadharVerified: aadharVerified !== undefined ? aadharVerified.toString() : undefined,
        },
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "TDKA_Players_Export.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (error: any) {
      toast.error(error.errors?.message || error.message || "Failed to export players");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      setExportProgress(0);
      exportSawDownloadProgressRef.current = false;
      if (exportProgressIntervalRef.current) {
        window.clearInterval(exportProgressIntervalRef.current);
      }
      exportProgressIntervalRef.current = window.setInterval(() => {
        if (exportSawDownloadProgressRef.current) return;
        setExportProgress((prev) => {
          const p = typeof prev === "number" ? prev : 0;
          if (p >= 90) return 90;
          return p + 1;
        });
      }, 150);

      const response: any = await get(
        "/players/export/pdf",
        {
          search,
          sortBy,
          sortOrder,
          clubId: isAdmin && clubId ? clubId : undefined,
          groupId: groupId ? groupId : undefined,
          isSuspended: isSuspended !== undefined ? isSuspended.toString() : undefined,
          aadharVerified: aadharVerified !== undefined ? aadharVerified.toString() : undefined,
        },
        {
          responseType: "blob",
          onDownloadProgress: (evt: ProgressEvent) => {
            const total = (evt as any)?.total;
            const loaded = (evt as any)?.loaded;
            if (typeof total === "number" && total > 0 && typeof loaded === "number") {
              exportSawDownloadProgressRef.current = true;
              const pct = Math.max(0, Math.min(99, Math.round((loaded / total) * 100)));
              setExportProgress(pct);
            }
          },
        }
      );

      setExportProgress(100);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "TDKA_Players_Export.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (error: any) {
      toast.error(error.errors?.message || error.message || "Failed to export players");
    } finally {
      if (exportProgressIntervalRef.current) {
        window.clearInterval(exportProgressIntervalRef.current);
        exportProgressIntervalRef.current = null;
      }
      setIsExporting(false);
      setExportProgress(null);
    }
  };

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
                placeholder="Search by name / unique ID / Aadhaar..."
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
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2 px-1 py-0 h-5">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter Players</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleFilterChange('all')} className="flex items-center justify-between">
                  <span>All Players</span>
                  {isSuspended === undefined && aadharVerified === undefined && (!isAdmin || !clubId) && !groupId && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </DropdownMenuItem>

                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Club</DropdownMenuLabel>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <span className="truncate">
                          {clubId
                            ? (clubsData || []).find((c: any) => String(c.id) === String(clubId))?.clubName || "Selected club"
                            : "All Clubs"}
                        </span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="p-0 w-89">
                        <Command className="w-89">
                          <CommandInput placeholder={isLoadingClubs ? "Loading clubs..." : "Search club..."} />
                          <CommandList className="max-h-[260px]">
                            <CommandEmpty>No club found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="All Clubs"
                                onSelect={() => {
                                  setClubId("");
                                  setPage(1);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", !clubId ? "opacity-100" : "opacity-0")} />
                                All Clubs
                              </CommandItem>
                              {(clubsData || []).map((club: any) => {
                                const placeName = club?.place?.placeName;
                                const regionName = club?.place?.region?.regionName;
                                const rightText = [regionName, placeName].filter(Boolean).join(" • ");

                                return (
                                  <CommandItem
                                    key={club.id}
                                    value={`${club.clubName} ${regionName || ""} ${placeName || ""}`.trim()}
                                    onSelect={() => {
                                      setClubId(String(club.id));
                                      setPage(1);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        String(club.id) === String(clubId) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="flex-1 truncate">{club.clubName}</span>
                                    {rightText ? (
                                      <span className="ml-2 text-xs text-muted-foreground truncate">{rightText}</span>
                                    ) : null}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Group</DropdownMenuLabel>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span className="truncate">
                      {groupId
                        ? (groupsData || []).find((g: any) => String(g.id) === String(groupId))?.groupName || "Selected group"
                        : "All Groups"}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="p-0 w-89">
                    <Command className="w-89">
                      <CommandInput placeholder={isLoadingGroups ? "Loading groups..." : "Search group..."} />
                      <CommandList className="max-h-[260px]">
                        <CommandEmpty>No group found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="All Groups"
                            onSelect={() => {
                              setGroupId("");
                              setPage(1);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", !groupId ? "opacity-100" : "opacity-0")} />
                            All Groups
                          </CommandItem>
                          {(groupsData || []).map((group: any) => (
                            <CommandItem
                              key={group.id}
                              value={`${group.groupName} ${group.gender || ""} ${group.age || ""}`.trim()}
                              onSelect={() => {
                                setGroupId(String(group.id));
                                setPage(1);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  String(group.id) === String(groupId) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="flex-1 truncate">{group.groupName}</span>
                              {[group.gender, group.age].filter(Boolean).length ? (
                                <span className="ml-2 text-xs text-muted-foreground truncate">
                                  {[group.gender, group.age].filter(Boolean).join(" • ")}
                                </span>
                              ) : null}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleFilterChange('active')} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Active Players
                  </div>
                  {isSuspended === false && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('suspended')} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Ban className="mr-2 h-4 w-4 text-red-500" />
                    Suspended Players
                  </div>
                  {isSuspended === true && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Aadhar Verification</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleFilterChange('verified')} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Verified
                  </div>
                  {aadharVerified === true && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('unverified')} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <XCircle className="mr-2 h-4 w-4 text-amber-500" />
                    Unverified
                  </div>
                  {aadharVerified === false && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export Button */}
            {isAdmin && (
              <Popover open={isExportPopoverOpen} onOpenChange={setIsExportPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isExporting}>
                    {isExporting ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {isExporting && typeof exportProgress === "number" ? `Export ${exportProgress}%` : "Export"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-2">
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isExporting}
                      onClick={async () => {
                        setIsExportPopoverOpen(false);
                        await handleExportExcel();
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isExporting}
                      onClick={async () => {
                        setIsExportPopoverOpen(false);
                        await handleExportPdf();
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      {isExporting && typeof exportProgress === "number" ? `PDF ${exportProgress}%` : "PDF"}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Add Button */}
            <Button
              onClick={() => navigate('/players/create')}
              size="sm"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Player
            </Button>
          </div>
          {/* Active Filters Display */}
          {(isSuspended !== undefined || aadharVerified !== undefined || (isAdmin && clubId) || groupId) && (
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="text-sm text-muted-foreground">Active filters:</div>
              {isAdmin && clubId && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Club: {(clubsData || []).find((c: any) => String(c.id) === String(clubId))?.clubName || clubId}
                  <button
                    onClick={() => {
                      setClubId("");
                      setPage(1);
                    }}
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {groupId && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Group: {(groupsData || []).find((g: any) => String(g.id) === String(groupId))?.groupName || groupId}
                  <button
                    onClick={() => {
                      setGroupId("");
                      setPage(1);
                    }}
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {isSuspended !== undefined && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {isSuspended ? 'Suspended' : 'Active'}
                  <button 
                    onClick={() => setIsSuspended(undefined)}
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
                  setClubId("");
                  setGroupId("");
                  setPage(1);
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
                  {isAdmin && <TableHead>Club</TableHead>}
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
                    <TableCell colSpan={colCount} className="h-24 text-center">
                      <LoaderCircle className="h-6 w-6 animate-spin mx-auto" />
                      <p className="mt-2">Loading players...</p>
                    </TableCell>
                  </TableRow>
                ) : data?.players?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colCount} className="h-24 text-center">
                      No players found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.players?.map((player: any) => (
                    <TableRow key={player.id} className={player.isSuspended ? "bg-red-50" : ""}>
                      {isAdmin && (
                        <TableCell className="whitespace-nowrap">
                          {player.club?.clubName || "No Club"}
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-xs">{player.uniqueIdNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* Profile Image */}
                          <div className="flex-shrink-0">
                            {player.profileImage ? (
                              <img 
                                src={resolveUploadUrl(player.profileImage)}
                                alt={`${player.firstName} ${player.lastName}`}
                                className="w-8 h-8 rounded-full object-cover border cursor-pointer transition-transform hover:scale-105"
                                onClick={() => {
                                  setPhotoPreviewUrl(resolveUploadUrl(player.profileImage));
                                  setPhotoPreviewTitle(`${player.firstName} ${player.lastName}`);
                                  setIsPhotoPreviewOpen(true);
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E';
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx={12} cy={7} r={4} />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div>
                            <div>
                              {player.firstName} {player.lastName}
                              {player.motherName ? ` (${player.motherName})` : ""}
                            </div>
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadICard(player)}
                              >
                                <Download className="h-4 w-4" />
                                <span className="sr-only">Download iCard</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>Download iCard</TooltipContent>
                          </Tooltip>

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

                              {/* Toggle Aadhar Verification (only allow unverify) */}
                              {player.aadharVerified && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <XCircle className="mr-2 h-4 w-4 text-amber-500" />
                                      Mark Aadhar as Unverified
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Mark Aadhar as Unverified</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {`Are you sure you want to mark ${player.firstName} ${player.lastName}'s Aadhar as unverified?`}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => toggleAadharVerificationMutation.mutate({
                                          id: player.id,
                                          aadharVerified: false,
                                        })}
                                        className="bg-amber-500 hover:bg-amber-600"
                                      >
                                        {toggleAadharVerificationMutation.isPending ? (
                                          <>
                                            <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                                            Processing...
                                          </>
                                        ) : (
                                          "Mark as Unverified"
                                        )}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
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

          <Dialog open={isPhotoPreviewOpen} onOpenChange={setIsPhotoPreviewOpen}>
            <DialogContent className="p-0 overflow-hidden sm:max-w-2xl">
              <div className="px-6 pt-6">
                <DialogTitle>{photoPreviewTitle || "Profile Photo"}</DialogTitle>
              </div>
              <div className="bg-black/90">
                {photoPreviewUrl ? (
                  <img
                    src={photoPreviewUrl}
                    alt={photoPreviewTitle || "Profile Photo"}
                    className="w-full max-h-[80vh] object-contain"
                  />
                ) : null}
              </div>
            </DialogContent>
          </Dialog>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <CustomPagination
                currentPage={page}
                totalPages={data.totalPages}
                totalRecords={data.totalPlayers}
                recordsPerPage={limit}
                onPageChange={handlePageChange}
                onRecordsPerPageChange={handleRecordsPerPageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerList;