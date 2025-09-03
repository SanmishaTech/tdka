import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ClubList from "@/modules/club/ClubList";
import CompetitionList from "@/modules/competition/CompetitionList";

const AdminDashboard: React.FC = () => {
  let user: any = null;
  try {
    const userStr = localStorage.getItem("user");
    user = userStr ? JSON.parse(userStr) : null;
  } catch {}

  const name = user?.name || user?.fullName || user?.email || "Admin";

  return (
    <div className="space-y-6 p-6">
      {/* Welcome */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {name}</CardTitle>
          <CardDescription>Here is a quick view of clubs and competitions.</CardDescription>
        </CardHeader>
      </Card>

      {/* Clubs List */}
      <Card className="border-none shadow-none p-0">
        <CardContent className="p-0">
          <ClubList />
        </CardContent>
      </Card>

      {/* Competitions List */}
      <Card className="border-none shadow-none p-0">
        <CardContent className="p-0">
          <CompetitionList />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
