import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle, Check } from "lucide-react";

// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Services and utilities
import { get, post, put, postupload, putupload } from "@/services/apiService";
import Validate from "@/lib/Handlevalidation";

// Define interfaces for API responses
interface PlayerData {
  id: number;
  uniqueIdNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  profileImage?: string;
  dateOfBirth: string;
  position?: string;
  address: string;
  mobile: string;
  aadharNumber: string;
  aadharImage?: string;
  aadharVerified: boolean;
  isSuspended: boolean;
  groups: Group[];
  createdAt: string;
  updatedAt: string;
}

interface Group {
  id: number;
  groupName: string;
  gender: string;
  age: string;
}

// Create schema for player form
const playerFormSchemaBase = z.object({
  firstName: z.string()
    .min(1, "First name is required")
    .max(100, "First name must not exceed 100 characters")
    .refine(val => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
      message: "First name can only contain letters",
    }),
  middleName: z.string()
    .max(100, "Middle name must not exceed 100 characters")
    .refine(val => !val || /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
      message: "Middle name can only contain letters",
    })
    .optional(),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(100, "Last name must not exceed 100 characters")
    .refine(val => /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
      message: "Last name can only contain letters",
    }),
  dateOfBirth: z.string()
    .min(1, "Date of birth is required"),
  position: z.string()
    .max(100, "Position must not exceed 100 characters")
    .optional(),
  address: z.string()
    .min(1, "Address is required"),
  mobile: z.string()
    .min(10, "Mobile number must be at least 10 digits")
    .max(15, "Mobile number must not exceed 15 digits")
    .refine(val => /^\d+$/.test(val), {
      message: "Mobile number can only contain digits",
    }),
  groupIds: z.array(z.string())
    .min(1, "At least one group must be selected"),
});

// Add aadharNumber validation for create mode
const playerFormSchemaCreate = playerFormSchemaBase.extend({
  aadharNumber: z.string()
    .length(12, "Aadhar number must be exactly 12 digits")
    .refine(val => /^\d+$/.test(val), {
      message: "Aadhar number can only contain digits",
    })
});

// Make aadharNumber optional for edit mode
const playerFormSchemaEdit = playerFormSchemaBase.extend({
  aadharNumber: z.string()
    .length(12, "Aadhar number must be exactly 12 digits")
    .refine(val => /^\d+$/.test(val), {
      message: "Aadhar number can only contain digits",
    })
    .optional()
});

// Helper to extract error message from API error
const extractErrorMessage = (error: any): string | undefined => {
  if (error?.errors && typeof error.errors === "object") {
    const firstKey = Object.keys(error.errors)[0];
    if (firstKey) {
      const message = error.errors[firstKey]?.message as string | undefined;
      if (message) {
        return message;
      }
    }
  }
  return error?.message;
};

type PlayerFormInputs = z.infer<typeof playerFormSchemaCreate>;

interface PlayerFormProps {
  mode: "create" | "edit";
  playerId?: string;
  onSuccess?: () => void;
  className?: string;
}

