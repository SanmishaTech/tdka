import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

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
    Search,
    ChevronUp,
    ChevronDown,
    Eye,
} from "lucide-react";

import CustomPagination from "@/components/common/custom-pagination";
import { get } from "@/services/apiService";

const ClubCompetitionList = () => {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [limit, setLimit] = useState(10);
    const [sortBy, setSortBy] = useState("competitionName");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Fetch club's competitions
    const {
        data,
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["clubcompetitions", page, limit, search, sortBy, sortOrder],
        queryFn: () => get("/competitions", { page, limit, search, sortBy, sortOrder }),
    });



    // Handle search input
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };

    // Handle sort
    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortOrder("asc");
        }
        setPage(1);
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
        setPage(1);
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
                <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["clubcompetitions"] })}>
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-6">
            <Card className="border border-border">
                <CardHeader className="text-xl font-bold">
                    Club Competitions
                    <CardDescription>
                        Manage your club's competition participation
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-4 mb-4">
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
                                    <TableHead>Last Entry Date</TableHead>
                                    <TableHead>Participating Clubs</TableHead>
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
                                            No competitions found. Your club has not been assigned to any competitions yet.
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
                                            <TableCell>{formatDate(competition.lastEntryDate)}</TableCell>
                                            <TableCell>
                                                {competition.clubs?.length || 0} clubs
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="View Details"
                                                        onClick={() => navigate(`/clubcompetitions/${competition.id}`)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        <span className="sr-only">View</span>
                                                    </Button>
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

export default ClubCompetitionList;