import React from "react";
import AdminDashboard from "@/modules/Dashboard/AdminDashboard";
import ClubAdminDashboard from "@/modules/Dashboard/ClubAdminDashboard";

const RoleBasedDashboard: React.FC = () => {
  // Read user and role from localStorage (aligned with ProtectedRoute)
  let user: any = null;
  try {
    const userStr = localStorage.getItem("user");
    user = userStr ? JSON.parse(userStr) : null;
  } catch {}

  const role = user?.role as string | undefined;

  if (role === "admin") return <AdminDashboard />;
  if (role === "clubadmin") return <ClubAdminDashboard />;

  // Fallback: simple welcome for other roles
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Welcome</h1>
        <p className="text-muted-foreground">
          You are logged in{role ? ` as ${role}` : ""}. No specific dashboard available.
        </p>
      </div>
    </div>
  );
};

export default RoleBasedDashboard;
