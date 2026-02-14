import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Services and utilities
import { post, put, get } from "@/services/apiService";
import Validate from "@/lib/Handlevalidation";

// Define interfaces for API responses
id: number;
groupName: string;
gender: string;
age: string;
ageType ?: "UNDER" | "ABOVE";
createdAt: string;
updatedAt: string;
}

// Create schema for group form
const groupFormSchema = z.object({
  groupName: z.string()
    .min(1, "Group name is required")
    .max(255, "Group name must not exceed 255 characters"),
  gender: z.enum(["Men", "Women", "Boys", "Girls"], {
    errorMap: () => ({ message: "Gender must be one of: Men, Women, Boys, Girls" }),
  }),
  age: z.string()
    .min(1, "Age is required")
    .max(50, "Age must not exceed 50 characters"),
  ageType: z.enum(["UNDER", "ABOVE"]).optional(),
});

// Helper to extract user-friendly message from API error
const prettifyFieldName = (key: string): string => {
  // Remove table prefix and suffix if present
  const parts = key.split("_");
  let field = parts.length > 1 ? parts[1] : key;
  // Remove trailing 'key' or 'id'
  field = field.replace(/(key|id)$/i, "");
  // Convert camelCase to spaced words
  field = field.replace(/([A-Z])/g, " $1").trim();
  // Capitalize first letter
  return field.charAt(0).toUpperCase() + field.slice(1);
};

const extractErrorMessage = (error: any): string | undefined => {
  if (error?.errors && typeof error.errors === "object") {
    const firstKey = Object.keys(error.errors)[0];
    if (firstKey) {
      const message = error.errors[firstKey]?.message as string | undefined;
      if (message) {
        const pretty = prettifyFieldName(firstKey);
        return message.replace(firstKey, pretty);
      }
    }
  }
  return error?.message;
};

type GroupFormInputs = z.infer<typeof groupFormSchema>;

interface GroupFormProps {
  mode: "create" | "edit";
  groupId?: string;
  onSuccess?: () => void;
  className?: string;
}

const GroupForm = ({
  mode,
  groupId,
  onSuccess,
  className,
}: GroupFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Initialize form with Shadcn Form
  const form = useForm<GroupFormInputs>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      groupName: "",
      gender: undefined,
      age: "",
      ageType: undefined,
    },
  });

  // Query for fetching group data in edit mode
  const { data: groupData, isLoading: isFetchingGroup, error: fetchError } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async (): Promise<GroupData> => {
      if (!groupId) throw new Error("Group ID is required");
      const response = await get(`/groups/${groupId}`);
      console.log("Group API response:", response); // Debug log
      // Handle different response structures
      return response.group || response;
    },
    enabled: mode === "edit" && !!groupId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Handle successful group fetch
  useEffect(() => {
    console.log("Group data received:", groupData); // Debug log
    if (groupData && mode === "edit") {
      console.log("Setting form values..."); // Debug log
      form.setValue("groupName", groupData.groupName || "");
      const allowedGenders = ["Men", "Women", "Boys", "Girls"] as const;
      if (groupData.gender) {
        if ((allowedGenders as readonly string[]).includes(groupData.gender)) {
          form.setValue("gender", groupData.gender as "Men" | "Women" | "Boys" | "Girls");
        } else if (["Men (A)", "Men (B)"].includes(groupData.gender)) {
          // Map legacy values to new consolidated "Men" option
          form.setValue("gender", "Men");
        }
      }
      form.setValue("age", groupData.age || "");
      if (groupData.ageType) form.setValue("ageType", groupData.ageType);
    }
  }, [groupData, mode, form]);

  // Handle fetch error
  useEffect(() => {
    if (fetchError && mode === "edit") {
      toast.error(fetchError.message || "Failed to fetch group details");
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/groups");
      }
    }
  }, [fetchError, mode, onSuccess, navigate]);

  // Mutation for creating a group
  const createGroupMutation = useMutation({
    mutationFn: (data: GroupFormInputs) => {
      return post("/groups", data);
    },
    onSuccess: () => {
      toast.success("Group created successfully");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/groups");
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
        toast.error("Failed to create group");
      }
    },
  });

  // Mutation for updating a group
  const updateGroupMutation = useMutation({
    mutationFn: (data: GroupFormInputs) => {
      return put(`/groups/${groupId}`, data);
    },
    onSuccess: () => {
      toast.success("Group updated successfully");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/groups");
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
        toast.error("Failed to update group");
      }
    },
  });

  // Handle form submission
  const onSubmit = (data: GroupFormInputs) => {
    if (mode === "create") {
      createGroupMutation.mutate(data);
    } else {
      updateGroupMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      navigate("/groups");
    }
  };

  // Combined loading group from fetch and mutations
  const isFormLoading = isFetchingGroup || createGroupMutation.isPending || updateGroupMutation.isPending;

  return (
    <div className={className}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
          <div className="grid grid-cols-3 gap-4 relative">
            {/* Group Name Field */}
            <FormField
              control={form.control}
              name="groupName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter group name"
                      {...field}
                      disabled={isFormLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gender Field */}
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Gender <span className="text-red-500">*</span></FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    disabled={isFormLoading}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Men">Men</SelectItem>
                      <SelectItem value="Women">Women</SelectItem>
                      <SelectItem value="Boys">Boys</SelectItem>
                      <SelectItem value="Girls">Girls</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Age Limit Field */}
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age Label <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Under 18"
                      {...field}
                      disabled={isFormLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Age Type Field */}
            <FormField
              control={form.control}
              name="ageType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age Condition</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    disabled={isFormLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
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
              {mode === "create" ? "Create" : "Update"} Group
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default GroupForm;