import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { get } from "@/services/apiService";
import { LoaderCircle, ChevronRight } from "lucide-react";

const ClubAdminDashboard: React.FC = () => {
  let user: any = null;
  try {
    const userStr = localStorage.getItem("user");
    user = userStr ? JSON.parse(userStr) : null;
  } catch {}

  const name = user?.name || user?.fullName || user?.email || "Club Admin";

  // Lightweight fetch: just a few competitions for the dashboard
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["clubdashboard-competitions"],
    queryFn: () => get("/competitions", {
      page: 1,
      limit: 5,
      sortBy: "competitionName",
      sortOrder: "asc",
    }),
  });

  // Fetch players for current club to display group-wise players
  const {
    data: playersData,
    isLoading: isPlayersLoading,
    isError: isPlayersError,
    error: playersError,
  } = useQuery({
    queryKey: ["clubdashboard-players", user?.clubId],
    queryFn: () =>
      user?.clubId
        ? get(`/players/club/${user.clubId}`)
        : get("/players", { page: 1, limit: 1000 }),
    enabled: !!user,
  });

  // Utility: format date safely
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Welcome */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {name}</CardTitle>
          <CardDescription>Here are the competitions.</CardDescription>
        </CardHeader>
      </Card>

      {/* Simple list of competition names */}
      <Card className="border border-border">
        <CardHeader className="text-xl font-bold">
          Competitions
          <CardDescription>Quick access to your club's competitions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading competitions...
            </div>
          ) : isError ? (
            <div className="text-sm text-destructive">
              {(error as any)?.message || "Failed to load competitions"}
            </div>
          ) : data?.competitions?.length ? (
            <div className="space-y-2">
              <ul className="divide-y divide-border rounded-md border border-border">
                {data.competitions.map((c: any) => (
                  <li key={c.id} className="p-0 hover:bg-muted/50">
                    <Link to={`/clubcompetitions/${c.id}`} className="flex items-center justify-between p-3 gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{c.competitionName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          From: {formatDate(c.fromDate)} • Last entry: {formatDate(c.lastEntryDate)}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 ml-2 text-muted-foreground flex-shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end">
                <Link to="/clubcompetitions">
                  <Button variant="outline" size="sm">View all</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No competitions found.</div>
          )}
        </CardContent>
      </Card>

      {/* Players by Group */}
      <Card className="border border-border">
        <CardHeader className="text-xl font-bold">
          Players by Group
          <CardDescription>Quick glance at players grouped by their groups</CardDescription>
        </CardHeader>
        <CardContent>
          {isPlayersLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading players...
            </div>
          ) : isPlayersError ? (
            <div className="text-sm text-destructive">
              {(playersError as any)?.message || "Failed to load players"}
            </div>
          ) : (() => {
            const players = Array.isArray(playersData)
              ? playersData
              : (playersData as any)?.players || [];

            // Build group -> player names map
            const map = new Map<string, string[]>();
            players.forEach((p: any) => {
              const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ");
              (p.groups || []).forEach((g: any) => {
                const gname = g.groupName || "Unassigned";
                if (!map.has(gname)) map.set(gname, []);
                map.get(gname)!.push(fullName);
              });
            });

            const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));

            if (entries.length === 0) {
              return <div className="text-sm text-muted-foreground">No players found.</div>;
            }

            return (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {entries.map(([groupName, names]) => {
                    const maxShow = 8;
                    const shownNames = names.slice(0, maxShow);
                    const more = Math.max(0, names.length - maxShow);
                    return (
                      <div key={groupName} className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
                        <div className="flex items-center justify-between p-3">
                          <div className="font-medium truncate">{groupName}</div>
                          <span className="text-xs text-muted-foreground">{names.length}</span>
                        </div>
                        <div className="px-3 pb-3">
                          <div className="flex flex-wrap gap-1">
                            {shownNames.map((n, idx) => (
                              <Badge key={idx} variant="secondary" className="px-2 py-0.5">{n}</Badge>
                            ))}
                            {more > 0 && (
                              <Badge variant="outline" className="px-2 py-0.5">+{more} more</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end">
                  <Link to="/players">
                    <Button variant="outline" size="sm">View all players</Button>
                  </Link>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClubAdminDashboard;
