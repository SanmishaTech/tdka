import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, LoaderCircle, Upload, X, Check } from "lucide-react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { post, put, get, postupload, putupload, verifyAadhar } from "@/services/apiService";
import Validate from "@/lib/Handlevalidation";
import { Referee } from "./types";

const baseSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  address: z.string().optional(),
  pincode: z.string().optional(),
  contactNumber: z.string().min(1, "Contact number is required"),
  emailId: z.string().email("Invalid email address"),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  districtParishadPassYear: z.string().optional(),
  stateRefreeExamPassYear: z.string().optional(),
  allIndiaRefreeExamPassYear: z.string().optional(),
  officeAddress: z.string().optional(),
  officePincode: z.string().optional(),
  officeContactNumber: z.string().optional(),
  aadharNumber: z.string()
    .length(12, "Aadhar number must be exactly 12 digits")
    .refine(val => /^\d+$/.test(val), { message: "Aadhar number can only contain digits" })
    .optional()
    .or(z.literal("")),
});

const createSchema = baseSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const editSchema = baseSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters long").optional(),
});

type RefereeFormInputs = z.infer<typeof editSchema>;

interface RefereeFormProps {
  mode: "create" | "edit";
  refereeId?: string;
  onSuccess?: () => void;
  className?: string;
}

