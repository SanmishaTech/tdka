import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle, ArrowLeft } from "lucide-react";

// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

// Define interfaces for API responses
interface Taluka {
  id: number;
  number: number;
  abbreviation: string;
  talukaName: string;
}

interface Region {
  id: number;
  number: number;
  abbreviation: string;
  regionName: string;
  taluka: Taluka;
}

interface ClubData {
  id: number;
  clubName: string;
  affiliationNumber: string;
  uniqueNumber?: string;
  regionId?: number;
  city: string;
  address: string;
  mobile: string;
  email: string;
  
  // President details
  presidentName?: string;
  presidentMobile?: string;
  presidentEmail?: string;
  presidentAadhar?: string;
  
  // Secretary details
  secretaryName?: string;
  secretaryMobile?: string;
  secretaryEmail?: string;
  secretaryAadhar?: string;
  
  // Treasurer details
  treasurerName?: string;
  treasurerMobile?: string;
  treasurerEmail?: string;
  treasurerAadhar?: string;
  
  // Coach details
  coachName?: string;
  coachMobile?: string;
  coachEmail?: string;
  coachAadhar?: string;
  
  // Manager details
  managerName?: string;
  managerMobile?: string;
  managerEmail?: string;
  managerAadhar?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Create separate schemas for create and edit modes
const clubFormSchemaBase = z.object({
  clubName: z.string()
    .min(1, "Club name is required")
    .max(255, "Club name must not exceed 255 characters"),
  affiliationNumber: z.string()
    .min(1, "Affiliation number is required")
    .max(255, "Affiliation number must not exceed 255 characters"),
  regionId: z.number()
    .min(1, "Please select a region"),
  city: z.string()
    .min(1, "City is required")
    .max(255, "City must not exceed 255 characters"),
  address: z.string()
    .min(1, "Address is required")
    .max(255, "Address must not exceed 255 characters"),
  mobile: z.string()
    .min(1, "Mobile number is required")
    .max(255, "Mobile number must not exceed 255 characters"),
  email: z.string()
    .email("Valid email is required")
    .max(255, "Email must not exceed 255 characters"),
  role: z.string().default("clubadmin"),
  
  // President details (all fields mandatory)
  presidentName: z.string()
    .min(1, "President name is required")
    .max(255, "President name must not exceed 255 characters"),
  presidentMobile: z.string()
    .min(1, "President mobile is required")
    .max(20, "President mobile must not exceed 20 characters"),
  presidentEmail: z.string()
    .min(1, "President email is required")
    .email("Valid president email is required")
    .max(255, "President email must not exceed 255 characters"),
  presidentAadhar: z.string()
    .min(1, "President aadhar is required")
    .max(12, "President aadhar must not exceed 12 characters"),
    
  // Secretary details (all fields mandatory)
  secretaryName: z.string()
    .min(1, "Secretary name is required")
    .max(255, "Secretary name must not exceed 255 characters"),
  secretaryMobile: z.string()
    .min(1, "Secretary mobile is required")
    .max(20, "Secretary mobile must not exceed 20 characters"),
  secretaryEmail: z.string()
    .min(1, "Secretary email is required")
    .email("Valid secretary email is required")
    .max(255, "Secretary email must not exceed 255 characters"),
  secretaryAadhar: z.string()
    .min(1, "Secretary aadhar is required")
    .max(12, "Secretary aadhar must not exceed 12 characters"),
    
  // Treasurer details (all fields mandatory)
  treasurerName: z.string()
    .min(1, "Treasurer name is required")
    .max(255, "Treasurer name must not exceed 255 characters"),
  treasurerMobile: z.string()
    .min(1, "Treasurer mobile is required")
    .max(20, "Treasurer mobile must not exceed 20 characters"),
  treasurerEmail: z.string()
    .min(1, "Treasurer email is required")
    .email("Valid treasurer email is required")
    .max(255, "Treasurer email must not exceed 255 characters"),
  treasurerAadhar: z.string()
    .min(1, "Treasurer aadhar is required")
    .max(12, "Treasurer aadhar must not exceed 12 characters"),
  
  // Coach details (name and mobile mandatory)
  coachName: z.string()
    .min(1, "Coach name is required")
    .max(255, "Coach name must not exceed 255 characters"),
  coachMobile: z.string()
    .min(1, "Coach mobile is required")
    .max(20, "Coach mobile must not exceed 20 characters"),
  coachEmail: z.string().email("Valid coach email is required").max(255, "Coach email must not exceed 255 characters").optional(),
  coachAadhar: z.string().max(12, "Coach aadhar must not exceed 12 characters").optional(),
  
  // Manager details (name and mobile mandatory)
  managerName: z.string()
    .min(1, "Manager name is required")
    .max(255, "Manager name must not exceed 255 characters"),
  managerMobile: z.string()
    .min(1, "Manager mobile is required")
    .max(20, "Manager mobile must not exceed 20 characters"),
  managerEmail: z.string().email("Valid manager email is required").max(255, "Manager email must not exceed 255 characters").optional(),
  managerAadhar: z.string().max(12, "Manager aadhar must not exceed 12 characters").optional(),
});

const clubFormSchemaCreate = clubFormSchemaBase.extend({
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(255, "Password must not exceed 255 characters"),
});

const clubFormSchemaEdit = clubFormSchemaBase.extend({
  password: z.string()
    .max(255, "Password must not exceed 255 characters")
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),
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



interface ClubFormProps {
  mode: "create" | "edit";
  clubId?: string;
  onSuccess?: () => void;
}

const ClubForm = ({
  mode,
  clubId,
  onSuccess,
}: ClubFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Initialize form with Shadcn Form
  const form = useForm<any>({
    resolver: zodResolver(mode === "create" ? clubFormSchemaCreate : clubFormSchemaEdit) as any,
    defaultValues: {
      clubName: "",
      affiliationNumber: "",
      regionId: undefined,
      city: "",
      address: "",
      mobile: "",
      email: "",
      password: "",
      role: "clubadmin", // Set default role for club users
      
      // President details
      presidentName: "",
      presidentMobile: "",
      presidentEmail: "",
      presidentAadhar: "",
      
      // Secretary details
      secretaryName: "",
      secretaryMobile: "",
      secretaryEmail: "",
      secretaryAadhar: "",
      
      // Treasurer details
      treasurerName: "",
      treasurerMobile: "",
      treasurerEmail: "",
      treasurerAadhar: "",
      
      // Coach details
      coachName: "",
      coachMobile: "",
      coachEmail: "",
      coachAadhar: "",
      
      // Manager details
      managerName: "",
      managerMobile: "",
      managerEmail: "",
      managerAadhar: "",
    },
  });

  // Query for fetching regions for dropdown
  const { data: regions, isLoading: isLoadingRegions } = useQuery<Region[]>({
    queryKey: ["regions-dropdown"],
    queryFn: async () => {
      const response = await get("/clubs/regions");
      return response;
    },
    refetchOnWindowFocus: false,
  });

  // Query for fetching club data in edit mode
  const { data: clubData, isLoading: isFetchingClub, error: fetchError } = useQuery({
    queryKey: ["club", clubId],
    queryFn: async (): Promise<ClubData> => {
      if (!clubId) throw new Error("Club ID is required");
      const response = await get(`/clubs/${clubId}`);
      console.log("Club API response:", response); // Debug log
      // Handle different response structures
      return response.club || response;
    },
    enabled: mode === "edit" && !!clubId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Handle successful club fetch
  useEffect(() => {
    console.log("Club data received:", clubData); // Debug log
    if (clubData && mode === "edit") {
      console.log("Setting form values..."); // Debug log
      form.reset({
        clubName: clubData.clubName,
        affiliationNumber: clubData.affiliationNumber,
        regionId: clubData.regionId,
        city: clubData.city,
        address: clubData.address,
        mobile: clubData.mobile,
        email: clubData.email,
        password: "",
        role: "clubadmin",
        
        // President details
        presidentName: clubData.presidentName || "",
        presidentMobile: clubData.presidentMobile || "",
        presidentEmail: clubData.presidentEmail || "",
        presidentAadhar: clubData.presidentAadhar || "",
        
        // Secretary details
        secretaryName: clubData.secretaryName || "",
        secretaryMobile: clubData.secretaryMobile || "",
        secretaryEmail: clubData.secretaryEmail || "",
        secretaryAadhar: clubData.secretaryAadhar || "",
        
        // Treasurer details
        treasurerName: clubData.treasurerName || "",
        treasurerMobile: clubData.treasurerMobile || "",
        treasurerEmail: clubData.treasurerEmail || "",
        treasurerAadhar: clubData.treasurerAadhar || "",
        
        // Coach details
        coachName: clubData.coachName || "",
        coachMobile: clubData.coachMobile || "",
        coachEmail: clubData.coachEmail || "",
        coachAadhar: clubData.coachAadhar || "",
        
        // Manager details
        managerName: clubData.managerName || "",
        managerMobile: clubData.managerMobile || "",
        managerEmail: clubData.managerEmail || "",
        managerAadhar: clubData.managerAadhar || "",
      });
    }
  }, [clubData, mode, form]);

  // Handle fetch error
  useEffect(() => {
    if (fetchError && mode === "edit") {
      toast.error(fetchError.message || "Failed to fetch club details");
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/clubs");
      }
    }
  }, [fetchError, mode, onSuccess, navigate]);

  // Mutation for creating a club
  const createClubMutation = useMutation({
    mutationFn: (data: any) => {
      return post("/clubs", data);
    },
    onSuccess: () => {
      toast.success("Club created successfully");
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/clubs");
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
        toast.error("Failed to create club");
      }
    },
  });

  // Mutation for updating a club
  const updateClubMutation = useMutation({
    mutationFn: (data: any) => {
      return put(`/clubs/${clubId}`, data);
    },
    onSuccess: () => {
      toast.success("Club updated successfully");
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      queryClient.invalidateQueries({ queryKey: ["club", clubId] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/clubs");
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
        toast.error("Failed to update club");
      }
    },
  });

  // Handle form submission
  const onSubmit = (data: any) => {
    if (mode === "create") {
      createClubMutation.mutate(data);
    } else {
      updateClubMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      navigate("/clubs");
    }
  };

  // Combined loading club from fetch and mutations
  const isFormLoading = isFetchingClub || createClubMutation.isPending || updateClubMutation.isPending;

  return (
    <div className="p-6">
      {/* Header with Back Button and Title */}
      <div className="flex items-center justify-between mb-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isFormLoading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold flex-1 text-center">
          {mode === "create" ? "Create" : "Edit"} Club
        </h1>
        <div className="w-16"></div> {/* Spacer to balance the layout */}
      </div>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Club Name Field */}
          <FormField
            control={form.control}
            name="clubName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Club Name <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter club name"
                    {...field}
                    disabled={isFormLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Affiliation Number and Region - Two Column Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Affiliation Number Field */}
            <FormField
              control={form.control}
              name="affiliationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Affiliation Number <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter affiliation number"
                      {...field}
                      disabled={isFormLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Region Dropdown Field */}
            <FormField
              control={form.control}
              name="regionId"
              render={({ field }) => {
                const selectedRegion = regions?.find(r => r.id === field.value);
                return (
                  <FormItem>
                    <FormLabel>Region <span className="text-red-500">*</span></FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                      disabled={isFormLoading || isLoadingRegions}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {regions?.map((region) => (
                          <SelectItem key={region.id} value={region.id.toString()}>
                            {region.regionName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedRegion && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Taluka: {selectedRegion.taluka.talukaName}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>

          {/* City Field */}
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter city"
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
                <FormLabel>Address <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter address"
                    {...field}
                    disabled={isFormLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Mobile and Email Fields in a grid */}
          <div className="grid grid-cols-2 gap-4">
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
                      maxLength={10}
                      type="tel"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter email address"
                      {...field}
                      disabled={isFormLoading}
                      type="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Password
                  {mode === "create" && <span className="text-red-500">*</span>}
                  {mode === "edit" && <span className="text-sm text-muted-foreground ml-2">(Leave blank to keep current password)</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={mode === "create" ? "Enter password" : "Leave blank to keep current password"}
                    {...field}
                    disabled={isFormLoading}
                    type="password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Club Leadership Section */}
          <div className="space-y-6">
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Club Leadership</h3>
              
              {/* President Details */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-muted-foreground">President Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="presidentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>President Name <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter president name"
                            {...field}
                            disabled={isFormLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="presidentMobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>President Mobile <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter president mobile"
                            {...field}
                            disabled={isFormLoading}
                            maxLength={10}
                            type="tel"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="presidentEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>President Email <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter president email"
                            {...field}
                            disabled={isFormLoading}
                            type="email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="presidentAadhar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>President Aadhar Number <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter president aadhar number"
                            {...field}
                            disabled={isFormLoading}
                            maxLength={12}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Secretary Details */}
              <div className="space-y-4 mt-6">
                <h4 className="text-md font-medium text-muted-foreground">Secretary Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="secretaryName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secretary Name <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter secretary name"
                            {...field}
                            disabled={isFormLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="secretaryMobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secretary Mobile <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter secretary mobile"
                            {...field}
                            disabled={isFormLoading}
                            maxLength={10}
                            type="tel"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="secretaryEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secretary Email <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter secretary email"
                            {...field}
                            disabled={isFormLoading}
                            type="email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="secretaryAadhar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secretary Aadhar Number <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter secretary aadhar number"
                            {...field}
                            disabled={isFormLoading}
                            maxLength={12}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Treasurer Details */}
              <div className="space-y-4 mt-6">
                <h4 className="text-md font-medium text-muted-foreground">Treasurer Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="treasurerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Treasurer Name <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter treasurer name"
                            {...field}
                            disabled={isFormLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="treasurerMobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Treasurer Mobile <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter treasurer mobile"
                            {...field}
                            disabled={isFormLoading}
                            maxLength={10}
                            type="tel"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="treasurerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Treasurer Email <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter treasurer email"
                            {...field}
                            disabled={isFormLoading}
                            type="email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="treasurerAadhar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Treasurer Aadhar Number <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter treasurer aadhar number"
                            {...field}
                            disabled={isFormLoading}
                            maxLength={12}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Coach Details */}
              <div className="space-y-4 mt-6">
                <h4 className="text-md font-medium text-muted-foreground">Coach Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="coachName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coach Name <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter coach name"
                            {...field}
                            disabled={isFormLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="coachMobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coach Mobile <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter coach mobile"
                            {...field}
                            disabled={isFormLoading}
                            maxLength={10}
                            type="tel"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="coachEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coach Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter coach email"
                            {...field}
                            disabled={isFormLoading}
                            type="email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="coachAadhar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coach Aadhar Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter coach aadhar number"
                            {...field}
                            disabled={isFormLoading}
                            maxLength={12}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Manager Details */}
              <div className="space-y-4 mt-6">
                <h4 className="text-md font-medium text-muted-foreground">Manager Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="managerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manager Name <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter manager name"
                            {...field}
                            disabled={isFormLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="managerMobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manager Mobile <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter manager mobile"
                            {...field}
                            disabled={isFormLoading}
                            maxLength={10}
                            type="tel"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="managerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manager Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter manager email"
                            {...field}
                            disabled={isFormLoading}
                            type="email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="managerAadhar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manager Aadhar Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter manager aadhar number"
                            {...field}
                            disabled={isFormLoading}
                            maxLength={12}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
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
                  {mode === "create" ? "Create" : "Update"} Club
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClubForm;