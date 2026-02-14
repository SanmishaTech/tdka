import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { get } from "@/services/apiService";
import { formatDate } from "@/lib/formatter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoaderCircle } from "lucide-react";

const AdminDashboard: React.FC = () => {
  let user: any = null;
  try {
    const userStr = localStorage.getItem("user");
    user = userStr ? JSON.parse(userStr) : null;
  } catch { }

  const name = user?.name || user?.fullName || user?.email || "Admin";

  // Fetch top 5 clubs
  const { data: clubsData, isLoading: isClubsLoading, isError: isClubsError, error: clubsError } = useQuery({
    queryKey: ["dashboard-clubs"],
    queryFn: () => get("/clubs", { page: 1, limit: 5, sortBy: "clubName", sortOrder: "asc" }),
  });

  // Fetch places to map placeId -> placeName
  const { data: placesResp } = useQuery({
    queryKey: ["places"],
    queryFn: () => get("/places", { page: 1, limit: 1000, sortBy: "placeName", sortOrder: "asc" }),
  });

  const placeNameById = React.useMemo(() => {
    const map = new Map<number, string>();
    placesResp?.places?.forEach((p: any) => map.set(p.id, p.placeName));
    return map;
  }, [placesResp]);

  // Fetch top 5 competitions
  const { data: compsData, isLoading: isCompsLoading, isError: isCompsError, error: compsError } = useQuery({
    queryKey: ["dashboard-competitions"],
    queryFn: () => get("/competitions", { page: 1, limit: 5, sortBy: "competitionName", sortOrder: "asc" }),
  });



  return (
    <div className="space-y-6 p-6">
      {/* Welcome */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {name}</h1>
        <p className="text-muted-foreground">Here is a quick view of clubs and competitions.</p>
      </div>

      {/* Clubs (compact) */}
      <Card className="border border-border">
        <CardHeader className="text-xl font-bold">
          Clubs
          <CardDescription>Recent clubs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Unique Number</TableHead>
                  <TableHead>Club Name</TableHead>
                  <TableHead>Place</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isClubsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <LoaderCircle className="h-6 w-6 animate-spin mx-auto" />
                      <p className="mt-2">Loading clubs...</p>
                    </TableCell>
                  </TableRow>
                ) : isClubsError ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-destructive">
                      {(clubsError as any)?.message || "Failed to load clubs"}
                    </TableCell>
                  </TableRow>
                ) : (clubsData?.clubs?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">No clubs found.</TableCell>
                  </TableRow>
                ) : (
                  clubsData?.clubs?.map((club: any) => (
                    <TableRow key={club.id}>
                      <TableCell>{club.uniqueNumber || '-'}</TableCell>
                      <TableCell>{club.clubName}</TableCell>
                      <TableCell>{placeNameById.get(club.placeId) || '-'}</TableCell>
                      <TableCell>{club.email || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {clubsData?.totalClubs > 5 && (
            <div className="flex justify-end mt-4">
              <Link to="/clubs">
                <Button variant="outline" size="sm">Show more</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Competitions (compact) */}
      <Card className="border border-border">
        <CardHeader className="text-xl font-bold">
          Competitions
          <CardDescription>Upcoming and recent competitions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Competition Name</TableHead>
                  <TableHead>Max Players</TableHead>
                  <TableHead>From Date</TableHead>
                  <TableHead>To Date</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Age Eligibility Date</TableHead>
                  <TableHead>Last Entry Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isCompsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <LoaderCircle className="h-6 w-6 animate-spin mx-auto" />
                      <p className="mt-2">Loading competitions...</p>
                    </TableCell>
                  </TableRow>
                ) : isCompsError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-destructive">
                      {(compsError as any)?.message || "Failed to load competitions"}
                    </TableCell>
                  </TableRow>
                ) : (compsData?.competitions?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">No competitions found.</TableCell>
                  </TableRow>
                ) : (
                  compsData?.competitions?.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.competitionName}</TableCell>
                      <TableCell>{c.maxPlayers}</TableCell>
                      <TableCell>{formatDate(c.fromDate)}</TableCell>
                      <TableCell>{formatDate(c.toDate)}</TableCell>
                      <TableCell>{c.age}</TableCell>
                      <TableCell>{formatDate(c.ageEligibilityDate)}</TableCell>
                      <TableCell>{formatDate(c.lastEntryDate)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {compsData?.totalCompetitions > 5 && (
            <div className="flex justify-end mt-4">
              <Link to="/competitions">
                <Button variant="outline" size="sm">Show more</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
