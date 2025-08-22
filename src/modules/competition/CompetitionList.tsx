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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CustomPagination from "@/components/common/custom-pagination";
import { get, del } from "@/services/apiService";

const CompetitionList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("competitionName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  // Handle edit competition - navigate to edit page
  const handleEdit = (id: string) => {
    navigate(`/competitions/edit/${id}`);
  };

  // Handle view competition details - navigate to details page
  const handleViewDetails = (id: string) => {
    navigate(`/competitions/${id}`);
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

            {/* Action Buttons */}
            <Button
              onClick={handleCreate}
              size="sm"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add
            </Button>
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
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                handleEdit(competition.id.toString());
                              }}
                            >
                              <PenSquare className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                handleDownloadClubsPDF(competition.id, competition.competitionName);
                              }}
                            >
                              <FileDown className="h-4 w-4" />
                              Download clubs PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
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
                totalRecords={data.totalCompetitions}
                recordsPerPage={limit}
                onPageChange={handlePageChange}
                onRecordsPerPageChange={handleRecordsPerPageChange}
              />

              <div className="text-sm">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data.totalCompetitions)} of {data.totalCompetitions}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompetitionList;