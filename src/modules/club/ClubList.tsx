import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  PenSquare,
  Search,
  Trash2,
  ChevronUp,
  ChevronDown,
  PlusCircle,
  Upload,
  Download,
  SlidersHorizontal
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
import CustomPagination from "@/components/common/custom-pagination";
import { get, del, postupload } from "@/services/apiService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Remove unused imports since we're using navigation now
// import CreateClub from "./CreateClub";
// import EditClub from "./EditClub";

const ClubList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("clubName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [regionId, setRegionId] = useState<string>("");
  const [placeId, setPlaceId] = useState<string>("");
  const [regionDraftId, setRegionDraftId] = useState<string>("");
  const [placeDraftId, setPlaceDraftId] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const isFilterActive = regionId !== "" || placeId !== "";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch clubs
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["clubs", page, limit, search, sortBy, sortOrder, regionId, placeId],
    queryFn: () => get("/clubs", { page, limit, search, sortBy, sortOrder, regionId, placeId }),
  });

  const { data: regionsResp } = useQuery({
    queryKey: ["regions"],
    queryFn: () => get("/regions", { page: 1, limit: 1000, sortBy: "regionName", sortOrder: "asc" }),
  });

  // Import clubs mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return await postupload("/clubs/import", fd);
    },
    onSuccess: (res: any) => {
      const created = res?.summary?.created ?? 0;
      const errors = res?.summary?.errors ?? 0;
      toast.success(`Import complete. Created: ${created}. Errors: ${errors}.`);
      if (errors > 0) {
        console.warn("Club import errors:", res?.errors);
      }
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      setSelectedFile(null);
      setImportOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Import failed");
    },
  });

  const triggerFileDialog = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    // reset input so selecting the same file again still fires change
    e.target.value = "";
  };

  const handleStartImport = () => {
    if (!selectedFile) {
      toast.error("Please choose an Excel file to import");
      return;
    }
    importMutation.mutate(selectedFile);
  };

  const downloadTemplate = async () => {
    try {
      const res = await get("/clubs/import/template", undefined, { responseType: "blob" });
      const blob = res.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "TDKA_Clubs_Import_Template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download template");
    }
  };

  const exportClubs = async () => {
    try {
      setIsExporting(true);
      const res = await get(
        "/clubs/export",
        { search, sortBy, sortOrder, regionId, placeId },
        { responseType: "blob" }
      );
      const blob = res.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "TDKA_Clubs_Export.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.message || "Failed to export clubs");
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch places for mapping placeId -> placeName
  const { data: placesResp } = useQuery({
    queryKey: ["places"],
    queryFn: () => get("/places", { page: 1, limit: 1000, sortBy: "placeName", sortOrder: "asc" }),
  });

  const placeNameById = React.useMemo(() => {
    const map = new Map<number, string>();
    placesResp?.places?.forEach((p: any) => map.set(p.id, p.placeName));
    return map;
  }, [placesResp]);

  const regionNameByPlaceId = React.useMemo(() => {
    const map = new Map<number, string>();
    placesResp?.places?.forEach((p: any) =>
      map.set(p.id, p?.region?.regionName)
    );
    return map;
  }, [placesResp]);

  // Delete club mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/clubs/${id}`),
    onSuccess: () => {
      toast.success("Club deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete club");
    },
  });

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page when search changes
  };

  const applyFilters = () => {
    setRegionId(regionDraftId);
    setPlaceId(placeDraftId);
    setPage(1);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setRegionId("");
    setPlaceId("");
    setRegionDraftId("");
    setPlaceDraftId("");
    setPage(1);
    setFilterOpen(false);
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

  // Handle edit club - navigate to edit page
  const handleEdit = (id: string) => {
    navigate(`/clubs/edit/${id}`);
  };

  // Handle create club - navigate to create page
  const handleCreate = () => {
    navigate('/clubs/create');
  };

  // Handle error club
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Clubs</h2>
        <p>{error instanceof Error ? error.message : "Failed to load clubs"}</p>
        <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["clubs"] })}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">



      <Card className="border border-border">
        <CardHeader className="text-xl font-bold">
          Clubs
          <CardDescription>
            Manage clubs
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-4 mb-4 ">
            {/* Search Input */}
            <div className="flex flex-1 min-w-[250px] items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by club name or affiliation number..."
                  value={search}
                  onChange={handleSearchChange}
                  className="pl-8 w-full"
                />
              </div>

              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={isFilterActive ? "border-emerald-600 text-emerald-600" : undefined}
                    onClick={() => {
                      setRegionDraftId(regionId);
                      setPlaceDraftId(placeId);
                    }}
                  >
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filter
                    {isFilterActive && (
                      <span
                        className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-600"
                        aria-label="Filter active"
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Region</Label>
                      <Select
                        value={regionDraftId === "" ? "all" : regionDraftId}
                        onValueChange={(v) => {
                          const nextRegion = v === "all" ? "" : v;
                          setRegionDraftId(nextRegion);
                          setPlaceDraftId("");
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Regions</SelectItem>
                          {(regionsResp?.regions ?? []).map((r: any) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.regionName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Place</Label>
                      <Select
                        disabled={regionDraftId === ""}
                        value={placeDraftId === "" ? "all" : placeDraftId}
                        onValueChange={(v) => setPlaceDraftId(v === "all" ? "" : v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              regionDraftId === "" ? "Select region first" : "Select place"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {regionDraftId !== "" && <SelectItem value="all">All Places</SelectItem>}
                          {(regionDraftId === ""
                            ? []
                            : (placesResp?.places ?? []).filter(
                                (p: any) => String(p?.region?.id) === regionDraftId
                              )
                          ).map((p: any) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.placeName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                        Clear
                      </Button>
                      <Button type="button" size="sm" onClick={applyFilters}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Action Buttons */}
            <Button
              onClick={handleCreate}
              size="sm"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add
            </Button>
            <Button
              onClick={() => setImportOpen(true)}
              size="sm"
              variant="secondary"
            >
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Excel
              </>
            </Button>
            <Button
              onClick={exportClubs}
              size="sm"
              variant="secondary"
              disabled={isExporting}
            >
              <>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Export Excel"}
              </>
            </Button>
          </div>


          {/* Clubs Table */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Unique Number</TableHead>
                  <TableHead>Club Name</TableHead>

                  <TableHead className="w-auto cursor-pointer" onClick={() => handleSort("placeId")}>
                    Place
                    {sortBy === "placeId" && (
                      <span className="ml-2 inline-block">
                        {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    )}
                  </TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <LoaderCircle className="h-6 w-6 animate-spin mx-auto" />
                      <p className="mt-2">Loading clubs...</p>
                    </TableCell>
                  </TableRow>
                ) : data?.clubs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No clubs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.clubs?.map((club: any) => (
                    <TableRow key={club.id}>
                      <TableCell>{club.uniqueNumber || '-'}</TableCell>
                      <TableCell>{club.clubName}</TableCell>
                      <TableCell>{placeNameById.get(club.placeId) || '-'}</TableCell>
                      <TableCell>{regionNameByPlaceId.get(club.placeId) || '-'}</TableCell>
                      <TableCell>{club.email}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(club.id.toString())}
                          >
                            <PenSquare className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this club? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(club.id)}
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
            <div className="flex justify-center mt-4">
              <CustomPagination
                currentPage={page}
                totalPages={data.totalPages}
                totalRecords={data.totalClubs}
                recordsPerPage={limit}
                onPageChange={handlePageChange}
                onRecordsPerPageChange={handleRecordsPerPageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) setSelectedFile(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Clubs from Excel</DialogTitle>
            <DialogDescription>
              Prepare your Excel file with the following columns:
              <br />
              <span className="font-medium">Club Name</span>, <span className="font-medium">Email</span>, <span className="font-medium">Place</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>

            <div className="border rounded p-3 flex items-center justify-between">
              <div className="text-sm truncate">
                Selected file: {selectedFile ? selectedFile.name : <span className="text-muted-foreground">None</span>}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button type="button" variant="secondary" onClick={triggerFileDialog} disabled={importMutation.isPending}>
                Choose File
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImportOpen(false)} disabled={importMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleStartImport} disabled={!selectedFile || importMutation.isPending}>
              {importMutation.isPending ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Start Import"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClubList;
