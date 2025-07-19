import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle, Check, ChevronsUpDown } from "lucide-react";

// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Services and utilities
import { post, put, get } from "@/services/apiService";
import Validate from "@/lib/Handlevalidation";

// Define interfaces for API responses
interface CompetitionData {
  id: number;
  competitionName: string;
  maxPlayers: number;
  date: string;
  groups?: string[]; // Array of group IDs
  age?: string; // Legacy field, will be removed
  lastEntryDate: string;
  createdAt: string;
  updatedAt: string;
}

interface Group {
  id: number;
  groupName: string;
  gender: string;
  age: string;
}

// Create schema for competition form
const competitionFormSchema = z.object({
  competitionName: z.string()
    .min(1, "Competition name is required")
    .max(255, "Competition name must not exceed 255 characters"),
  maxPlayers: z.number()
    .min(1, "Max players must be at least 1")
    .max(1000, "Max players cannot exceed 1000"),
  date: z.string()
    .min(1, "Date is required")
    .max(255, "Date must not exceed 255 characters"),
  groups: z.array(z.string())
    .min(1, "At least one group must be selected"),
  lastEntryDate: z.string()
    .min(1, "Last entry date is required")
    .max(255, "Last entry date must not exceed 255 characters"),
});

// Helper to extract user-friendly message from API error
const prettifyFieldName = (key: string): string => {
  // Remove table prefix and suffix if present
  const parts = key.split("_");
  let field = parts.length > 1 ? parts[1] : key;
  // Remove trailing 'key' or 'id'
  field = field.replace(/(Id|Key)$/, "");
  // Convert camelCase to spaces
  return field.replace(/([A-Z])/g, " $1").toLowerCase();
};

// Helper to extract error message from API error
const extractErrorMessage = (error: any): string | null => {
  if (!error) return null;

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return null;
};
type CompetitionFormInputs = z.infer<typeof competitionFormSchema>;

interface CompetitionFormProps {
  mode: "create" | "edit";
  competitionId?: string;
  onSuccess?: () => void;
  className?: string;
}

