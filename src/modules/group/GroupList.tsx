import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
  ChevronDown,
  PenSquare
} from "lucide-react";
import CustomPagination from "@/components/common/custom-pagination";
import { get, put } from "@/services/apiService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const editGroupSchema = z.object({
  groupName: z.string(),
  gender: z.string(),
  age: z.string().min(1, "Age limit is required"),
  ageType: z.enum(["UNDER", "ABOVE"]).optional(),
});

const GroupList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("groupName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [editingGroup, setEditingGroup] = useState<any>(null);

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

  const form = useForm<z.infer<typeof editGroupSchema>>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: {
      groupName: "",
      gender: "",
      age: "",
      ageType: undefined,
    },
  });

  // Update mutation
  const updateGroupMutation = useMutation({
    mutationFn: (values: z.infer<typeof editGroupSchema>) => {
      // We must send the whole object generally, or at least what the backend expects
      // Using values form the form which includes proper groupName/gender from state
      return put(`/groups/${editingGroup.id}`, values);
    },
    onSuccess: () => {
      toast.success("Group updated successfully");
      setEditingGroup(null);
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update group");
    }
  });

  useEffect(() => {
    if (editingGroup) {
      form.reset({
        groupName: editingGroup.groupName,
        gender: editingGroup.gender,
        age: editingGroup.age,
        ageType: editingGroup.ageType || undefined,
      });
    }
  }, [editingGroup, form]);

  const handleEdit = (group: any) => {
    setEditingGroup(group);
  };

  const onSubmit = (values: z.infer<typeof editGroupSchema>) => {
    updateGroupMutation.mutate(values);
  };

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
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <LoaderCircle className="h-6 w-6 animate-spin mx-auto" />
                      <p className="mt-2">Loading groups...</p>
                    </TableCell>
                  </TableRow>
                ) : data?.groups?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No groups found.
                    </TableCell>
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
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(group)}
                          className="h-8 w-8"
                        >
                          <PenSquare className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
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

      {/* Edit Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Group: {editingGroup?.groupName}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Hidden Fields for required data */}
              <FormField
                control={form.control}
                name="groupName"
                render={({ field }) => <input type="hidden" {...field} />}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => <input type="hidden" {...field} />}
              />

              <FormField
                control={form.control}
                name="ageType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age Condition</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="UNDER">Under</SelectItem>
                        <SelectItem value="ABOVE">Above</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age Limit</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 18" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingGroup(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateGroupMutation.isPending}>
                  {updateGroupMutation.isPending && (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupList;