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
} from "@/components/ui/select";

// Services and utilities
import { post, put, get } from "@/services/apiService";
import { Region, Place } from "./types";

// Create schema for place form
const placeFormSchema = z.object({
  number: z
    .number()
    .min(1, "Number must be at least 1")
    .max(99, "Number must be at most 99")
    .int("Number must be a whole number"),
  abbreviation: z.string()
    .min(1, "Abbreviation is required")
    .max(10, "Abbreviation must not exceed 10 characters")
    .regex(/^[A-Z]+$/, "Abbreviation must contain only uppercase letters"),
  placeName: z.string()
    .min(1, "Place name is required")
    .max(100, "Place name must not exceed 100 characters")
    .regex(/^[A-Za-z\s\u0900-\u097F]+$/, "Place name can only contain letters and spaces"),
  regionId: z.number()
    .min(1, "Please select a region")
    .int("Invalid region selection"),
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

type PlaceFormInputs = z.infer<typeof placeFormSchema>;

interface PlaceFormProps {
  mode: "create" | "edit";
  placeId?: string;
  onSuccess?: () => void;
  className?: string;
}

const PlaceForm = ({
  mode,
  placeId,
  onSuccess,
  className,
}: PlaceFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Initialize form with Shadcn Form
  const form = useForm<PlaceFormInputs>({
    resolver: zodResolver(placeFormSchema),
    defaultValues: {
      number: undefined,
      abbreviation: "",
      placeName: "",
      regionId: undefined,
    },
  });

  // Prefill next available number in create mode
  const { data: placeListForMax } = useQuery({
    queryKey: ["places", "max-number"],
    queryFn: async () => {
      const res = await get("/places", {
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
    if (mode === "create" && placeListForMax) {
      const highest = placeListForMax.places?.[0]?.number ?? 0;
      const next = Math.min(highest + 1, 99);
      const current = form.getValues("number");
      if (current === undefined || current === null || current === ("" as any)) {
        form.setValue("number", next, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
      }
    }
  }, [placeListForMax, mode, form]);

  // Query for fetching regions for dropdown
  const { data: regions, isLoading: isLoadingRegions } = useQuery<Region[]>({
    queryKey: ["regions-dropdown"],
    queryFn: async () => {
      const response = await get("/places/regions");
      return response;
    },
    refetchOnWindowFocus: false,
  });

  // Query for fetching place data in edit mode
  const { data: placeData, isLoading: isFetchingPlace, error: fetchError } = useQuery({
    queryKey: ["place", placeId],
    queryFn: async (): Promise<Place> => {
      if (!placeId) throw new Error("Place ID is required");
      const response = await get(`/places/${placeId}`);
      console.log("Place API response:", response); // Debug log
      // Handle different response structures
      return response.place || response;
    },
    enabled: mode === "edit" && !!placeId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Handle successful place fetch
  useEffect(() => {
    console.log("Place data received:", placeData); // Debug log
    if (placeData && mode === "edit") {
      console.log("Setting form values..."); // Debug log
      form.reset({
        number: placeData.number ?? undefined,
        abbreviation: placeData.abbreviation || "",
        placeName: placeData.placeName || "",
        regionId:
          placeData.regionId !== undefined && placeData.regionId !== null
            ? Number(placeData.regionId)
            : undefined,
      });
    }
  }, [placeData, mode, form]);

  // Handle fetch error
  useEffect(() => {
    if (fetchError && mode === "edit") {
      toast.error(fetchError.message || "Failed to fetch place details");
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/talukas");
      }
    }
  }, [fetchError, mode, onSuccess, navigate]);

  // Mutation for creating a place
  const createPlaceMutation = useMutation({
    mutationFn: (data: PlaceFormInputs) => {
      return post("/places", data);
    },
    onSuccess: () => {
      toast.success("Place created successfully");
      queryClient.invalidateQueries({ queryKey: ["places"] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/talukas");
      }
    },
    onError: (error: any) => {
      const message = extractErrorMessage(error) || "Failed to create place";
      toast.error(message);
    },
  });

  // Mutation for updating a place
  const updatePlaceMutation = useMutation({
    mutationFn: (data: PlaceFormInputs) => {
      if (!placeId) throw new Error("Place ID is required");
      return put(`/places/${placeId}`, data);
    },
    onSuccess: () => {
      toast.success("Place updated successfully");
      queryClient.invalidateQueries({ queryKey: ["places"] });
      queryClient.invalidateQueries({ queryKey: ["place", placeId] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/talukas");
      }
    },
    onError: (error: any) => {
      const message = extractErrorMessage(error) || "Failed to update place";
      toast.error(message);
    },
  });

  // Handle form submission
  const onSubmit = async (data: PlaceFormInputs) => {
    try {
      if (mode === "create") {
        await createPlaceMutation.mutateAsync(data);
      } else {
        await updatePlaceMutation.mutateAsync(data);
      }
    } catch (error) {
      // Error handling is done in mutation onError
    }
  };

  const isLoading = isFetchingPlace || isLoadingRegions;
  const isSubmitting = createPlaceMutation.isPending || updatePlaceMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoaderCircle className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Number Field */}
            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      placeholder="Enter 2-digit number"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? undefined : Number(value));
                      }}
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
                  <FormLabel>Abbreviation *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter abbreviation (e.g., PUN)"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e.target.value.toUpperCase());
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Place Name Field */}
          <FormField
            control={form.control}
            name="placeName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Place Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter full place name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Region Selection */}
          <FormField
            control={form.control}
            name="regionId"
            render={({ field }) => {
              const effectiveId = field.value ?? placeData?.regionId;
              const idNum = Number(effectiveId);
              const r = Number.isFinite(idNum) && idNum > 0
                ? regions?.find((x) => x.id === idNum)
                : undefined;
              const fallbackRegion = placeData?.region;
              const label = r
                ? `${String(r.number).padStart(2, "0")} ${r.regionName} (${r.abbreviation})`
                : fallbackRegion
                  ? `${String(fallbackRegion.number).padStart(2, "0")} ${fallbackRegion.regionName} (${fallbackRegion.abbreviation})`
                  : "";
              const selectValue = effectiveId !== undefined && effectiveId !== null && effectiveId !== ""
                ? String(effectiveId)
                : "";

              return (
                <FormItem>
                  <FormLabel>Region *</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={selectValue}
                    disabled={isLoadingRegions}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        {label ? (
                          <span>{label}</span>
                        ) : (
                          <span className="text-muted-foreground">
                            {isLoadingRegions ? "Loading regions..." : "Select a region"}
                          </span>
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="z-[100]">
                      {regions?.map((region) => (
                        <SelectItem
                          key={region.id}
                          value={String(region.id)}
                          textValue={`${String(region.number).padStart(2, "0")} ${region.regionName} (${region.abbreviation})`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {String(region.number).padStart(2, "0")}
                            </span>
                            <span>{region.regionName}</span>
                            <span className="text-muted-foreground text-sm">({region.abbreviation})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (onSuccess) {
                  onSuccess();
                } else {
                  navigate("/talukas");
                }
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isValid}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                  {mode === "create" ? "Creating..." : "Updating..."}
                </>
              ) : (
                mode === "create" ? "Create Place" : "Update Place"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PlaceForm;