const PlayerForm = ({
  mode,
  playerId,
  onSuccess,
  className,
}: PlayerFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Initialize form with Shadcn Form
  const form = useForm<PlayerFormInputs>({
    resolver: zodResolver(mode === "create" ? playerFormSchemaCreate : playerFormSchemaEdit),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      dateOfBirth: "",
      position: "",
      address: "",
      mobile: "",
      aadharNumber: "",
      groupIds: [],
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

  // Query for fetching player data in edit mode
  const { data: playerData, isLoading: isFetchingPlayer, error: fetchError } = useQuery({
    queryKey: ["player", playerId],
    queryFn: async (): Promise<PlayerData> => {
      if (!playerId) throw new Error("Player ID is required");
      const response = await get(`/players/${playerId}`);
      return response.player || response;
    },
    enabled: mode === "edit" && !!playerId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Handle successful player fetch
  useEffect(() => {
    if (playerData && mode === "edit") {
      form.setValue("firstName", playerData.firstName || "");
      form.setValue("middleName", playerData.middleName || "");
      form.setValue("lastName", playerData.lastName || "");
      form.setValue("dateOfBirth", playerData.dateOfBirth.split('T')[0] || "");
      form.setValue("position", playerData.position || "");
      form.setValue("address", playerData.address || "");
      form.setValue("mobile", playerData.mobile || "");
      form.setValue("aadharNumber", playerData.aadharNumber || "");
      
      // Set group IDs
      if (playerData.groups && playerData.groups.length > 0) {
        form.setValue("groupIds", playerData.groups.map(group => group.id.toString()));
      }
    }
  }, [playerData, mode, form]);

  // Handle fetch error
  useEffect(() => {
    if (fetchError && mode === "edit") {
      toast.error(fetchError.message || "Failed to fetch player details");
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/players");
      }
    }
  }, [fetchError, mode, onSuccess, navigate]);



  // Mutation for creating a player
  const createPlayerMutation = useMutation({
    mutationFn: (data: PlayerFormInputs) => {
      // Create JSON payload
      const payload = {
        firstName: data.firstName,
        middleName: data.middleName || null,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        position: data.position || null,
        address: data.address,
        mobile: data.mobile,
        aadharNumber: data.aadharNumber,
        groupIds: data.groupIds.map(id => parseInt(id))
      };
      
      return post("/players", payload);
    },
    onSuccess: () => {
      toast.success("Player created successfully");
      queryClient.invalidateQueries({ queryKey: ["players"] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/players");
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
        toast.error("Failed to create player");
      }
    },
  });

  // Mutation for updating a player
  const updatePlayerMutation = useMutation({
    mutationFn: (data: PlayerFormInputs) => {
      // Create JSON payload
      const payload = {
        firstName: data.firstName,
        middleName: data.middleName || null,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        position: data.position || null,
        address: data.address,
        mobile: data.mobile,
        aadharNumber: data.aadharNumber || null,
        groupIds: data.groupIds.map(id => parseInt(id))
      };
      
      return put(`/players/${playerId}`, payload);
    },
    onSuccess: () => {
      toast.success("Player updated successfully");
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["player", playerId] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/players");
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
        toast.error("Failed to update player");
      }
    },
  });

  // Handle form submission
  const onSubmit = (data: PlayerFormInputs) => {
    if (mode === "create") {
      createPlayerMutation.mutate(data);
    } else {
      updatePlayerMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      navigate("/players");
    }
  };

  // Combined loading player from fetch and mutations
  const isFormLoading = isFetchingPlayer || createPlayerMutation.isPending || updatePlayerMutation.isPending;

  return (
    <div className={className}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            
            {/* Name Fields - First, Middle, Last in a row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* First Name Field */}
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter first name"
                        {...field}
                        disabled={isFormLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Middle Name Field */}
              <FormField
                control={form.control}
                name="middleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Middle Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter middle name"
                        {...field}
                        disabled={isFormLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Last Name Field */}
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter last name"
                        {...field}
                        disabled={isFormLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date of Birth and Position Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date of Birth Field */}
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter date of birth"
                        {...field}
                        disabled={isFormLoading}
                        type="date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Position Field */}
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter position"
                        {...field}
                        disabled={isFormLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address Field */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter address"
                      {...field}
                      disabled={isFormLoading}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mobile and Aadhar Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mobile Field */}
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter mobile number"
                        {...field}
                        disabled={isFormLoading}
                        maxLength={15}
                        type="tel"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Aadhar Number Field */}
              <FormField
                control={form.control}
                name="aadharNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Aadhar Number
                      {mode === "create" && <span className="text-red-500">*</span>}
                      {mode === "edit" && <span className="text-sm text-muted-foreground ml-2">(Cannot be changed)</span>}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter 12-digit Aadhar number"
                        {...field}
                        disabled={isFormLoading || mode === "edit"}
                        maxLength={12}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>



          {/* Groups Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Groups</h3>
            
            {/* Groups Field - Multiselect */}
            <FormField
              control={form.control}
              name="groupIds"
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
                        <div className="max-h-[200px] overflow-y-auto">
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
                                <div className={cn(
                                  "w-4 h-4 border rounded flex items-center justify-center",
                                  isSelected ? "bg-primary border-primary" : "border-input"
                                )}>
                                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>
                                <span className="ml-2">{group.groupName}</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {group.gender}, {group.age}
                                </span>
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
          </div>

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
              {mode === "create" ? "Create" : "Update"} Player
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PlayerForm;