import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle, Check, ArrowLeft } from "lucide-react";

// PrimeReact Editor
import { Editor } from 'primereact/editor';

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
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Services and utilities
import { post, put, get } from "@/services/apiService";
import Validate from "@/lib/Handlevalidation";

// Define interfaces for API responses
interface CompetitionData {
  id: number;
  competitionName: string;
  maxPlayers: number;
  fromDate: string;
  toDate: string;
  groups?: (string | Group)[]; // Array of group IDs or group objects
  clubs?: (string | Club)[]; // Array of club IDs or club objects
  age?: string; // Legacy field, will be removed
  lastEntryDate: string;
  ageEligibilityDate?: string; // Reference date for age calculations
  weight?: string;
  address?: string; // Venue address
  rules?: string; // Competition rules as rich text HTML
  createdAt: string;
  updatedAt: string;
}

interface Group {
  id: number;
  groupName: string;
  gender: string;
  age: string;
}

interface Club {
  id: number;
  clubName: string;
  city: string;
}

// Create schema for competition form
const competitionFormSchema = z.object({
  competitionName: z.string()
    .min(1, "Competition name is required")
    .max(255, "Competition name must not exceed 255 characters"),
  maxPlayers: z.number()
    .min(10, "Max players must be at least 10")
    .max(14, "Max players cannot exceed 14"),
  fromDate: z.string()
    .min(1, "From date is required")
    .max(255, "From date must not exceed 255 characters"),
  toDate: z.string()
    .min(1, "To date is required")
    .max(255, "To date must not exceed 255 characters"),
  groups: z.array(z.string())
    .min(1, "At least one group must be selected"),
  clubs: z.array(z.string())
    .optional(),
  lastEntryDate: z.string()
    .min(1, "Last entry date is required")
    .max(255, "Last entry date must not exceed 255 characters"),
  rules: z.string().optional(),
  ageEligibilityDate: z.string()
    .min(1, "Age eligibility date is required")
    .max(255, "Age eligibility date must not exceed 255 characters"),
  weight: z.string().max(255, "Weight must not exceed 255 characters").optional(),
  address: z.string().optional(),
});

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

  const [clubSearch, setClubSearch] = useState("");

  // Initialize form with Shadcn Form
  const form = useForm<CompetitionFormInputs>({
    resolver: zodResolver(competitionFormSchema),
    defaultValues: {
      competitionName: "",
      maxPlayers: 10,
      fromDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      toDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      groups: [],
      clubs: [],
      lastEntryDate: "",
      rules: "",
      ageEligibilityDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      weight: "",
      address: "",
    },
  });

  // Function to calculate age category based on eligibility date
  const calculateAgeCategory = (eligibilityDate: string) => {
    if (!eligibilityDate) return null;

    const eligibility = new Date(eligibilityDate);
    const today = new Date();

    // Calculate the age of someone born on the eligibility date as of today
    let calculatedAge = today.getFullYear() - eligibility.getFullYear();
    const monthDiff = today.getMonth() - eligibility.getMonth();
    const dayDiff = today.getDate() - eligibility.getDate();

    // Adjust for month/day differences
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      calculatedAge--;
    }

    // Make sure age is positive (in case eligibility date is in the future)
    calculatedAge = Math.abs(calculatedAge);

    // Common age categories for sports competitions
    const ageGroups = [8, 10, 12, 14, 16, 18, 20, 21, 23, 25, 30, 35, 40, 45, 50];

    // Find the next higher age limit to create "Under X" category
    let categoryAge = calculatedAge + 1;

    // Find the appropriate "Under X" category by looking for the next age group
    for (const ageLimit of ageGroups) {
      if (calculatedAge < ageLimit) {
        categoryAge = ageLimit;
        break;
      }
    }

    // If older than all predefined categories, use a higher category
    if (calculatedAge >= 50) {
      categoryAge = Math.ceil((calculatedAge + 5) / 5) * 5; // Round up to nearest 5
    }

    return {
      category: `Under ${categoryAge}`,
      age: calculatedAge,
      description: `Players born on or after ${eligibility.toLocaleDateString()} (currently ${calculatedAge} years old) qualify for Under ${categoryAge} category`,
      eligibilityDate: eligibility.toLocaleDateString()
    };
  };

  // Query to fetch all available groups
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["groups"],
    queryFn: async (): Promise<Group[]> => {
      const response = await get("/groups");
      return response.groups || response;
    },
    refetchOnWindowFocus: false,
  });

  // Watch the age eligibility date to update category
  const ageEligibilityDate = form.watch("ageEligibilityDate");
  const ageCategory = calculateAgeCategory(ageEligibilityDate);
  const selectedGroupIds = form.watch("groups");
  const selectedGroups = (selectedGroupIds || []).map((groupId) =>
    groupsData?.find((g) => g.id.toString() === groupId)
  );
  const hasMenOrWomenGroupSelected = selectedGroups.some((g) => {
    const name = String(g?.groupName || "").trim().toLowerCase();
    return name === "men" || name === "women";
  });

  // Query to fetch all available clubs
  const { data: clubsData, isLoading: isLoadingClubs } = useQuery({
    queryKey: ["clubs"],
    queryFn: async (): Promise<Club[]> => {
      const response = await get("/clubs", {
        page: 1,
        limit: 5000,
        sortBy: "clubName",
        sortOrder: "asc",
      });
      return response.clubs || response;
    },
    refetchOnWindowFocus: false,
  });

  const normalizedClubSearch = clubSearch.trim().toLowerCase();
  const filteredClubs = (clubsData || []).filter((club) => {
    if (!normalizedClubSearch) return true;
    const name = (club.clubName || "").toLowerCase();
    const city = (club.city || "").toLowerCase();
    return name.includes(normalizedClubSearch) || city.includes(normalizedClubSearch);
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
      form.setValue("maxPlayers", competitionData.maxPlayers || 10);
      form.setValue("fromDate", competitionData.fromDate || "");
      form.setValue("toDate", competitionData.toDate || "");

      // Handle groups data - convert objects to IDs if needed
      if (competitionData.groups && competitionData.groups.length > 0) {
        // Check if groups are objects or strings
        const groupIds = competitionData.groups.map((group: any) => {
          // If it's an object with id property, extract the id
          if (typeof group === 'object' && group.id) {
            return group.id.toString();
          }
          // If it's already a string, use it as is
          return group.toString();
        });
        form.setValue("groups", groupIds);
      } else if (competitionData.age) {
        // If we have legacy age data but no groups, we'll need to handle this
        // This is a temporary solution until backend is updated
        console.log("Using legacy age field:", competitionData.age);
        // You might want to find matching groups by age or set an empty array
        form.setValue("groups", []);
      }

      // Handle clubs data - convert objects to IDs if needed
      if (competitionData.clubs && competitionData.clubs.length > 0) {
        // Check if clubs are objects or strings
        const clubIds = competitionData.clubs.map((club: any) => {
          // If it's an object with id property, extract the id
          if (typeof club === 'object' && club.id) {
            return club.id.toString();
          }
          // If it's already a string, use it as is
          return club.toString();
        });
        form.setValue("clubs", clubIds);
      } else {
        form.setValue("clubs", []);
      }

      form.setValue("lastEntryDate", competitionData.lastEntryDate || "");
      form.setValue("rules", competitionData.rules || "");
      form.setValue("ageEligibilityDate", competitionData.ageEligibilityDate || new Date().toISOString().split('T')[0]);
      form.setValue("weight", competitionData.weight || "");
      form.setValue("address", competitionData.address || "");
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
    <div className={`p-6 ${className || ''}`}>
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <h1 className="text-2xl font-bold text-center flex-1">
          {mode === "create" ? "Create Competition" : "Update Competition"}
        </h1>

        {/* Empty div for balance */}
        <div className="w-20"></div>
      </div>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            {mode === "create" ? "Add New Competition" : "Edit Competition"}
          </CardTitle>
          <CardDescription>
            {mode === "create" ? "Create a new competition with groups and clubs" : "Update competition details"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
              {/* Date Fields - Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* From Date Field */}
                <FormField
                  control={form.control}
                  name="fromDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Date <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter from date"
                          {...field}
                          disabled={isFormLoading}
                          type="date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* To Date Field */}
                <FormField
                  control={form.control}
                  name="toDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Date <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter to date"
                          {...field}
                          disabled={isFormLoading}
                          type="date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {hasMenOrWomenGroupSelected && (
                <div className="border rounded-md p-3 bg-muted/50 text-sm text-muted-foreground">
                  Note: For Men/Women competitions, clubs may include at most 3 U18 (age 18 or below) players within the max player limit.
                </div>
              )}
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
                          min="10"
                          max="14"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground mt-1">
                        Allowed range: 10–14 Players + Coach + manager.
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Last Entry Date and Age Eligibility Date Fields - Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Last Entry Date Field */}
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

                {/* Age Eligibility Date Field */}
                <FormField
                  control={form.control}
                  name="ageEligibilityDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age Eligibility Date <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Select age eligibility reference date"
                          {...field}
                          disabled={isFormLoading}
                          type="date"
                        />
                      </FormControl>
                      {/* Computed Age + Helper (inline) */}
                      <div className="text-xs text-muted-foreground mt-1">
                        {ageEligibilityDate && ageCategory ? `Age: ${ageCategory.age}, ` : ''}Select a reference date for age calculation. Players born on or after this date will be eligible for the calculated age category.
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Weight Field */}
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter weight"
                          {...field}
                          disabled={isFormLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address Field */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter venue address"
                          {...field}
                          disabled={isFormLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                          <div className="max-h-[200px] overflow-y-scroll" style={{ maxHeight: "calc(5 * 36px)" }}>
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

              {/* Clubs Field - Multiselect */}
              <FormField
                control={form.control}
                name="clubs"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Participating Clubs</FormLabel>
                    <div className="border rounded-md p-2">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {field.value && field.value.length > 0 ? (
                          field.value.map((clubId) => {
                            const club = clubsData?.find((c) => c.id.toString() === clubId);
                            return (
                              <Badge key={clubId} variant="secondary" className="text-xs">
                                {club?.clubName || clubId}
                                <button
                                  type="button"
                                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                  onClick={() => {
                                    field.onChange(field.value?.filter((val) => val !== clubId) || []);
                                  }}
                                >
                                  ×
                                </button>
                              </Badge>
                            );
                          })
                        ) : (
                          <div className="text-muted-foreground text-sm">No clubs selected</div>
                        )}
                      </div>

                      <div className="border-t pt-2">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="text-sm font-medium">Available Clubs:</div>
                          <div className="flex items-center gap-3">
                            <div className="text-xs text-muted-foreground">
                              Selected: {field.value?.length || 0}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isFormLoading || filteredClubs.length === 0}
                              onClick={() => {
                                const filteredIds = filteredClubs.map((c) => c.id.toString());
                                const current = Array.isArray(field.value) ? field.value : [];
                                const merged = Array.from(new Set([...current, ...filteredIds]));
                                field.onChange(merged);
                              }}
                            >
                              Select all
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isFormLoading || (field.value?.length || 0) === 0}
                              onClick={() => {
                                const filteredIds = new Set(filteredClubs.map((c) => c.id.toString()));
                                const current = Array.isArray(field.value) ? field.value : [];
                                const next = current.filter((id) => !filteredIds.has(id));
                                field.onChange(next);
                              }}
                            >
                              Deselect all
                            </Button>
                          </div>
                        </div>
                        <div className="mb-2">
                          <Input
                            placeholder="Search clubs..."
                            value={clubSearch}
                            onChange={(e) => setClubSearch(e.target.value)}
                            disabled={isFormLoading}
                          />
                        </div>
                        {isLoadingClubs ? (
                          <div className="flex items-center justify-center p-2">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            <span className="ml-2">Loading clubs...</span>
                          </div>
                        ) : (
                          <div className="max-h-[240px] overflow-y-auto pr-1">
                            {filteredClubs.length === 0 ? (
                              <div className="text-sm text-muted-foreground px-2 py-1.5">
                                No clubs found
                              </div>
                            ) : null}
                            {filteredClubs.map((club) => {
                              const clubId = club.id.toString();
                              const isSelected = field.value?.includes(clubId) || false;
                              return (
                                <div
                                  key={club.id}
                                  className={cn(
                                    "flex items-center px-2 py-1.5 text-sm cursor-pointer rounded-sm",
                                    isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                                  )}
                                  onClick={() => {
                                    // Toggle the selection
                                    const currentValues = [...(field.value || [])];
                                    const newValues = isSelected
                                      ? currentValues.filter(id => id !== clubId)
                                      : [...currentValues, clubId];

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
                                    <span>{club.clubName}</span>
                                    <span className="ml-auto text-xs text-muted-foreground">
                                      {club.city}
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

              {/* Rules Field - Rich Text Editor */}
              <FormField
                control={form.control}
                name="rules"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competition Rules</FormLabel>
                    <FormControl>
                      <div className="border rounded-md">
                        <Editor
                          value={field.value || ''}
                          onTextChange={(e) => field.onChange(e.htmlValue)}
                          style={{ height: '320px' }}
                          disabled={isFormLoading}
                          placeholder="Enter competition rules and regulations..."
                        />
                      </div>
                    </FormControl>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default CompetitionForm;