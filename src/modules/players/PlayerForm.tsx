import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle, Check, ArrowLeft, Upload, X, ChevronsUpDown } from "lucide-react";

// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatetimePicker } from "@/components/ui/datetime-picker";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  chestNumber?: string;
  address: string;
  mobile: string;
  aadharNumber: string;
  aadharImage?: string;
  aadharVerified: boolean;
  isSuspended: boolean;
  clubId?: number | null;
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

interface Club {
  id: number;
  clubName: string;
  place?: {
    id?: number;
    placeName?: string;
    region?: {
      id?: number;
      regionName?: string;
    };
  };
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
  chestNumber: z.string()
    .max(20, "Chest number must not exceed 20 characters")
    .optional(),
  address: z.string()
    .min(1, "Address is required"),
  mobile: z.string()
    .min(10, "Mobile number must be at least 10 digits")
    .max(10, "Mobile number must not exceed 10 digits")
    .refine(val => /^\d+$/.test(val), {
      message: "Mobile number can only contain digits",
    }),
  clubId: z.string().optional(),
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

const playerFormSchemaCreateAdmin = playerFormSchemaCreate.extend({
  clubId: z.string().min(1, "Club is required"),
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

type PlayerFormInputs = z.infer<typeof playerFormSchemaCreate> | z.infer<typeof playerFormSchemaCreateAdmin> | z.infer<typeof playerFormSchemaEdit>;

interface PlayerFormProps {
  mode: "create" | "edit";
  playerId?: string;
  onSuccess?: () => void;
  className?: string;
}

import { verifyAadhar } from "@/services/apiService";

const PlayerForm = ({
  mode,
  playerId,
  onSuccess,
  className,
}: PlayerFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3000").replace(/\/$/, "");
  const resolveUploadUrl = (p?: string | null) => {
    const s = String(p || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    const normalized = s.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${backendBaseUrl}/${normalized}`;
  };

  // Profile image state
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [existingProfileImage, setExistingProfileImage] = useState<string | null>(null);

  // Aadhaar verification state
  const [aadharVerified, setAadharVerified] = useState<boolean>(false);

  // Aadhar image state
  const [aadharImageFile, setAadharImageFile] = useState<File | null>(null);
  const [aadharImagePreview, setAadharImagePreview] = useState<string | null>(null);
  const [existingAadharImage, setExistingAadharImage] = useState<string | null>(null);

  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [clubPopoverOpen, setClubPopoverOpen] = useState(false);
  const [shouldRemoveImage, setShouldRemoveImage] = useState<boolean>(false);
  const [shouldRemoveAadharImage, setShouldRemoveAadharImage] = useState<boolean>(false);

  // Combined loading state
  const [isFormLoadingState, setIsFormLoadingState] = useState(false);

  // Initialize form with Shadcn Form
  const form = useForm<PlayerFormInputs>({
    resolver: zodResolver(
      mode === "create"
        ? (isAdmin ? playerFormSchemaCreateAdmin : playerFormSchemaCreate)
        : playerFormSchemaEdit
    ),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      motherName: "",
      dateOfBirth: "",
      position: "",
      chestNumber: "",
      address: "",
      mobile: "",
      aadharNumber: "",
      clubId: "",
      groupIds: [],
    },
  });

  const calculateAge = (dateOfBirth: string, refDate: Date = new Date()) => {
    const birthDate = new Date(`${dateOfBirth}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return null;
    let age = refDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = refDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return Number.isFinite(age) ? age : null;
  };

  const dateOfBirth = form.watch("dateOfBirth") as string;
  const playerAge = dateOfBirth ? calculateAge(dateOfBirth) : null;

  const isGroupEligibleByAge = (group: Group, age: number | null) => {
    if (typeof age !== "number") return true;

    const groupName = String(group?.groupName || "").trim().toLowerCase();
    const isMenOrWomen = groupName === "men" || groupName === "women";
    if (isMenOrWomen) return age > 18;

    const ageFromGroupAge = parseInt(String(group?.age || "").match(/\d+/)?.[0] || "", 10);
    const ageFromGroupName = parseInt(groupName.match(/\d+/)?.[0] || "", 10);
    const ageLimit = Number.isFinite(ageFromGroupAge) ? ageFromGroupAge : ageFromGroupName;
    if (!Number.isFinite(ageLimit)) return true;
    return age <= ageLimit;
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
    enabled: isAdmin,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (typeof playerAge !== "number") return;
    if (!Array.isArray(groupsData) || groupsData.length === 0) return;

    const eligibleIds = new Set(
      groupsData
        .filter((g) => isGroupEligibleByAge(g, playerAge))
        .map((g) => g.id.toString())
    );

    const current = (form.getValues("groupIds") as string[]) || [];
    const next = current.filter((id) => eligibleIds.has(id));
    if (next.length !== current.length) {
      form.setValue("groupIds", next, { shouldValidate: true });
    }
  }, [playerAge, groupsData, form]);

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
      form.setValue("chestNumber", playerData.chestNumber || "");
      form.setValue("address", playerData.address || "");
      form.setValue("mobile", playerData.mobile || "");
      form.setValue("aadharNumber", playerData.aadharNumber || "");
      if (isAdmin) {
        form.setValue("clubId", playerData.clubId ? String(playerData.clubId) : "");
      }

      // Set group IDs
      if (playerData.groups && Array.isArray(playerData.groups) && playerData.groups.length > 0) {
        form.setValue("groupIds", playerData.groups.map(group => group.id.toString()));
      } else {
        form.setValue("groupIds", []);
      }

      // Set existing profile image
      if (playerData.profileImage) {
        const imageUrl = resolveUploadUrl(playerData.profileImage);
        setExistingProfileImage(imageUrl);
        setProfileImagePreview(imageUrl);
      }

      // Set existing aadhar image
      if (playerData.aadharImage) {
        const imageUrl = resolveUploadUrl(playerData.aadharImage);
        setExistingAadharImage(imageUrl);
        setAadharImagePreview(imageUrl);
      }
      setAadharVerified(!!playerData.aadharVerified);
    }
  }, [playerData, mode, form, isAdmin]);

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

