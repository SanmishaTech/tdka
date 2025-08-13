import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle, Check, ArrowLeft, Upload, X } from "lucide-react";

// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
import { get, post, put, postupload, putupload } from "@/services/apiService";
import Validate from "@/lib/Handlevalidation";

// Define interfaces for API responses
interface PlayerData {
  id: number;
  uniqueIdNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  motherName?: string;
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
  motherName: z.string()
    .max(100, "Mother name must not exceed 100 characters")
    .refine(val => !val || /^[A-Za-z\s\u0900-\u097F]+$/.test(val), {
      message: "Mother name can only contain letters",
    })
    .optional(),
  dateOfBirth: z.string()
    .min(1, "Date of birth is required"),
  position: z.string()
    .max(100, "Position must not exceed 100 characters")
    .optional(),
  address: z.string()
    .min(1, "Address is required"),
  mobile: z.string()
    .min(10, "Mobile number must be at least 10 digits")
    .max(10, "Mobile number must not exceed 10 digits")
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

type PlayerFormInputs = z.infer<typeof playerFormSchemaCreate> | z.infer<typeof playerFormSchemaEdit>;

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

  // Profile image state
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [existingProfileImage, setExistingProfileImage] = useState<string | null>(null);

  // Initialize form with Shadcn Form
  const form = useForm<PlayerFormInputs>({
    resolver: zodResolver(mode === "create" ? playerFormSchemaCreate : playerFormSchemaEdit),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      motherName: "",
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
      form.setValue("motherName", playerData.motherName || "");
      form.setValue("dateOfBirth", playerData.dateOfBirth.split('T')[0] || "");
      form.setValue("position", playerData.position || "");
      form.setValue("address", playerData.address || "");
      form.setValue("mobile", playerData.mobile || "");
      form.setValue("aadharNumber", playerData.aadharNumber || "");
      
      // Set group IDs
      if (playerData.groups && Array.isArray(playerData.groups) && playerData.groups.length > 0) {
        form.setValue("groupIds", playerData.groups.map(group => group.id.toString()));
      } else {
        form.setValue("groupIds", []);
      }

      // Set existing profile image
      if (playerData.profileImage) {
        // In development, use the proxy (/uploads will be proxied to backend)
        // In production, use the full backend URL
        const isDevelopment = import.meta.env.DEV;
        const imageUrl = isDevelopment 
          ? `/${playerData.profileImage}` // Use proxy in development
          : `${(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '')}/${playerData.profileImage}`; // Direct URL in production
        
        console.log('Setting up profile image:');
        console.log('- Database path:', playerData.profileImage);
        console.log('- Development mode:', isDevelopment);
        console.log('- Final URL:', imageUrl);
        
        setExistingProfileImage(imageUrl);
        setProfileImagePreview(imageUrl);
        
        // Test if the image exists by creating a test image
        const testImg = new Image();
        testImg.onload = () => {
          console.log('✅ Image exists and is accessible:', imageUrl);
        };
        testImg.onerror = () => {
          console.error('❌ Image failed to load:', imageUrl);
          console.log('Trying to fetch the URL directly...');
          fetch(imageUrl)
            .then(response => {
              console.log('Fetch response status:', response.status);
              console.log('Fetch response headers:', response.headers);
              if (!response.ok) {
                console.error('Fetch failed with status:', response.status);
              }
            })
            .catch(error => {
              console.error('Fetch error:', error);
            });
        };
        testImg.src = imageUrl;
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
    mutationFn: async (data: PlayerFormInputs) => {
      if (profileImageFile) {
        // If there's a profile image file, use FormData to upload
        const formData = new FormData();
        formData.append('firstName', data.firstName);
        formData.append('middleName', data.middleName || '');
        formData.append('lastName', data.lastName);
        formData.append('motherName', data.motherName || '');
        formData.append('dateOfBirth', data.dateOfBirth);
        formData.append('position', data.position || '');
        formData.append('address', data.address);
        formData.append('mobile', data.mobile);
        formData.append('aadharNumber', data.aadharNumber!);
        formData.append('groupIds', JSON.stringify(data.groupIds.map(id => parseInt(id))));
        formData.append('profileImage', profileImageFile);
        
        return postupload("/players", formData);
      } else {
        // No profile image, use regular JSON payload
        const payload = {
          firstName: data.firstName,
          middleName: data.middleName || null,
          lastName: data.lastName,
          motherName: data.motherName || null,
          dateOfBirth: data.dateOfBirth,
          position: data.position || null,
          address: data.address,
          mobile: data.mobile,
          aadharNumber: data.aadharNumber,
          groupIds: data.groupIds.map(id => parseInt(id))
        };
        
        return post("/players", payload);
      }
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
    mutationFn: async (data: PlayerFormInputs) => {
      if (profileImageFile || shouldRemoveImage) {
        // If there's a new profile image file or image should be removed, use FormData
        const formData = new FormData();
        formData.append('firstName', data.firstName);
        formData.append('middleName', data.middleName || '');
        formData.append('lastName', data.lastName);
        formData.append('motherName', data.motherName || '');
        formData.append('dateOfBirth', data.dateOfBirth);
        formData.append('position', data.position || '');
        formData.append('address', data.address);
        formData.append('mobile', data.mobile);
        formData.append('aadharNumber', data.aadharNumber || '');
        formData.append('groupIds', JSON.stringify(data.groupIds.map(id => parseInt(id))));
        
        if (profileImageFile) {
          formData.append('profileImage', profileImageFile);
        } else if (shouldRemoveImage) {
          // Send removeImage flag to indicate image should be removed
          formData.append('removeImage', 'true');
        }
        
        return putupload(`/players/${playerId}`, formData);
      } else {
        // No image changes, use regular JSON payload
        const payload = {
          firstName: data.firstName,
          middleName: data.middleName || null,
          lastName: data.lastName,
          motherName: data.motherName || null,
          dateOfBirth: data.dateOfBirth,
          position: data.position || null,
          address: data.address,
          mobile: data.mobile,
          aadharNumber: data.aadharNumber || null,
          groupIds: data.groupIds.map(id => parseInt(id))
        };
        
        return put(`/players/${playerId}`, payload);
      }
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

  // Track if image should be removed
  const [shouldRemoveImage, setShouldRemoveImage] = useState<boolean>(false);

  // Handle profile image removal
  const handleRemoveImage = () => {
    setProfileImagePreview(null);
    setProfileImageFile(null);
    setExistingProfileImage(null);
    setShouldRemoveImage(true); // Mark for removal
  };

  // Handle profile image file selection
  const handleImageFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      
      setProfileImageFile(file);
      setShouldRemoveImage(false); // Reset removal flag when new file is selected
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
      {/* Header with Back Button and Title */}
      <div className="flex items-center justify-between mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          {mode === "create" ? "Create" : "Update"} Player
        </h1>
        <div className="w-16" /> {/* Spacer for center alignment */}
      </div>

      {/* Main Card */}
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
              {/* Profile Image Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Profile Image</h3>
                
                {/* Profile Image Display */}
                <div className="flex items-center gap-4">
                  {profileImagePreview && (
                    <div className="relative">
                      <img 
                        src={profileImagePreview} 
                        alt="Profile Preview" 
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          console.log('Image failed to load:', profileImagePreview);
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E';
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', profileImagePreview);
                        }}
                      />
                      
                      <div className="mt-2 text-sm text-center">
                        {mode === "edit" ? "Current Image" : "Preview"}
                      </div>
                    </div>
                  )}
                  
                  {!profileImagePreview && (
                    <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx={12} cy={7} r={4} />
                      </svg>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2">
                    <div className="text-sm text-muted-foreground">
                      {mode === "edit" ? "Update passport size image" : "Add passport size image"} (optional)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Supported formats: JPEG, PNG
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Supported size: Passport size (2×2 inches, Max 2MB)
                    </div>
                    
                    {/* Image Upload Controls */}
                    <div className="flex gap-2 mt-2">
                      <label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          className="cursor-pointer"
                          disabled={isFormLoading}
                          asChild
                        >
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            Choose Image
                          </span>
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileSelect}
                          className="sr-only"
                          disabled={isFormLoading}
                        />
                      </label>
                      
                      {profileImagePreview && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={handleRemoveImage}
                          disabled={isFormLoading}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Personal Information (As per Aadhar)</h3>
            
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

            {/* Mother Name Field */}
            <FormField
              control={form.control}
              name="motherName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mother Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter mother name"
                      {...field}
                      disabled={isFormLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    <FormLabel>Playing Position</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isFormLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Playing Position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Left Corner">Left Corner</SelectItem>
                        <SelectItem value="Right Corner">Right Corner</SelectItem>
                        <SelectItem value="Left Turn">Left Turn</SelectItem>
                        <SelectItem value="Right Turn">Right Turn</SelectItem>
                        <SelectItem value="Left Raider">Left Raider</SelectItem>
                        <SelectItem value="Right Raider">Right Raider</SelectItem>
                        <SelectItem value="All Rounder">All Rounder</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                        maxLength={10}
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

            {/* Address Field */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (As per Aadhar) <span className="text-red-500">*</span></FormLabel>
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
          </div>

          {/* Groups Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Groups</h3>
            
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
              {mode === "create" ? "Create" : "Update"} Player
            </Button>
          </div>
        </form>
      </Form>
    </CardContent>
  </Card>
</div>
  );
};

export default PlayerForm;