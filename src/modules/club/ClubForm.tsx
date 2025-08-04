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

// Services and utilities
import { post, put, get } from "@/services/apiService";
import Validate from "@/lib/Handlevalidation";

// Define interfaces for API responses
interface ClubData {
  id: number;
  clubName: string;
  affiliationNumber: string;
  city: string;
  address: string;
  mobile: string;
  email: string;
  
  // Chairman details
  chairmanName?: string;
  chairmanMobile?: string;
  chairmanEmail?: string;
  chairmanAadhar?: string;
  
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
  
  // Chairman details (optional for backward compatibility)
  chairmanName: z.string()
    .max(255, "Chairman name must not exceed 255 characters")
    .optional(),
  chairmanMobile: z.string()
    .max(20, "Chairman mobile must not exceed 20 characters")
    .optional(),
  chairmanEmail: z.string()
    .email("Valid chairman email is required")
    .max(255, "Chairman email must not exceed 255 characters")
    .optional(),
  chairmanAadhar: z.string()
    .max(12, "Chairman aadhar must not exceed 12 characters")
    .optional(),
    
  // Secretary details (optional for backward compatibility)
  secretaryName: z.string()
    .max(255, "Secretary name must not exceed 255 characters")
    .optional(),
  secretaryMobile: z.string()
    .max(20, "Secretary mobile must not exceed 20 characters")
    .optional(),
  secretaryEmail: z.string()
    .email("Valid secretary email is required")
    .max(255, "Secretary email must not exceed 255 characters")
    .optional(),
  secretaryAadhar: z.string()
    .max(12, "Secretary aadhar must not exceed 12 characters")
    .optional(),
    
  // Treasurer details (optional for backward compatibility)
  treasurerName: z.string()
    .max(255, "Treasurer name must not exceed 255 characters")
    .optional(),
  treasurerMobile: z.string()
    .max(20, "Treasurer mobile must not exceed 20 characters")
    .optional(),
  treasurerEmail: z.string()
    .email("Valid treasurer email is required")
    .max(255, "Treasurer email must not exceed 255 characters")
    .optional(),
  treasurerAadhar: z.string()
    .max(12, "Treasurer aadhar must not exceed 12 characters")
    .optional(),
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
      city: "",
      address: "",
      mobile: "",
      email: "",
      password: "",
      role: "clubadmin", // Set default role for club users
      
      // Chairman details
      chairmanName: "",
      chairmanMobile: "",
      chairmanEmail: "",
      chairmanAadhar: "",
      
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
    },
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
        city: clubData.city,
        address: clubData.address,
        mobile: clubData.mobile,
        email: clubData.email,
        password: "",
        role: "clubadmin",
        
        // Chairman details
        chairmanName: clubData.chairmanName || "",
        chairmanMobile: clubData.chairmanMobile || "",
        chairmanEmail: clubData.chairmanEmail || "",
        chairmanAadhar: clubData.chairmanAadhar || "",
        
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
              
              {/* Chairman Details */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-muted-foreground">Chairman Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="chairmanName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chairman Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter chairman name"
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
                    name="chairmanMobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chairman Mobile</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter chairman mobile"
                            {...field}
                            disabled={isFormLoading}
                            maxLength={20}
                            type="tel"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="chairmanEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chairman Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter chairman email"
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
                    name="chairmanAadhar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chairman Aadhar Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter chairman aadhar number"
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
                        <FormLabel>Secretary Name</FormLabel>
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
                        <FormLabel>Secretary Mobile</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter secretary mobile"
                            {...field}
                            disabled={isFormLoading}
                            maxLength={20}
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
                        <FormLabel>Secretary Email</FormLabel>
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
                        <FormLabel>Secretary Aadhar Number</FormLabel>
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
                        <FormLabel>Treasurer Name</FormLabel>
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
                        <FormLabel>Treasurer Mobile</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter treasurer mobile"
                            {...field}
                            disabled={isFormLoading}
                            maxLength={20}
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
                        <FormLabel>Treasurer Email</FormLabel>
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
                        <FormLabel>Treasurer Aadhar Number</FormLabel>
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