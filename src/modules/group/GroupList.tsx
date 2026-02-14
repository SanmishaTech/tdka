import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  LoaderCircle,
  Search,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import CustomPagination from "@/components/common/custom-pagination";
import { get } from "@/services/apiService";

const GroupList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("groupName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const queryClient = useQueryClient();

  // Fetch groups
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["groups", page, limit, search, sortBy, sortOrder],
    queryFn: () => get("/groups", { page, limit, search, sortBy, sortOrder }),
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

  // Handle error group
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Groups</h2>
        <p>{(error as any)?.message || "Failed to load groups"}</p>
        <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["groups"] })}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <Card className="border border-border">
        <CardHeader className="text-xl font-bold">
          Groups
          <CardDescription>
            Manage groups
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-4 mb-4 ">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={search}
                onChange={handleSearchChange}
                className="pl-8 w-full"
              />
            </div>
          </div>

          {/* Groups Table */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-auto cursor-pointer" onClick={() => handleSort("groupName")}>
                    Group Name
                    {sortBy === "groupName" && (
                      <span className="ml-2 inline-block">
                        {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    )}
                  </TableHead>
                  <TableHead className="w-auto cursor-pointer" onClick={() => handleSort("gender")}>
                    Gender
                    {sortBy === "gender" && (
                      <span className="ml-2 inline-block">
                        {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    )}
                  </TableHead>
                  <TableHead className="w-auto cursor-pointer" onClick={() => handleSort("ageType")}>
                    Age Condition
                    {sortBy === "ageType" && (
                      <span className="ml-2 inline-block">
                        {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    )}
                  </TableHead>
                  <TableHead className="w-auto cursor-pointer" onClick={() => handleSort("age")}>
                    Age Limit
                    {sortBy === "age" && (
                      <span className="ml-2 inline-block">
                        {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    )}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <LoaderCircle className="h-6 w-6 animate-spin mx-auto" />
                      <p className="mt-2">Loading groups...</p>
                    </TableCell>
                  </TableRow>
                ) : data?.groups?.length === 0 ? (
                  <TableRow>
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No groups found.
                      </TableCell>
                    </TableRow>
                  </TableRow>
                ) : (
                  data?.groups?.map((group: any) => (
                    <TableRow key={group.id}>
                      <TableCell>{group.groupName}</TableCell>
                      <TableCell>{group.gender}</TableCell>
                      <TableCell>
                        {group.ageType || "-"}
                      </TableCell>
                      <TableCell>
                        {group.age}
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
                totalRecords={data.totalGroups}
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

export default GroupList;