  // Handle Aadhaar verification
  const handleVerifyAadhar = async () => {
    if (isFormLoading || isVerifying) return;
    const aadharNumber = form.getValues("aadharNumber") as string;
    if (!aadharNumber || aadharNumber.length !== 12) {
      toast.error("Enter valid 12-digit Aadhaar number first");
      return;
    }
    try {
      setIsVerifying(true);
      form.clearErrors(["aadharNumber"]);
      const formData = new FormData();
      formData.append("aadharNumber", aadharNumber);
      if (aadharImageFile) {
        formData.append("file", aadharImageFile);
      }
      const url = mode === "edit" && playerId ? `/players/${playerId}/verify-aadhar` : "/players/verify-aadhar";
      const resp: any = await verifyAadhar(url, formData);
      const verified = resp?.aadharVerified === true || resp?.aadharVerified === "true";
      setAadharVerified(verified);
      if (verified) {
        toast.success("Aadhaar verified and matched successfully");
        form.clearErrors(["aadharNumber", "firstName", "lastName", "dateOfBirth"]);
      } else {
        if (resp?.mismatchReasons?.includes("Aadhar number does not match")) {
          form.setError("aadharNumber", { type: "manual", message: "Aadhaar number does not match image" });
        }
        if (resp?.mismatchReasons?.includes("Name does not match")) {
          form.setError("firstName", { type: "manual", message: "Name does not match Aadhaar" });
          form.setError("lastName", { type: "manual", message: "Name does not match Aadhaar" });
        }
        if (resp?.mismatchReasons?.includes("Date of birth does not match")) {
          form.setError("dateOfBirth", { type: "manual", message: "DOB does not match Aadhaar" });
        }
      }
    } catch (error: any) {
      const rawData = error?.originalError?.response?.data;
      const providerMessage =
        error?.data?.cashfreeResponse?.message ||
        error?.data?.cashfreeResponse?.error ||
        error?.data?.cashfreeResponse?.code ||
        error?.data?.mismatchReasons?.[0] ||
        rawData?.cashfreeResponse?.message ||
        rawData?.cashfreeResponse?.error ||
        rawData?.cashfreeResponse?.code ||
        rawData?.mismatchReasons?.[0];
      const providerCode = String(
        error?.data?.cashfreeResponse?.code || rawData?.cashfreeResponse?.code || ""
      ).toLowerCase();
      const isInsufficientBalance =
        providerCode === "insufficient_balance" ||
        String(providerMessage || "").toLowerCase().includes("insufficient balance");
      toast.error(
        (isInsufficientBalance ? (providerMessage || "Insufficient balance to process this request.") : providerMessage) ||
        error?.message ||
        "Verification failed"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Mutation for creating a player
  const createPlayerMutation = useMutation({
    mutationFn: async (data: PlayerFormInputs) => {
      if (profileImageFile || aadharImageFile) {
        const formData = new FormData();
        formData.append('firstName', data.firstName);
        formData.append('middleName', data.middleName || '');
        formData.append('lastName', data.lastName);
        formData.append('motherName', data.motherName || '');
        formData.append('dateOfBirth', data.dateOfBirth);
        formData.append('position', data.position || '');
        formData.append('chestNumber', data.chestNumber || '');
        formData.append('address', data.address);
        formData.append('mobile', data.mobile);
        formData.append('aadharNumber', data.aadharNumber!);
        if (isAdmin && data.clubId) formData.append('clubId', data.clubId);
        formData.append('groupIds', JSON.stringify(data.groupIds.map(id => parseInt(id))));
        if (profileImageFile) formData.append('profileImage', profileImageFile);
        if (aadharImageFile) formData.append('aadharImage', aadharImageFile);

        return postupload("/players", formData);
      } else {
        const payload = {
          firstName: data.firstName,
          middleName: data.middleName || null,
          lastName: data.lastName,
          motherName: data.motherName || null,
          dateOfBirth: data.dateOfBirth,
          position: data.position || null,
          chestNumber: data.chestNumber || null,
          address: data.address,
          mobile: data.mobile,
          aadharNumber: data.aadharNumber,
          ...(isAdmin && data.clubId ? { clubId: parseInt(data.clubId) } : {}),
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
      if (profileImageFile || aadharImageFile) {
        const formData = new FormData();
        formData.append('firstName', data.firstName);
        formData.append('middleName', data.middleName || '');
        formData.append('lastName', data.lastName);
        formData.append('motherName', data.motherName || '');
        formData.append('dateOfBirth', data.dateOfBirth);
        formData.append('position', data.position || '');
        formData.append('chestNumber', data.chestNumber || '');
        formData.append('address', data.address);
        formData.append('mobile', data.mobile);
        formData.append('aadharNumber', data.aadharNumber || '');
        if (isAdmin && data.clubId) formData.append('clubId', data.clubId);
        formData.append('groupIds', JSON.stringify(data.groupIds.map(id => parseInt(id))));

        if (profileImageFile) {
          formData.append('profileImage', profileImageFile);
        }
        if (aadharImageFile) {
          formData.append('aadharImage', aadharImageFile);
        }

        return putupload(`/players/${playerId}`, formData);
      } else {
        const payload = {
          firstName: data.firstName,
          middleName: data.middleName || null,
          lastName: data.lastName,
          motherName: data.motherName || null,
          dateOfBirth: data.dateOfBirth,
          position: data.position || null,
          chestNumber: data.chestNumber || null,
          address: data.address,
          mobile: data.mobile,
          aadharNumber: data.aadharNumber || null,
          ...(isAdmin && data.clubId ? { clubId: parseInt(data.clubId) } : {}),
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

  // Handle profile image removal
  const handleRemoveImage = () => {
    setProfileImagePreview(null);
    setProfileImageFile(null);
    setExistingProfileImage(null);
    setShouldRemoveImage(true);
  };

  // Handle Aadhar image removal
  const handleRemoveAadharImage = () => {
    setAadharImagePreview(null);
    setAadharImageFile(null);
    setExistingAadharImage(null);
    setShouldRemoveAadharImage(true);
  };

  // Handle Aadhar image file selection
  const handleAadharImageFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }
    setAadharImageFile(file);
    setShouldRemoveAadharImage(false);
    const reader = new FileReader();
    reader.onloadend = () => setAadharImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Handle profile image file selection
  const handleImageFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }

      setProfileImageFile(file);
      setShouldRemoveImage(false);

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
        <div className="w-16" />
      </div>

      {/* Main Card */}
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
              {/* Profile Image Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Profile Image</h3>

                <div className="flex items-center gap-4">
                  {profileImagePreview && (
                    <div className="relative">
                      <img
                        src={profileImagePreview}
                        alt="Profile Preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E';
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

                    <div className="flex gap-2 mt-2">
                      <label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          disabled={isFormLoading || aadharVerified}
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
                          disabled={isFormLoading || aadharVerified}
                        />
                      </label>

                      {profileImagePreview && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveImage}
                          disabled={isFormLoading || aadharVerified}
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

                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            disabled={isFormLoading || aadharVerified}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            disabled={isFormLoading || aadharVerified}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            disabled={isFormLoading || aadharVerified}
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
                          disabled={isFormLoading || aadharVerified}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date of Birth, Position, and Chest Number Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Of Birth (According to Aadhar) <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <DatetimePicker
                            value={field.value ? new Date(field.value) : undefined}
                            onChange={(date) => {
                              if (date) {
                                const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                                field.onChange(offsetDate.toISOString().split('T')[0]);
                              } else {
                                field.onChange("");
                              }
                            }}
                            format={[
                              ["days", "months", "years"],
                              []
                            ]}
                            placeholders={{
                              days: "DD", months: "MM", years: "YYYY",
                              hours: "", minutes: "", seconds: "", "am/pm": ""
                            }}
                            className="border-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Playing Position</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isFormLoading || aadharVerified}
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

                  <FormField
                    control={form.control}
                    name="chestNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chest Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter chest number"
                            {...field}
                            disabled={isFormLoading || aadharVerified}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {isAdmin && (
                  <FormField
                    control={form.control}
                    name="clubId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Club
                          {mode === "create" && <span className="text-red-500">*</span>}
                        </FormLabel>
                        <Popover open={clubPopoverOpen} onOpenChange={setClubPopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={clubPopoverOpen}
                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                disabled={isFormLoading || isLoadingClubs || aadharVerified}
                              >
                                {field.value
                                  ? (clubsData || []).find((c) => c.id.toString() === field.value)?.clubName || "Select Club"
                                  : isLoadingClubs
                                    ? "Loading clubs..."
                                    : "Select Club"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search club..." />
                              <CommandList>
                                <CommandEmpty>No club found.</CommandEmpty>
                                <CommandGroup>
                                  {(clubsData || []).map((club) => {
                                    const placeName = club.place?.placeName;
                                    const regionName = club.place?.region?.regionName;
                                    const rightText = [regionName, placeName].filter(Boolean).join(" • ");

                                    return (
                                      <CommandItem
                                        key={club.id}
                                        value={`${club.clubName} ${regionName || ""} ${placeName || ""}`.trim()}
                                        onSelect={() => {
                                          field.onChange(club.id.toString());
                                          setClubPopoverOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === club.id.toString() ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <span className="flex-1 truncate">{club.clubName}</span>
                                        {rightText ? (
                                          <span className="ml-2 text-xs text-muted-foreground truncate">{rightText}</span>
                                        ) : null}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Aadhar Image Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Aadhar Image (optional)</h3>
                  <div className="flex items-center gap-4">
                    {aadharImagePreview && (
                      <div className="relative">
                        <img
                          src={aadharImagePreview}
                          alt="Aadhar Preview"
                          className="w-24 h-24 object-cover border-2 border-gray-200 rounded"
                        />
                        <div className="mt-2 text-sm text-center">
                          {mode === "edit" ? "Current Image" : "Preview"}
                        </div>
                      </div>
                    )}
                    {!aadharImagePreview && (
                      <div className="w-24 h-24 bg-gray-100 border-2 border-gray-200 flex items-center justify-center rounded">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
                        </svg>
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm text-muted-foreground">
                        {mode === "edit" ? "Update Aadhar image" : "Add Aadhar image"} (optional)
                      </div>
                      <div className="text-xs text-muted-foreground">Supported formats: JPEG, PNG</div>
                      <div className="text-xs text-muted-foreground">Max size: 2MB</div>
                      <div className="flex gap-2 mt-2">
                        <label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            disabled={isFormLoading || aadharVerified}
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
                            onChange={handleAadharImageFileSelect}
                            className="sr-only"
                            disabled={isFormLoading || aadharVerified}
                          />
                        </label>
                        {aadharImagePreview && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveAadharImage}
                            disabled={isFormLoading || aadharVerified}
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

                {/* Mobile and Aadhaar Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            disabled={isFormLoading || aadharVerified}
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
                    name="aadharNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Aadhar Number
                          {mode === "create" && <span className="text-red-500">*</span>}
                          {mode === "edit" && aadharVerified && (
                            <span className="text-sm text-muted-foreground ml-2">(Locked after verification)</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter 12-digit Aadhar number"
                            {...field}
                            disabled={isFormLoading || (mode === "edit" && aadharVerified)}
                            maxLength={12}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Aadhaar Verify Button & Status */}
                {mode === "edit" && (
                  <div className="flex items-center gap-3 mb-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isFormLoading || isVerifying || aadharVerified}
                      onClick={handleVerifyAadhar}
                      className="flex items-center gap-2"
                    >
                      {isVerifying ? (
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {aadharVerified ? "Verified" : "Verify"}
                    </Button>
                    {aadharVerified && (
                      <Badge variant="secondary" className="bg-green-600 text-white">Verified</Badge>
                    )}
                  </div>
                )}

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
                          disabled={isFormLoading || aadharVerified}
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
                <h3 className="text-lg font-medium border-b pb-2">
                  Groups{typeof playerAge === "number" ? ` (Age: ${playerAge})` : ""}
                </h3>

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
                            <div className="max-h-[200px] overflow-y-scroll">
                              {groupsData?.map((group) => {
                                const groupId = group.id.toString();
                                const isSelected = field.value.includes(groupId);
                                const eligibleByAge = isGroupEligibleByAge(group, playerAge);
                                return (
                                  <div
                                    key={group.id}
                                    className={cn(
                                      "flex items-center px-2 py-1.5 text-sm cursor-pointer rounded-sm",
                                      isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                                      !eligibleByAge ? "opacity-50 cursor-not-allowed" : ""
                                    )}
                                    onClick={() => {
                                      if (!eligibleByAge) return;
                                      const currentValues = [...field.value];
                                      const newValues = isSelected
                                        ? currentValues.filter(id => id !== groupId)
                                        : [...currentValues, groupId];
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
                  disabled={isFormLoading || aadharVerified}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isFormLoading || aadharVerified}>
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
