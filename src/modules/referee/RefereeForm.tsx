import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, LoaderCircle } from "lucide-react";
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

import { post, put, get } from "@/services/apiService";
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
  zillaParishadPassYear: z.string().optional(),
  statePanchayatPassYear: z.string().optional(),
  allIndiaPanchayatPassYear: z.string().optional(),
  officeAddress: z.string().optional(),
  officePincode: z.string().optional(),
  officeContactNumber: z.string().optional(),
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
      zillaParishadPassYear: "",
      statePanchayatPassYear: "",
      allIndiaPanchayatPassYear: "",
      officeAddress: "",
      officePincode: "",
      officeContactNumber: "",
      password: "",
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
        "zillaParishadPassYear",
        refereeData.zillaParishadPassYear !== null && refereeData.zillaParishadPassYear !== undefined
          ? String(refereeData.zillaParishadPassYear)
          : ""
      );
      form.setValue(
        "statePanchayatPassYear",
        refereeData.statePanchayatPassYear !== null && refereeData.statePanchayatPassYear !== undefined
          ? String(refereeData.statePanchayatPassYear)
          : ""
      );
      form.setValue(
        "allIndiaPanchayatPassYear",
        refereeData.allIndiaPanchayatPassYear !== null && refereeData.allIndiaPanchayatPassYear !== undefined
          ? String(refereeData.allIndiaPanchayatPassYear)
          : ""
      );
      form.setValue("officeAddress", refereeData.officeAddress || "");
      form.setValue("officePincode", refereeData.officePincode || "");
      form.setValue("officeContactNumber", refereeData.officeContactNumber || "");

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
    mutationFn: (data: RefereeFormInputs) => post("/referees", data),
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
    mutationFn: (data: RefereeFormInputs) => put(`/referees/${refereeId}`, data),
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
      "zillaParishadPassYear",
      "statePanchayatPassYear",
      "allIndiaPanchayatPassYear",
      "officeAddress",
      "officePincode",
      "officeContactNumber",
      "password",
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

  const isFormLoading = isFetchingReferee || createRefereeMutation.isPending || updateRefereeMutation.isPending;

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
              <div className="grid grid-cols-3 gap-4 relative">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    First Name <span className="text-red-500">*</span>
                  </FormLabel>
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
                  <FormLabel>
                    Last Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter last name" {...field} disabled={isFormLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter address" {...field} disabled={isFormLoading} />
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

            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Contact Number <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter contact number" {...field} disabled={isFormLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emailId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter email" {...field} disabled={isFormLoading} />
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

            <FormField
              control={form.control}
              name="zillaParishadPassYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zilla Parishad Pass Year</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Enter year" {...field} disabled={isFormLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="statePanchayatPassYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State Panchayat Pass Year</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Enter year" {...field} disabled={isFormLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allIndiaPanchayatPassYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>All India Panchayat Pass Year</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Enter year" {...field} disabled={isFormLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Password {mode === "create" && <span className="text-red-500">*</span>}
                  </FormLabel>
                  <FormControl>
                    <PasswordInput placeholder={mode === "create" ? "Enter password" : "New password (optional)"} {...field} disabled={isFormLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