const CompetitionForm = ({
  mode,
  competitionId,
  onSuccess,
  className,
}: CompetitionFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State for managing selected groups and popover
  const [open, setOpen] = useState(false);

  // State to track if we should keep the popover open
  const [keepOpen, setKeepOpen] = useState(false);

  // Effect to handle keeping the popover open when selecting groups
  useEffect(() => {
    if (keepOpen) {
      setOpen(true);
      setKeepOpen(false);
    }
  }, [keepOpen]);

  // Initialize form with Shadcn Form
  const form = useForm<CompetitionFormInputs>({
    resolver: zodResolver(competitionFormSchema),
    defaultValues: {
      competitionName: "",
      maxPlayers: "",
      date: "",
      groups: [],
      lastEntryDate: "",
    },
  });

  // Query to fetch all available groups
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["groups"],
    queryFn: async (): Promise<Group[]> => {
      const response = await get("/groups");
      return response.groups || response;
    },
    refetchOnWindowFocus: false,
  });

  // Query for fetching competition data in edit mode
  const { data: competitionData, isLoading: isFetchingCompetition, error: fetchError } = useQuery({
    queryKey: ["competition", competitionId],
    queryFn: async (): Promise<CompetitionData> => {
      if (!competitionId) throw new Error("Competition ID is required");
      const response = await get(`/competitions/${competitionId}`);
      console.log("Competition API response:", response); // Debug log
      // Handle different response structures
      return response.competition || response;
    },
    enabled: mode === "edit" && !!competitionId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Handle successful competition fetch
  useEffect(() => {
    console.log("Competition data received:", competitionData); // Debug log
    if (competitionData && mode === "edit") {
      console.log("Setting form values..."); // Debug log
      form.setValue("competitionName", competitionData.competitionName || "");
      form.setValue("maxPlayers", competitionData.maxPlayers || 1);
      form.setValue("date", competitionData.date || "");

      // Handle groups data - if groups exist use them, otherwise try to convert age to group
      if (competitionData.groups && competitionData.groups.length > 0) {
        form.setValue("groups", competitionData.groups);
      } else if (competitionData.age) {
        // If we have legacy age data but no groups, we'll need to handle this
        // This is a temporary solution until backend is updated
        console.log("Using legacy age field:", competitionData.age);
        // You might want to find matching groups by age or set an empty array
        form.setValue("groups", []);
      }

      form.setValue("lastEntryDate", competitionData.lastEntryDate || "");
    }
  }, [competitionData, mode, form]);

  // Handle fetch error
  useEffect(() => {
    if (fetchError && mode === "edit") {
      toast.error(fetchError.message || "Failed to fetch competition details");
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/competitions");
      }
    }
  }, [fetchError, mode, onSuccess, navigate]);

  // Mutation for creating a competition
  const createCompetitionMutation = useMutation({
    mutationFn: (data: CompetitionFormInputs) => {
      return post("/competitions", data);
    },
    onSuccess: () => {
      toast.success("Competition created successfully");
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/competitions");
      }
    },
    onError: (error: any) => {
      Validate(error, form.setError);
      const msg = extractErrorMessage(error);
      if (msg) {
        toast.error(msg);
      } else if (error.errors?.message) {
        toast.error(error.errors.message);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to create competition");
      }
    },
  });

  // Mutation for updating a competition
  const updateCompetitionMutation = useMutation({
    mutationFn: (data: CompetitionFormInputs) => {
      return put(`/competitions/${competitionId}`, data);
    },
    onSuccess: () => {
      toast.success("Competition updated successfully");
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
      queryClient.invalidateQueries({ queryKey: ["competition", competitionId] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/competitions");
      }
    },
    onError: (error: any) => {
      Validate(error, form.setError);
      const msg = extractErrorMessage(error);
      if (msg) {
        toast.error(msg);
      } else if (error.errors?.message) {
        toast.error(error.errors.message);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update competition");
      }
    },
  });

  // Handle form submission
  const onSubmit = (data: CompetitionFormInputs) => {
    if (mode === "create") {
      createCompetitionMutation.mutate(data);
    } else {
      updateCompetitionMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      navigate("/competitions");
    }
  };

  // Combined loading competition from fetch and mutations
  const isFormLoading = isFetchingCompetition || createCompetitionMutation.isPending || updateCompetitionMutation.isPending;

  return (
    <div className={className}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
          {/* Title and Date field at the top */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">
              {mode === "create" ? "Add New Competition" : "Edit Competition"}
            </h2>
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="mb-0 flex items-center">
                  <FormLabel className="mr-2 whitespace-nowrap">Date <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter date"
                      {...field}
                      disabled={isFormLoading}
                      type="date"
                      className="w-auto"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Competition Name and Last Entry Date Fields - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Competition Name Field */}
            <FormField
              control={form.control}
              name="competitionName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Competition Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter competition name"
                      {...field}
                      disabled={isFormLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Max Players Field */}
            <FormField
              control={form.control}
              name="maxPlayers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Players <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter maximum number of players"
                      {...field}
                      disabled={isFormLoading}
                      type="number"
                      min="1"
                      max="1000"
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Last Entry Date Field - Full Width */}
          <FormField
            control={form.control}
            name="lastEntryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Entry Date <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter last entry date (e.g., YYYY-MM-DD)"
                    {...field}
                    disabled={isFormLoading}
                    type="date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Groups Field - Multiselect */}
          <FormField
            control={form.control}
            name="groups"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Groups <span className="text-red-500">*</span></FormLabel>
                <div className="border rounded-md p-2">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {field.value.length > 0 ? (
                      field.value.map((groupId) => {
                        const group = groupsData?.find((g) => g.id.toString() === groupId);
                        return (
                          <Badge key={groupId} variant="secondary" className="text-xs">
                            {group?.groupName || groupId}
                            <button
                              type="button"
                              className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                              onClick={() => {
                                field.onChange(field.value.filter((val) => val !== groupId));
                              }}
                            >
                              ×
                            </button>
                          </Badge>
                        );
                      })
                    ) : (
                      <div className="text-muted-foreground text-sm">No groups selected</div>
                    )}
                  </div>

                  <div className="border-t pt-2">
                    <div className="text-sm font-medium mb-1">Available Groups:</div>
                    {isLoadingGroups ? (
                      <div className="flex items-center justify-center p-2">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        <span className="ml-2">Loading groups...</span>
                      </div>
                    ) : (
                      <div className="max-h-[200px] overflow-y-auto" style={{ maxHeight: "calc(5 * 36px)", scrollbarWidth: "none", msOverflowStyle: "none" }}>
                        {groupsData?.map((group) => {
                          const groupId = group.id.toString();
                          const isSelected = field.value.includes(groupId);
                          return (
                            <div
                              key={group.id}
                              className={cn(
                                "flex items-center px-2 py-1.5 text-sm cursor-pointer rounded-sm",
                                isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                              )}
                              onClick={() => {
                                // Toggle the selection
                                const currentValues = [...field.value];
                                const newValues = isSelected
                                  ? currentValues.filter(id => id !== groupId)
                                  : [...currentValues, groupId];

                                // Update the form value directly
                                field.onChange(newValues);
                              }}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <div className={cn(
                                  "w-4 h-4 border rounded flex items-center justify-center",
                                  isSelected ? "bg-primary border-primary" : "border-input"
                                )}>
                                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>
                                <span>{group.groupName}</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {group.gender}, {group.age}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Form Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isFormLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isFormLoading}>
              {isFormLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create" : "Update"} Competition
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CompetitionForm;