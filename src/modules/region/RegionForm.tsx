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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Services and utilities
import { post, put, get } from "@/services/apiService";
import Validate from "@/lib/Handlevalidation";
import { Region, Taluka } from "./types";

// Create schema for region form
const regionFormSchema = z.object({
  number: z
    .number()
    .min(1, "Number must be at least 1")
    .max(99, "Number must be at most 99")
    .int("Number must be a whole number"),
  abbreviation: z.string()
    .min(1, "Abbreviation is required")
    .max(10, "Abbreviation must not exceed 10 characters")
    .regex(/^[A-Z]+$/, "Abbreviation must contain only uppercase letters"),
  regionName: z.string()
    .min(1, "Region name is required")
    .max(100, "Region name must not exceed 100 characters")
    .regex(/^[A-Za-z\s\u0900-\u097F]+$/, "Region name can only contain letters and spaces"),
  talukaId: z.number()
    .min(1, "Please select a taluka")
    .int("Invalid taluka selection"),
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

type RegionFormInputs = z.infer<typeof regionFormSchema>;

interface RegionFormProps {
  mode: "create" | "edit";
  regionId?: string;
  onSuccess?: () => void;
  className?: string;
}

const RegionForm = ({
  mode,
  regionId,
  onSuccess,
  className,
}: RegionFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Initialize form with Shadcn Form
  const form = useForm<RegionFormInputs>({
    resolver: zodResolver(regionFormSchema),
    defaultValues: {
      number: undefined,
      abbreviation: "",
      regionName: "",
      talukaId: undefined,
    },
  });

  // Prefill next available number in create mode
  const { data: regionListForMax } = useQuery({
    queryKey: ["regions", "max-number"],
    queryFn: async () => {
      const res = await get("/regions", {
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
    if (mode === "create" && regionListForMax) {
      const highest = regionListForMax.regions?.[0]?.number ?? 0;
      const next = Math.min(highest + 1, 99);
      const current = form.getValues("number");
      if (current === undefined || current === null || current === ("" as any)) {
        form.setValue("number", next, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
      }
    }
  }, [regionListForMax, mode, form]);

  // Query for fetching talukas for dropdown
  const { data: talukas, isLoading: isLoadingTalukas } = useQuery<Taluka[]>({
    queryKey: ["talukas-dropdown"],
    queryFn: async () => {
      const response = await get("/regions/talukas");
      return response;
    },
    refetchOnWindowFocus: false,
  });

  // Query for fetching region data in edit mode
  const { data: regionData, isLoading: isFetchingRegion, error: fetchError } = useQuery({
    queryKey: ["region", regionId],
    queryFn: async (): Promise<Region> => {
      if (!regionId) throw new Error("Region ID is required");
      const response = await get(`/regions/${regionId}`);
      console.log("Region API response:", response); // Debug log
      // Handle different response structures
      return response.region || response;
    },
    enabled: mode === "edit" && !!regionId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Handle successful region fetch
  useEffect(() => {
    console.log("Region data received:", regionData); // Debug log
    if (regionData && mode === "edit") {
      console.log("Setting form values..."); // Debug log
      if (regionData.number !== undefined && regionData.number !== null) {
        form.setValue("number", regionData.number);
      }
      form.setValue("abbreviation", regionData.abbreviation || "");
      form.setValue("regionName", regionData.regionName || "");
      if (regionData.talukaId !== undefined && regionData.talukaId !== null) {
        form.setValue("talukaId", regionData.talukaId);
      }
    }
  }, [regionData, mode, form]);

  // Handle fetch error
  useEffect(() => {
    if (fetchError && mode === "edit") {
      toast.error(fetchError.message || "Failed to fetch region details");
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/regions");
      }
    }
  }, [fetchError, mode, onSuccess, navigate]);

  // Mutation for creating a region
  const createRegionMutation = useMutation({
    mutationFn: (data: RegionFormInputs) => {
      return post("/regions", data);
    },
    onSuccess: () => {
      toast.success("Region created successfully");
      queryClient.invalidateQueries({ queryKey: ["regions"] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/regions");
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
        toast.error("Failed to create region");
      }
    },
  });

  // Mutation for updating a region
  const updateRegionMutation = useMutation({
    mutationFn: (data: RegionFormInputs) => {
      return put(`/regions/${regionId}`, data);
    },
    onSuccess: () => {
      toast.success("Region updated successfully");
      queryClient.invalidateQueries({ queryKey: ["regions"] });
      queryClient.invalidateQueries({ queryKey: ["region", regionId] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/regions");
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
        toast.error("Failed to update region");
      }
    },
  });

  // Handle form submission
  const onSubmit = (data: RegionFormInputs) => {
    // Convert abbreviation to uppercase before submission
    const submitData = {
      ...data,
      abbreviation: data.abbreviation.toUpperCase(),
    };
    
    if (mode === "create") {
      createRegionMutation.mutate(submitData);
    } else {
      updateRegionMutation.mutate(submitData);
    }
  };

  const handleCancel = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      navigate("/regions");
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

  // Combined loading from fetch and mutations
  const isFormLoading = isFetchingRegion || createRegionMutation.isPending || updateRegionMutation.isPending;

  return (
    <div className={className}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
          <div className="grid grid-cols-2 gap-4 relative">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Region Name Field */}
            <FormField
              control={form.control}
              name="regionName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter region name" 
                      {...field} 
                      disabled={isFormLoading}
                      maxLength={100}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Taluka Selection Field */}
            <FormField
              control={form.control}
              name="talukaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taluka <span className="text-red-500">*</span></FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value, 10))}
                    value={field.value ? field.value.toString() : ""}
                    disabled={isFormLoading || isLoadingTalukas}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingTalukas ? "Loading talukas..." : "Select a taluka"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {talukas?.map((taluka) => (
                        <SelectItem key={taluka.id} value={taluka.id.toString()}>
                          {String(taluka.number).padStart(2, '0')} - {taluka.talukaName} ({taluka.abbreviation})
                        </SelectItem>
                      ))}
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
              {mode === "create" ? "Create" : "Update"} Region
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default RegionForm;
