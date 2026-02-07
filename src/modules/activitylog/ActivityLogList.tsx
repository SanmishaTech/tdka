import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/apiService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CustomPagination from "@/components/common/custom-pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import type { ActivityLog, ActivityLogsResponse } from "./types";

const safeParseChanges = (raw: string | null | undefined): Record<string, any> | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
};

const SYSTEM_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "deletedAt",
  "created_at",
  "updated_at",
  "deleted_at",
]);

const formatValue = (value: any) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toLocaleString();
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch (_) {
    return String(value);
  }
};

const extractChangeRows = (changes: Record<string, any> | null) => {
  if (!changes || typeof changes !== "object") return [] as Array<{ field: string; oldVal: any; newVal: any }>;

  const rows: Array<{ field: string; oldVal: any; newVal: any }> = [];
  for (const [field, payload] of Object.entries(changes)) {
    if (payload && typeof payload === "object" && "old" in payload && "new" in payload) {
      rows.push({ field, oldVal: (payload as any).old, newVal: (payload as any).new });
    }
  }
  return rows;
};

const humanizeKey = (key: string) => {
  const s = String(key || "");
  if (!s) return "";

  // Convert snake_case to spaces
  const snake = s.replace(/_/g, " ");

  // Convert camelCase/PascalCase to spaces
  const spaced = snake
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return spaced
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const inferActionVerb = (action: string) => {
  if (action.endsWith("_CREATE")) return "Created";
  if (action.endsWith("_UPDATE")) return "Updated";
  if (action.endsWith("_DELETE")) return "Deleted";
  return action || "Changed";
};

const buildDescription = (log: ActivityLog) => {
  const changes = safeParseChanges(log.changes);
  const allRows = extractChangeRows(changes);
  const rows = allRows.filter((r) => !SYSTEM_FIELDS.has(r.field));

  const modelName = humanizeKey(String(log.entityType || "Record"));
  const action = String(log.action || "");
  const verb = inferActionVerb(action);

  // Special case: login events commonly appear as USER_UPDATE + lastLogin
  if (String(log.entityType) === "User") {
    const nonSystemFields = new Set(rows.map((r) => r.field));
    if (nonSystemFields.size === 1 && nonSystemFields.has("lastLogin")) {
      const row = rows.find((r) => r.field === "lastLogin");
      const who = log.actorEmail || log.actorName || "User";
      const when = row ? formatValue(row.newVal) : "";
      return when ? `${who} logged in at ${when}` : `${who} logged in`;
    }
  }

  if (rows.length === 0) {
    return `${verb} ${modelName}`;
  }

  const formatChange = (r: { field: string; oldVal: any; newVal: any }) => {
    const fieldLabel = humanizeKey(r.field);
    const oldText = formatValue(r.oldVal);
    const newText = formatValue(r.newVal);
    return `${fieldLabel} ${oldText} → ${newText}`;
  };

  const preview = rows.slice(0, 2).map(formatChange).join(", ");
  const more = rows.length > 2 ? ` (+${rows.length - 2} more changes)` : "";
  return `${verb} ${modelName}: ${preview}${more}`;
};

const ActivityLogList = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [action, setAction] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showSystemFields, setShowSystemFields] = useState(false);

  const queryParams = useMemo(() => {
    const p: Record<string, any> = {
      page,
      limit,
      sortOrder: "desc",
    };

    if (action.trim()) p.action = action.trim();
    if (actorEmail.trim()) p.actorEmail = actorEmail.trim();
    if (from) p.from = from;
    if (to) p.to = to;

    return p;
  }, [page, limit, action, actorEmail, from, to]);

  const { data, isLoading, isError } = useQuery<ActivityLogsResponse>({
    queryKey: ["activity-logs", queryParams],
    queryFn: () => get("/activity-logs", queryParams),
  });

  const logs = data?.logs || [];
  const totalPages = data?.totalPages || 1;
  const totalLogs = data?.totalLogs || 0;

  const handleOpenDetails = (log: ActivityLog) => {
    setSelectedLog(log);
    setIsDialogOpen(true);
    setShowSystemFields(false);
  };

  const handleCloseDetails = () => {
    setIsDialogOpen(false);
    setSelectedLog(null);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleRecordsPerPageChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleResetFilters = () => {
    setAction("");
    setActorEmail("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  React.useEffect(() => {
    if (isError) {
      toast.error("Failed to load activity logs");
    }
  }, [isError]);

  const selectedChanges = safeParseChanges(selectedLog?.changes);
  const changeRows = extractChangeRows(selectedChanges);
  const visibleChangeRows = showSystemFields
    ? changeRows
    : changeRows.filter((r) => !SYSTEM_FIELDS.has(r.field));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Logs</CardTitle>
        <CardDescription>Admin-only audit trail of changes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="md:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="activity-from">From date</Label>
                <Input
                  id="activity-from"
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="activity-to">To date</Label>
                <Input
                  id="activity-to"
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="activity-action">Action</Label>
            <Input
              id="activity-action"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. PLAYER_UPDATE"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="activity-actor-email">Actor email</Label>
            <Input
              id="activity-actor-email"
              value={actorEmail}
              onChange={(e) => {
                setActorEmail(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. someone@example.com"
            />
          </div>

          <div className="md:col-span-4 flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">Total: {totalLogs}</div>
            <Button type="button" variant="outline" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex items-center justify-center py-10">
                      <LoaderCircle className="w-5 h-5 animate-spin mr-2" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{log.actorName || "-"}</span>
                        <span className="text-xs text-muted-foreground">{log.actorEmail || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.entityType}</TableCell>
                    <TableCell className="whitespace-normal break-words max-w-[520px]">
                      {buildDescription(log)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDetails(log)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <CustomPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalRecords={totalLogs}
          recordsPerPage={limit}
          onRecordsPerPageChange={handleRecordsPerPageChange}
        />

        <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : handleCloseDetails())}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Activity Details</DialogTitle>
            </DialogHeader>

            {selectedLog ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Time</div>
                    <div>{selectedLog.createdAt ? new Date(selectedLog.createdAt).toLocaleString() : "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Actor</div>
                    <div>{selectedLog.actorEmail || selectedLog.actorName || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Action</div>
                    <div>{selectedLog.action}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Module/Model</div>
                    <div>
                      {selectedLog.entityType}
                      {selectedLog.entityId ? ` (#${selectedLog.entityId})` : ""}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Changes</div>
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSystemFields((v) => !v)}
                    >
                      {showSystemFields ? "Hide system fields" : "Show system fields"}
                    </Button>
                  </div>

                  {visibleChangeRows.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Field</TableHead>
                            <TableHead>Old</TableHead>
                            <TableHead>New</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleChangeRows.map((row) => (
                            <TableRow key={row.field}>
                              <TableCell className="whitespace-normal break-words align-top font-medium">
                                {row.field}
                              </TableCell>
                              <TableCell className="whitespace-normal break-words align-top text-muted-foreground">
                                {formatValue(row.oldVal)}
                              </TableCell>
                              <TableCell className="whitespace-normal break-words align-top">
                                {formatValue(row.newVal)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="border rounded-md p-3 bg-muted/30 max-h-[360px] overflow-auto">
                      <pre className="text-xs whitespace-pre-wrap">
                        {selectedChanges ? JSON.stringify(selectedChanges, null, 2) : selectedLog.changes || "-"}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No log selected</div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ActivityLogList;