const RefereeForm = ({ mode, refereeId, onSuccess, className }: RefereeFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [aadharImageFile, setAadharImageFile] = useState(null);
  const [aadharImagePreview, setAadharImagePreview] = useState<string | null>(null);
  const [existingAadharImage, setExistingAadharImage] = useState<string | null>(null);
  const [aadharVerified, setAadharVerified] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [shouldRemoveAadharImage, setShouldRemoveAadharImage] = useState<boolean>(false);

  const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3000").replace(/\/$/, "");
  const resolveUploadUrl = (p?: string | null) => {
    const s = String(p || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    const normalized = s.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${backendBaseUrl}/${normalized}`;
  };

  const form = useForm<RefereeFormInputs>({
    resolver: zodResolver(mode === "create" ? createSchema : (editSchema as any)),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      address: "",
      pincode: "",
      contactNumber: "",
      emailId: "",
      dateOfBirth: "",
      bloodGroup: "",
      districtParishadPassYear: "",
      stateRefreeExamPassYear: "",
      allIndiaRefreeExamPassYear: "",
      officeAddress: "",
      officePincode: "",
      officeContactNumber: "",
      password: "",
      aadharNumber: "",
    },
  });

  const { data: refereeData, isLoading: isFetchingReferee, error: fetchError } = useQuery({
    queryKey: ["referee", refereeId],
    queryFn: async (): Promise<Referee> => {
      if (!refereeId) throw new Error("Referee ID is required");
      const response = await get(`/referees/${refereeId}`);
      return response.referee || response;
    },
    enabled: mode === "edit" && !!refereeId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (refereeData && mode === "edit") {
      form.setValue("firstName", refereeData.firstName || "");
      form.setValue("middleName", refereeData.middleName || "");
      form.setValue("lastName", refereeData.lastName || "");
      form.setValue("address", refereeData.address || "");
      form.setValue("pincode", refereeData.pincode || "");
      form.setValue("contactNumber", refereeData.contactNumber || "");
      form.setValue("emailId", refereeData.emailId || refereeData.user?.email || "");

      const dob = refereeData.dateOfBirth ? String(refereeData.dateOfBirth).slice(0, 10) : "";
      form.setValue("dateOfBirth", dob);

      form.setValue("bloodGroup", refereeData.bloodGroup || "");
      form.setValue(
        "districtParishadPassYear",
        refereeData.districtParishadPassYear !== null && refereeData.districtParishadPassYear !== undefined
          ? String(refereeData.districtParishadPassYear)
          : ""
      );
      form.setValue(
        "stateRefreeExamPassYear",
        refereeData.stateRefreeExamPassYear !== null && refereeData.stateRefreeExamPassYear !== undefined
          ? String(refereeData.stateRefreeExamPassYear)
          : ""
      );
      form.setValue(
        "allIndiaRefreeExamPassYear",
        refereeData.allIndiaRefreeExamPassYear !== null && refereeData.allIndiaRefreeExamPassYear !== undefined
          ? String(refereeData.allIndiaRefreeExamPassYear)
          : ""
      );
      form.setValue("officeAddress", refereeData.officeAddress || "");
      form.setValue("officePincode", refereeData.officePincode || "");
      form.setValue("officeContactNumber", refereeData.officeContactNumber || "");
      form.setValue("aadharNumber", refereeData.aadharNumber || "");

      if (refereeData.aadharImage) {
        const imageUrl = resolveUploadUrl(refereeData.aadharImage);
        setExistingAadharImage(imageUrl);
        setAadharImagePreview(imageUrl);
      }
      setAadharVerified(!!refereeData.aadharVerified);

      form.setValue("password", "");
    }
  }, [refereeData, mode, form]);

  useEffect(() => {
    if (fetchError && mode === "edit") {
      toast.error((fetchError as any)?.message || "Failed to fetch referee details");
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/referees");
      }
    }
  }, [fetchError, mode, onSuccess, navigate]);

  const createRefereeMutation = useMutation({
    mutationFn: async (data: any) => {
      if (aadharImageFile) {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
          if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
          }
        });
        formData.append("aadharImage", aadharImageFile);
        return postupload("/referees", formData);
      }
      return post("/referees", data);
    },
    onSuccess: () => {
      toast.success("Referee created successfully");
      queryClient.invalidateQueries({ queryKey: ["referees"] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/referees");
      }
    },
    onError: (error: any) => {
      Validate(error, form.setError);
      toast.error(error.errors?.message || error.message || "Failed to create referee");
    },
  });

  const updateRefereeMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!refereeId) throw new Error("Referee ID is missing");
      if (aadharImageFile) {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
          if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
          }
        });
        formData.append("aadharImage", aadharImageFile);
        if (aadharVerified) formData.append("aadharVerified", "true");
        return putupload(`/referees/${refereeId}`, formData);
      }
      return put(`/referees/${refereeId}`, { ...data, aadharVerified });
    },
    onSuccess: () => {
      toast.success("Referee updated successfully");
      queryClient.invalidateQueries({ queryKey: ["referees"] });
      queryClient.invalidateQueries({ queryKey: ["referee", refereeId] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/referees");
      }
    },
    onError: (error: any) => {
      Validate(error, form.setError);
      toast.error(error.errors?.message || error.message || "Failed to update referee");
    },
  });

  const cleanPayload = (data: RefereeFormInputs) => {
    const optionalKeys: Array<keyof RefereeFormInputs> = [
      "middleName",
      "address",
      "pincode",
      "dateOfBirth",
      "bloodGroup",
      "districtParishadPassYear",
      "stateRefreeExamPassYear",
      "allIndiaRefreeExamPassYear",
      "officeAddress",
      "officePincode",
      "officeContactNumber",
      "password",
      "aadharNumber",
    ];

    const payload: any = { ...data };
    optionalKeys.forEach((k) => {
      if (payload[k] === "") {
        delete payload[k];
      }
    });

    if (mode === "edit" && !payload.password) {
      delete payload.password;
    }

    return payload;
  };

  const onSubmit = (data: RefereeFormInputs) => {
    const payload = cleanPayload(data);
    if (mode === "create") {
      createRefereeMutation.mutate(payload);
    } else {
      updateRefereeMutation.mutate(payload);
    }
  };

  const handleCancel = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      navigate("/referees");
    }
  };

  const isFormLoading = isFetchingReferee || createRefereeMutation.isPending || updateRefereeMutation.isPending || isVerifying;

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
    setAadharVerified(false);
  };

  const handleRemoveAadharImage = () => {
    setAadharImagePreview(null);
    setAadharImageFile(null);
    setExistingAadharImage(null);
    setShouldRemoveAadharImage(true);
    setAadharVerified(false);
  };

  const handleVerifyAadhar = async () => {
    if (isFormLoading || isVerifying) return;
    const aadharNumber = form.getValues("aadharNumber") as string;

    // Get form values for verification match
    const formValues = form.getValues();
    const firstName = formValues.firstName;
    const lastName = formValues.lastName;
    const dateOfBirth = formValues.dateOfBirth;

    if (!aadharNumber || aadharNumber.length !== 12) {
      toast.error("Enter valid 12-digit Aadhaar number first");
      return;
    }

    if (!aadharImageFile && !existingAadharImage) {
      toast.error("Upload Aadhaar image first");
      return;
    }

    try {
      setIsVerifying(true);
      form.clearErrors(["aadharNumber"]);
      const formData = new FormData();
      formData.append("aadharNumber", aadharNumber);

      // Append form values for verification
      if (firstName) formData.append("firstName", firstName);
      if (lastName) formData.append("lastName", lastName);
      if (dateOfBirth) formData.append("dateOfBirth", dateOfBirth);

      if (aadharImageFile) {
        formData.append("file", aadharImageFile);
      }

      const url = mode === "edit" && refereeId ? `/referees/${refereeId}/verify-aadhar` : "/referees/verify-aadhar";

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
        toast.error("Verification failed: " + (resp?.mismatchReasons?.join(", ") || "Mismatch found"));
      }
    } catch (error: any) {
      toast.error(error?.message || "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={["p-6", className].filter(Boolean).join(" ")}>
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
        <h1 className="text-2xl font-bold flex-1 text-center">{mode === "create" ? "Create" : "Edit"} Referee</h1>
        <div className="w-16"></div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
              <div className="space-y-6">

                {/* Personal Information */}
                <div className="border rounded-md p-4 space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Enter first name" {...field} disabled={isFormLoading} />
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
                            <Input placeholder="Enter middle name" {...field} disabled={isFormLoading} />
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
                            <Input placeholder="Enter last name" {...field} disabled={isFormLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={isFormLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bloodGroup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blood Group</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter blood group" {...field} disabled={isFormLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Contact & Account */}
                <div className="border rounded-md p-4 space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Contact & Account Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="emailId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email ID <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address" {...field} disabled={isFormLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Number <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Enter contact number" {...field} disabled={isFormLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Password {mode === "create" && <span className="text-red-500">*</span>}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={mode === "create" ? "Enter password" : "Leave blank to keep current"}
                              {...field}
                              disabled={isFormLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="border rounded-md p-4 space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Address Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full address" {...field} disabled={isFormLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pincode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pincode</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter pincode" {...field} disabled={isFormLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Exam Details */}
                <div className="border rounded-md p-4 space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Qualification / Exam Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="districtParishadPassYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>District Parishad Year</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Enter year" {...field} disabled={isFormLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="stateRefreeExamPassYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State Referee Exam Year</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Enter year" {...field} disabled={isFormLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="allIndiaRefreeExamPassYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>All India Referee Exam Year</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Enter year" {...field} disabled={isFormLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Office Details */}
                <div className="border rounded-md p-4 space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Office Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="officeAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Office Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter office address" {...field} disabled={isFormLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="officePincode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Office Pincode</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter office pincode" {...field} disabled={isFormLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="officeContactNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Office Contact Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter office contact number" {...field} disabled={isFormLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Aadhar Verification */}
                <div className="border rounded-md p-4 space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Aadhar Verification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="aadharNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aadhar Number</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input placeholder="Enter 12-digit Aadhar number" {...field} disabled={isFormLoading || aadharVerified} maxLength={12} />
                            </FormControl>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={handleVerifyAadhar}
                              disabled={isFormLoading || !field.value || field.value.length !== 12 || aadharVerified}
                            >
                              {isVerifying ? <LoaderCircle className="w-4 h-4 animate-spin" /> : (aadharVerified ? <Check className="w-4 h-4 text-green-600" /> : "Verify")}
                            </Button>
                          </div>
                          {aadharVerified && <p className="text-sm text-green-600 flex items-center mt-1"><Check className="w-3 h-3 mr-1" /> Verified</p>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <FormLabel>Aadhar Card Image</FormLabel>
                      <div className="flex items-center gap-4">
                        {aadharImagePreview ? (
                          <div className="relative w-32 h-20 border rounded overflow-hidden">
                            <img src={aadharImagePreview} alt="Aadhar Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={handleRemoveAadharImage}
                              disabled={isFormLoading}
                              className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow hover:bg-gray-100"
                            >
                              <X className="w-3 h-3 text-red-500" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-32 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50 text-gray-400">
                            <span>No Image</span>
                          </div>
                        )}
                        <div>
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
                                Upload
                              </span>
                            </Button>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleAadharImageFileSelect}
                              className="sr-only"
                              disabled={isFormLoading}
                            />
                          </label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Max 2MB (JPEG, PNG)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isFormLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isFormLoading}>
                  {isFormLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "create" ? "Create" : "Update"} Referee
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RefereeForm;
