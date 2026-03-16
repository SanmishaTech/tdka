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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const PlayerList = () => {
  const [page, setPage] = useState(() => Number(sessionStorage.getItem("players_page")) || 1);
  const [search, setSearch] = useState(() => sessionStorage.getItem("players_search") || "");
  const [limit, setLimit] = useState(() => Number(sessionStorage.getItem("players_limit")) || 10);
  const [sortBy, setSortBy] = useState(() => sessionStorage.getItem("players_sortBy") || "firstName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => (sessionStorage.getItem("players_sortOrder") as "asc" | "desc") || "asc");
  const [isSuspended, setIsSuspended] = useState<boolean | undefined>(() => {
    const val = sessionStorage.getItem("players_isSuspended");
    return val === "true" ? true : val === "false" ? false : undefined;
  });
  const [aadharVerified, setAadharVerified] = useState<boolean | undefined>(() => {
    const val = sessionStorage.getItem("players_aadharVerified");
    return val === "true" ? true : val === "false" ? false : undefined;
  });
  const [clubId, setClubId] = useState<string>(() => sessionStorage.getItem("players_clubId") || "");
  const [groupId, setGroupId] = useState<string>(() => sessionStorage.getItem("players_groupId") || "");
  const [regionId, setRegionId] = useState<string>(() => sessionStorage.getItem("players_regionId") || "");

  // Sync state to sessionStorage
  React.useEffect(() => {
    sessionStorage.setItem("players_page", page.toString());
    sessionStorage.setItem("players_search", search);
    sessionStorage.setItem("players_limit", limit.toString());
    sessionStorage.setItem("players_sortBy", sortBy);
    sessionStorage.setItem("players_sortOrder", sortOrder);
    if (isSuspended !== undefined) {
      sessionStorage.setItem("players_isSuspended", isSuspended.toString());
    } else {
      sessionStorage.removeItem("players_isSuspended");
    }
    if (aadharVerified !== undefined) {
      sessionStorage.setItem("players_aadharVerified", aadharVerified.toString());
    } else {
      sessionStorage.removeItem("players_aadharVerified");
    }
    sessionStorage.setItem("players_clubId", clubId);
    sessionStorage.setItem("players_groupId", groupId);
    sessionStorage.setItem("players_regionId", regionId);
  }, [page, search, limit, sortBy, sortOrder, isSuspended, aadharVerified, clubId, groupId, regionId]);

  const [isExporting, setIsExporting] = useState(false);
  const [isExportPopoverOpen, setIsExportPopoverOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const exportProgressIntervalRef = useRef<number | null>(null);
  const exportSawDownloadProgressRef = useRef(false);
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>("");
  const [photoPreviewTitle, setPhotoPreviewTitle] = useState<string>("");

  const [isVerifyScriptOpen, setIsVerifyScriptOpen] = useState(false);
  const [verifyScriptLogs, setVerifyScriptLogs] = useState<{ type: string; message: string }[]>([]);
  const [isVerifyScriptRunning, setIsVerifyScriptRunning] = useState(false);
  const verifyScriptLogsEndRef = useRef<HTMLDivElement>(null);
  const verifyEventSourceRef = useRef<EventSource | null>(null);
  const [showPasswordStep, setShowPasswordStep] = useState(true);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

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
    (groupId ? 1 : 0) +
    (regionId ? 1 : 0);

  // Fetch players
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["players", page, limit, search, sortBy, sortOrder, isSuspended, aadharVerified, clubId, groupId, regionId, isAdmin],
    queryFn: () =>
      get("/players", {
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        clubId: isAdmin && clubId ? clubId : undefined,
        groupId: groupId ? groupId : undefined,
        regionId: regionId ? regionId : undefined,
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

  const { data: regionsData, isLoading: isLoadingRegions } = useQuery({
    queryKey: ["regions", "all"],
    queryFn: async () => {
      const response = await get("/regions", {
        page: 1,
        limit: 5000,
        sortBy: "regionName",
        sortOrder: "asc",
      });
      return response.regions || response;
    },
    enabled: isAdmin,
    refetchOnWindowFocus: false,
  });

  const { data: aadharConfig } = useQuery({
    queryKey: ["aadhar-config"],
    queryFn: () => get("/players/aadhar-config"),
    refetchOnWindowFocus: false,
  });

  const isAadharAutoVerifyEnabled = aadharConfig?.enabled === true;

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
      setRegionId("");
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

  // Open the dialog (without starting the script) — reset to password step
  const handleOpenVerifyDialog = () => {
    setVerifyScriptLogs([]);
    setIsVerifyScriptRunning(false);
    setShowPasswordStep(true);
    setAdminPassword("");
    setPasswordError("");
    setIsVerifyScriptOpen(true);
  };

  // Stop the running verification script
  const handleStopVerifyScript = () => {
    if (verifyEventSourceRef.current) {
      verifyEventSourceRef.current.close();
      verifyEventSourceRef.current = null;
    }
    setIsVerifyScriptRunning(false);
    setVerifyScriptLogs((prev) => [...prev, { type: 'stopped', message: 'Script stopped by user.' }]);
  };

  // Verify admin password before running the script
  const handleVerifyPassword = async () => {
    if (!adminPassword.trim()) {
      setPasswordError('Please enter your password.');
      return;
    }
    setIsVerifyingPassword(true);
    setPasswordError("");
    try {
      const token = localStorage.getItem("authToken") || "";
      const resp = await fetch(`${backendBaseUrl}/api/players/verify-admin-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password: adminPassword }),
      });
      const data = await resp.json();
      if (data.success) {
        setShowPasswordStep(false);
        setAdminPassword("");
      } else {
        setPasswordError(data.message || 'Incorrect password.');
      }
    } catch (e) {
      setPasswordError('Could not verify password. Check your connection.');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Actually start the script via SSE
  const handleRunVerifyScript = () => {
    setVerifyScriptLogs([]);
    setIsVerifyScriptRunning(true);

    // EventSource cannot send custom headers, so pass the JWT token as a query param
    const token = localStorage.getItem("authToken") || "";
    const eventSource = new EventSource(`${backendBaseUrl}/api/players/run-aadhar-script?token=${encodeURIComponent(token)}`);
    verifyEventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setVerifyScriptLogs((prev) => [...prev, data]);
        // Auto-scroll
        setTimeout(() => {
          verifyScriptLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        if (data.type === 'done' || (data.type === 'error' && data.message.startsWith('Failed to start'))) {
          setIsVerifyScriptRunning(false);
          verifyEventSourceRef.current = null;
          eventSource.close();
          if (data.type === 'done') {
            queryClient.invalidateQueries({ queryKey: ["players"] }); // Refresh list
          }
        }
      } catch (e) {
        console.error("Error parsing SSE data", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Error", err);
      setIsVerifyScriptRunning(false);
      verifyEventSourceRef.current = null;
      eventSource.close();
    };
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
          regionId: regionId ? regionId : undefined,
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
          regionId: regionId ? regionId : undefined,
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
                <Button
                  variant={activeFilterCount > 0 ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "transition-all duration-300",
                    activeFilterCount > 0 && "bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white font-medium shadow-md shadow-emerald-100"
                  )}
                >
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2 px-1.5 py-0 h-5 bg-white text-emerald-700 font-bold">
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
                  {isSuspended === undefined && aadharVerified === undefined && (!isAdmin || !clubId) && !groupId && !regionId && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </DropdownMenuItem>

                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Region</DropdownMenuLabel>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <span className="truncate">
                          {regionId
                            ? (regionsData || []).find((r: any) => String(r.id) === String(regionId))?.regionName || "Selected region"
                            : "All Regions"}
                        </span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="p-0 w-89">
                        <Command className="w-89">
                          <CommandInput placeholder={isLoadingRegions ? "Loading regions..." : "Search region..."} />
                          <CommandList className="max-h-[260px]">
                            <CommandEmpty>No region found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="All Regions"
                                onSelect={() => {
                                  setRegionId("");
                                  setClubId("");
                                  setPage(1);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", !regionId ? "opacity-100" : "opacity-0")} />
                                All Regions
                              </CommandItem>
                              {(regionsData || []).map((region: any) => (
                                <CommandItem
                                  key={region.id}
                                  value={`${region.regionName} ${region.taluka?.talukaName || ""}`.trim()}
                                  onSelect={() => {
                                    setRegionId(String(region.id));
                                    setClubId(""); // Reset club when region changes
                                    setPage(1);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      String(region.id) === String(regionId) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="flex-1 truncate">{region.regionName}</span>
                                  {region.taluka?.talukaName ? (
                                    <span className="ml-2 text-xs text-muted-foreground truncate">{region.taluka.talukaName}</span>
                                  ) : null}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}
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
                    <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/30">
                      {regionId ? (
                        <>Clubs from <span className="font-medium text-foreground">{(regionsData || []).find((r: any) => String(r.id) === String(regionId))?.regionName}</span></>
                      ) : (
                        "All clubs (Filter via Region to narrow)"
                      )}
                    </div>
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
                          {(clubsData || [])
                            .filter((club: any) => {
                              if (!regionId) return true;
                              // Check if club's region matches selected regionId
                              // structure: club.place.region.id
                              return String(club?.place?.region?.id) === String(regionId);
                            })
                            .map((club: any) => {
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

            {isAdmin && isAadharAutoVerifyEnabled && (
              <Button
                variant="secondary"
                size="sm"
                className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200"
                onClick={handleOpenVerifyDialog}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify All
              </Button>
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
          {(isSuspended !== undefined || aadharVerified !== undefined || (isAdmin && clubId) || groupId || regionId) && (
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="text-sm text-muted-foreground">Active filters:</div>
              {regionId && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1">
                  Region: {(regionsData || []).find((r: any) => String(r.id) === String(regionId))?.regionName || regionId}
                  <button
                    onClick={() => {
                      setRegionId("");
                      setPage(1);
                    }}
                    className="ml-1 rounded-full hover:bg-emerald-200 transition-colors p-0.5"
                  >
                    <XCircle className="h-3.5 w-3.5 text-emerald-600" />
                  </button>
                </Badge>
              )}
              {isAdmin && clubId && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1">
                  Club: {(clubsData || []).find((c: any) => String(c.id) === String(clubId))?.clubName || clubId}
                  <button
                    onClick={() => {
                      setClubId("");
                      setPage(1);
                    }}
                    className="ml-1 rounded-full hover:bg-emerald-200 transition-colors p-0.5"
                  >
                    <XCircle className="h-3.5 w-3.5 text-emerald-600" />
                  </button>
                </Badge>
              )}

              {groupId && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1">
                  Group: {(groupsData || []).find((g: any) => String(g.id) === String(groupId))?.groupName || groupId}
                  <button
                    onClick={() => {
                      setGroupId("");
                      setPage(1);
                    }}
                    className="ml-1 rounded-full hover:bg-emerald-200 transition-colors p-0.5"
                  >
                    <XCircle className="h-3.5 w-3.5 text-emerald-600" />
                  </button>
                </Badge>
              )}

              {isSuspended !== undefined && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {isSuspended ? 'Suspended' : 'Active'}
                  <button
                    onClick={() => setIsSuspended(undefined)}
                    className="ml-1 rounded-full hover:bg-emerald-200 transition-colors p-0.5"
                  >
                    <XCircle className="h-3.5 w-3.5 text-emerald-600" />
                  </button>
                </Badge>
              )}
              {aadharVerified !== undefined && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1">
                  Aadhar: {aadharVerified ? 'Verified' : 'Unverified'}
                  <button
                    onClick={() => setAadharVerified(undefined)}
                    className="ml-1 rounded-full hover:bg-emerald-200 transition-colors p-0.5"
                  >
                    <XCircle className="h-3.5 w-3.5 text-emerald-600" />
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
                  setRegionId("");
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
                  <TableHead>Region</TableHead>
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
                      <TableCell>
                        {player.region?.regionName || player.club?.place?.region?.regionName || "-"}
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

          {/* Script Execution Dialog */}
          <Dialog open={isVerifyScriptOpen} onOpenChange={(open) => {
            if (!isVerifyScriptRunning) setIsVerifyScriptOpen(open);
          }}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  Aadhar Auto-Verification
                </DialogTitle>
                <DialogDescription>
                  {showPasswordStep
                    ? "This action is restricted to admins. Please confirm your password to continue."
                    : "Automatically verifies all unverified players using the Cashfree OCR API."}
                </DialogDescription>
              </DialogHeader>

              {/* Password Confirmation Step */}
              {showPasswordStep ? (
                <div className="flex flex-col gap-4 py-4">
                  <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <Ban className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Admin Authentication Required</p>
                      <p className="text-xs text-amber-700 mt-1">
                        This script will update the verification status of players in the database. Enter your admin password to proceed.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700">Admin Password</label>
                    <Input
                      type="password"
                      placeholder="Enter your password..."
                      value={adminPassword}
                      onChange={(e) => { setAdminPassword(e.target.value); setPasswordError(""); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyPassword(); }}
                      className={passwordError ? "border-red-400 focus-visible:ring-red-300" : ""}
                    />
                    {passwordError && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5" />
                        {passwordError}
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsVerifyScriptOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleVerifyPassword}
                      disabled={isVerifyingPassword}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isVerifyingPassword ? (
                        <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                      ) : (
                        <><CheckCircle className="mr-2 h-4 w-4" /> Confirm</>
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <>

                  {/* Stats Bar */}
                  {verifyScriptLogs.length > 0 && (
                    <div className="flex gap-3 px-1">
                      {[
                        { label: 'Verified', type: 'success', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                        { label: 'Skipped', type: 'skip', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                        { label: 'Failed', type: 'failed', color: 'bg-red-50 text-red-700 border-red-200' },
                      ].map(({ label, type, color }) => {
                        const count = verifyScriptLogs.filter(l => {
                          const m = l.message.toUpperCase();
                          if (type === 'success') return m.startsWith('[SUCCESS]');
                          if (type === 'skip') return m.startsWith('[SKIP]');
                          if (type === 'failed') return m.startsWith('[FAILED]') || m.startsWith('[MISMATCH]');
                          return false;
                        }).length;
                        return (
                          <div key={type} className={cn("flex items-center gap-1.5 border rounded-md px-3 py-1 text-sm font-medium", color)}>
                            <span>{count}</span>
                            <span>{label}</span>
                          </div>
                        );
                      })}
                      {isVerifyScriptRunning && (
                        <div className="flex items-center gap-1.5 border rounded-md px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 border-blue-200 ml-auto animate-pulse">
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          Running
                        </div>
                      )}
                    </div>
                  )}

                  {/* Log List */}
                  <div className="flex-1 overflow-y-auto border rounded-lg bg-slate-50 divide-y min-h-[350px] max-h-[400px]">
                    {verifyScriptLogs.length === 0 && !isVerifyScriptRunning && (
                      <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground gap-3">
                        <CheckCircle className="h-10 w-10 text-emerald-200" />
                        <p className="text-sm">Click <strong>Run Script</strong> to start verifying unverified players.</p>
                      </div>
                    )}
                    {verifyScriptLogs.map((log, index) => {
                      const msg = log.message;
                      const upper = msg.toUpperCase();
                      let icon = null;
                      let bgClass = "";
                      let textClass = "text-slate-700";
                      let badgeClass = "";
                      let badge = "";

                      if (upper.startsWith('[SUCCESS]')) {
                        icon = <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />;
                        bgClass = "bg-emerald-50";
                        textClass = "text-emerald-700";
                        badgeClass = "bg-emerald-100 text-emerald-700";
                        badge = "SUCCESS";
                      } else if (upper.startsWith('[SKIP]')) {
                        icon = <XCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />;
                        bgClass = "bg-amber-50/50";
                        textClass = "text-amber-700";
                        badgeClass = "bg-amber-100 text-amber-700";
                        badge = "SKIP";
                      } else if (upper.startsWith('[MISMATCH]') || upper.startsWith('[FAILED]')) {
                        icon = <Ban className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />;
                        bgClass = "bg-red-50/50";
                        textClass = "text-red-700";
                        badgeClass = "bg-red-100 text-red-700";
                        badge = upper.startsWith('[MISMATCH]') ? "MISMATCH" : "FAILED";
                      } else if (upper.startsWith('[VERIFYING]')) {
                        icon = <LoaderCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />;
                        bgClass = "bg-blue-50/30";
                        textClass = "text-blue-700";
                        badgeClass = "bg-blue-100 text-blue-700";
                        badge = "VERIFYING";
                      } else if (upper.startsWith('[ERROR]')) {
                        icon = <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />;
                        bgClass = "bg-red-100/50";
                        textClass = "text-red-800";
                        badgeClass = "bg-red-200 text-red-800";
                        badge = "ERROR";
                      } else if (log.type === 'done') {
                        icon = <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />;
                        bgClass = "bg-emerald-100/60";
                        textClass = "text-emerald-800 font-semibold";
                        badge = "";
                      } else if (log.type === 'stopped') {
                        icon = <Ban className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />;
                        bgClass = "bg-orange-50";
                        textClass = "text-orange-700 font-medium";
                        badge = "";
                      } else if (log.type === 'connected') {
                        icon = <CheckCircle className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />;
                        bgClass = "";
                        textClass = "text-slate-500 text-xs";
                        badge = "";
                      } else {
                        icon = <LoaderCircle className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />;
                      }

                      // Clean up prefix tags from message
                      const cleanMsg = msg
                        .replace(/^\[(SUCCESS|SKIP|MISMATCH|FAILED|VERIFYING|ERROR)\]\s*/i, '')
                        .trim();

                      return (
                        <div key={index} className={cn("flex items-start gap-3 px-4 py-2.5", bgClass)}>
                          {icon}
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm leading-snug break-words", textClass)}>{cleanMsg || msg}</p>
                          </div>
                          {badge && (
                            <span className={cn("text-xs font-semibold rounded px-1.5 py-0.5 flex-shrink-0", badgeClass)}>
                              {badge}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    <div ref={verifyScriptLogsEndRef} />
                  </div>

                  <DialogFooter className="flex gap-2 items-center">
                    <Button
                      variant="outline"
                      onClick={() => setIsVerifyScriptOpen(false)}
                      disabled={isVerifyScriptRunning}
                      className="mr-auto"
                    >
                      Close
                    </Button>
                    {isVerifyScriptRunning ? (
                      <Button
                        onClick={handleStopVerifyScript}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Stop
                      </Button>
                    ) : (
                      <Button
                        onClick={handleRunVerifyScript}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Run Script
                      </Button>
                    )}
                  </DialogFooter>
                </>
              )}
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