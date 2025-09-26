import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Place, PlacesResponse } from "./types";
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
import {
  LoaderCircle,
  PenSquare,
  Search,
  Trash2,
  ChevronUp,
  ChevronDown,
  PlusCircle
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
import { get, del } from "@/services/apiService";
// Import components from current directory
import CreatePlace from "./CreatePlace";
import EditPlace from "./EditPlace";

const PlaceList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("number");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [editPlaceId, setEditPlaceId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch places
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<PlacesResponse>({
    queryKey: ["places", page, limit, search, sortBy, sortOrder],
    queryFn: () => get("/places", { page, limit, search, sortBy, sortOrder }),
  });

  // Delete place mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/places/${id}`),
    onSuccess: () => {
      toast.success("Place deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["places"] });
    },
    onError: (error: any) => {
      toast.error(error.errors?.message || error.message || "Failed to delete place");
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

  // Handle edit place
  const handleEdit = (id: string) => {
    setEditPlaceId(id);
    setIsEditDialogOpen(true);
  };

  // Handle dialog close
  const handleCreateDialogClose = () => {
    setIsCreateDialogOpen(false);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditPlaceId(null);
  };

  // Handle error
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Places</h2>
        <p>{(error as any)?.message || "Failed to load places"}</p>
        <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["places"] })}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <Card className="border border-border">
        <CardHeader className="text-xl font-bold">
          Places (Talukas)
          <CardDescription>
            Manage places/talukas
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-4 mb-4 ">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search places..."
                value={search}
                onChange={handleSearchChange}
                className="pl-8 w-full"
              />
            </div>

            {/* Action Buttons */}
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              size="sm"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Places Table */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-auto cursor-pointer" onClick={() => handleSort("number")}>
                    Number
                    {sortBy === "number" && (
                      <span className="ml-2 inline-block">
                        {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    )}
                  </TableHead>
                  <TableHead className="w-auto cursor-pointer" onClick={() => handleSort("abbreviation")}>
                    Abbreviation
                    {sortBy === "abbreviation" && (
                      <span className="ml-2 inline-block">
                        {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    )}
                  </TableHead>
                  <TableHead className="w-auto cursor-pointer" onClick={() => handleSort("placeName")}>
                    Place Name
                    {sortBy === "placeName" && (
                      <span className="ml-2 inline-block">
                        {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    )}
                  </TableHead>
                  <TableHead className="w-auto">
                    Region
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <LoaderCircle className="h-6 w-6 animate-spin mx-auto" />
                      <p className="mt-2">Loading places...</p>
                    </TableCell>
                  </TableRow>
                ) : data?.places?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No places found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.places?.map((place: Place) => (
                    <TableRow key={place.id}>
                      <TableCell className="font-mono">{String(place.number).padStart(2, '0')}</TableCell>
                      <TableCell className="font-semibold">{place.abbreviation}</TableCell>
                      <TableCell>{place.placeName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {String(place.region?.number).padStart(2, '0')}
                          </span>
                          <span>{place.region?.regionName}</span>
                          <span className="text-muted-foreground text-sm">({place.region?.abbreviation})</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(place.id.toString())}
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
                                  Are you sure you want to delete the place "{place.placeName}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(place.id)}
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
                totalRecords={data.totalPlaces}
                recordsPerPage={limit}
                onPageChange={handlePageChange}
                onRecordsPerPageChange={handleRecordsPerPageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Place Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Place</DialogTitle>
          </DialogHeader>
          <CreatePlace onSuccess={handleCreateDialogClose} />
        </DialogContent>
      </Dialog>

      {/* Edit Place Dialog */}
      {editPlaceId && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Place</DialogTitle>
            </DialogHeader>
            <EditPlace placeId={editPlaceId} onSuccess={handleEditDialogClose} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PlaceList;
