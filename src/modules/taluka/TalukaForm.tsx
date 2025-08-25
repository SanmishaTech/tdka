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
import { Taluka } from "./types";

// Create schema for taluka form
const talukaFormSchema = z.object({
  number: z
    .number()
    .min(1, "Number must be at least 1")
    .max(99, "Number must be at most 99")
    .int("Number must be a whole number"),
  abbreviation: z.string()
    .min(1, "Abbreviation is required")
    .max(10, "Abbreviation must not exceed 10 characters")
    .regex(/^[A-Z]+$/, "Abbreviation must contain only uppercase letters"),
  talukaName: z.string()
    .min(1, "Taluka name is required")
    .max(100, "Taluka name must not exceed 100 characters")
    .regex(/^[A-Za-z\s\u0900-\u097F]+$/, "Taluka name can only contain letters and spaces"),
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

type TalukaFormInputs = z.infer<typeof talukaFormSchema>;

interface TalukaFormProps {
  mode: "create" | "edit";
  talukaId?: string;
  onSuccess?: () => void;
  className?: string;
}

const TalukaForm = ({
  mode,
  talukaId,
  onSuccess,
  className,
}: TalukaFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Initialize form with Shadcn Form
  const form = useForm<TalukaFormInputs>({
    resolver: zodResolver(talukaFormSchema),
    defaultValues: {
      number: undefined,
      abbreviation: "",
      talukaName: "",
    },
  });

  // Prefill next available number in create mode
  const { data: talukaListForMax } = useQuery({
    queryKey: ["talukas", "max-number"],
    queryFn: async () => {
      const res = await get("/talukas", {
        limit: 1,
        page: 1,
        sortBy: "number",
        sortOrder: "desc",
      });
      return res;
    },
    enabled: mode === "create",
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (mode === "create" && talukaListForMax) {
      const highest = talukaListForMax.talukas?.[0]?.number ?? 0;
      const next = Math.min(highest + 1, 99);
      // Only set if user hasn't typed anything yet
      const current = form.getValues("number");
      if (current === undefined || current === null || current === ("" as any)) {
        form.setValue("number", next, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
      }
    }
  }, [talukaListForMax, mode, form]);

  // Query for fetching taluka data in edit mode
  const { data: talukaData, isLoading: isFetchingTaluka, error: fetchError } = useQuery({
    queryKey: ["taluka", talukaId],
    queryFn: async (): Promise<Taluka> => {
      if (!talukaId) throw new Error("Taluka ID is required");
      const response = await get(`/talukas/${talukaId}`);
      console.log("Taluka API response:", response); // Debug log
      // Handle different response structures
      return response.taluka || response;
    },
    enabled: mode === "edit" && !!talukaId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Handle successful taluka fetch
  useEffect(() => {
    console.log("Taluka data received:", talukaData); // Debug log
    if (talukaData && mode === "edit") {
      console.log("Setting form values..."); // Debug log
      if (talukaData.number !== undefined && talukaData.number !== null) {
        form.setValue("number", talukaData.number);
      }
      form.setValue("abbreviation", talukaData.abbreviation || "");
      form.setValue("talukaName", talukaData.talukaName || "");
    }
  }, [talukaData, mode, form]);

  // Handle fetch error
  useEffect(() => {
    if (fetchError && mode === "edit") {
      toast.error(fetchError.message || "Failed to fetch taluka details");
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/talukas");
      }
    }
  }, [fetchError, mode, onSuccess, navigate]);

  // Mutation for creating a taluka
  const createTalukaMutation = useMutation({
    mutationFn: (data: TalukaFormInputs) => {
      return post("/talukas", data);
    },
    onSuccess: () => {
      toast.success("Taluka created successfully");
      queryClient.invalidateQueries({ queryKey: ["talukas"] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/talukas");
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
        toast.error("Failed to create taluka");
      }
    },
  });

  // Mutation for updating a taluka
  const updateTalukaMutation = useMutation({
    mutationFn: (data: TalukaFormInputs) => {
      return put(`/talukas/${talukaId}`, data);
    },
    onSuccess: () => {
      toast.success("Taluka updated successfully");
      queryClient.invalidateQueries({ queryKey: ["talukas"] });
      queryClient.invalidateQueries({ queryKey: ["taluka", talukaId] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/talukas");
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
        toast.error("Failed to update taluka");
      }
    },
  });

  // Handle form submission
  const onSubmit = (data: TalukaFormInputs) => {
    // Convert abbreviation to uppercase before submission
    const submitData = {
      ...data,
      abbreviation: data.abbreviation.toUpperCase(),
    };
    
    if (mode === "create") {
      createTalukaMutation.mutate(submitData);
    } else {
      updateTalukaMutation.mutate(submitData);
    }
  };

  const handleCancel = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      navigate("/talukas");
    }
  };

  // Handle number input change to ensure it's converted to number
  const handleNumberChange = (field: any) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      field.onChange(undefined);
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        field.onChange(numValue);
      }
    }
  };

  // Combined loading taluka from fetch and mutations
  const isFormLoading = isFetchingTaluka || createTalukaMutation.isPending || updateTalukaMutation.isPending;

  return (
    <div className={className}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
          <div className="grid grid-cols-3 gap-4 relative">
            {/* Number Field */}
            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      min="1"
                      max="99"
                      placeholder="01-99" 
                      value={field.value || ""}
                      onChange={handleNumberChange(field)}
                      disabled={isFormLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Abbreviation Field */}
            <FormField
              control={form.control}
              name="abbreviation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Abbreviation <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., MH, GJ" 
                      {...field}
                      value={field.value?.toUpperCase() || ""}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      disabled={isFormLoading}
                      maxLength={10}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Taluka Name Field */}
            <FormField
              control={form.control}
              name="talukaName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taluka Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter taluka name" 
                      {...field} 
                      disabled={isFormLoading}
                      maxLength={100}
                    />
                  </FormControl>
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
              {mode === "create" ? "Create" : "Update"} Taluka
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default TalukaForm;
