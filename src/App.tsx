//Vipul
import { useEffect } from "react";
import { appName } from "./config"; // Import appName from config
import {
  BrowserRouter as Router,
  Routes,
  Route,

} from "react-router-dom";

import AuthLayout from "./layouts/AuthLayout";
import MainLayout from "./layouts/MainLayout";
import Login from "./modules/Auth/Login";
import Register from "./modules/Auth/Register";
import ForgotPassword from "./modules/Auth/ForgotPassword";
import ResetPassword from "./modules/Auth/ResetPassword";
import ProtectedRoute from "./components/common/protected-route"; // Correct path
import UserList from "@/modules/User/UserList";
import GroupList from "@/modules/group/GroupList";
import TalukaList from "@/modules/place/PlaceList";
import CreateTaluka from "@/modules/place/CreatePlace";
import EditTaluka from "@/modules/place/EditPlace";
import { RegionList, CreateRegion, EditRegion } from "@/modules/region";
import { RefereeList, CreateReferee, EditReferee } from "@/modules/referee";
import ClubList from "@/modules/club/ClubList";
import CreateClub from "./modules/club/CreateClub";
import EditClub from "./modules/club/EditClub";
 import CompetitionList from "@/modules/competition/CompetitionList";
import CreateCompetition from "./modules/competition/CreateCompetition";
import EditCompetition from "./modules/competition/EditCompetition";
import CompetitionDetails from "./modules/competition/CompetitionDetails";
import CompetitionClubDetails from "./modules/competition/CompetitionClubDetails";
import ClubCompetitionList from "@/modules/clubcompetition/ClubCompetitionList";
import ClubCompetitionDetails from "@/modules/clubcompetition/ClubCompetitionDetails";
import { PlayerList } from "@/modules/players";
import CreatePlayer from "./modules/players/CreatePlayer";
import EditPlayer from "./modules/players/EditPlayer";
import Profile from "./modules/profile/EditAgency";
import RoleBasedDashboard from "@/modules/Dashboard/RoleBasedDashboard";
import Registerformat from "./modules/Register/register";
import Unauthorized from "./components/common/Unauthorized";

import { Toaster } from "sonner";
import "./App.css";
const App = () => {
  // Set to false to disable the background animation
  const showAnimation = true;

  useEffect(() => {
    document.title = appName; // Set the document title
  }, []);

  return (
    <>
      {showAnimation && <div className="background-blur"></div>}
      <Toaster richColors position="top-center" />
      <Router>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
          </Route>
          <Route element={<MainLayout />}>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={['admin', 'clubadmin']}>
                  <RoleBasedDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <UserList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reset-password/:token"
              element={
                <ProtectedRoute>
                  <ResetPassword />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clubs"
              element={
                <ProtectedRoute roles={['admin']}>
                  <ClubList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clubs/create"
              element={
                <ProtectedRoute roles={['admin']}>
                  <CreateClub />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clubs/edit/:id"
              element={
                <ProtectedRoute roles={['admin']}>
                  <EditClub />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/groups"
              element={
                <ProtectedRoute roles={['admin']}>
                  <GroupList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/talukas"
              element={
                <ProtectedRoute roles={['admin']}>
                  <TalukaList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/talukas/create"
              element={
                <ProtectedRoute roles={['admin']}>
                  <CreateTaluka />
                </ProtectedRoute>
              }
            />
            <Route
              path="/talukas/edit/:id"
              element={
                <ProtectedRoute roles={['admin']}>
                  <EditTaluka />
                </ProtectedRoute>
              }
            />
            <Route
              path="/regions"
              element={
                <ProtectedRoute roles={['admin']}>
                  <RegionList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/regions/create"
              element={
                <ProtectedRoute roles={['admin']}>
                  <CreateRegion />
                </ProtectedRoute>
              }
            />
            <Route
              path="/regions/edit/:id"
              element={
                <ProtectedRoute roles={['admin']}>
                  <EditRegion />
                </ProtectedRoute>
              }
            />

            <Route
              path="/referees"
              element={
                <ProtectedRoute roles={['admin']}>
                  <RefereeList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/referees/create"
              element={
                <ProtectedRoute roles={['admin']}>
                  <CreateReferee />
                </ProtectedRoute>
              }
            />
            <Route
              path="/referees/edit/:id"
              element={
                <ProtectedRoute roles={['admin']}>
                  <EditReferee />
                </ProtectedRoute>
              }
            />
            <Route
              path="/competitions"
              element={
                <ProtectedRoute roles={['admin']}>
                  <CompetitionList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/competitions/create"
              element={
                <ProtectedRoute roles={['admin']}>
                  <CreateCompetition />
                </ProtectedRoute>
              }
            />
            <Route
              path="/competitions/edit/:id"
              element={
                <ProtectedRoute roles={['admin']}>
                  <EditCompetition />
                </ProtectedRoute>
              }
            />
            <Route
              path="/competitions/:id"
              element={
                <ProtectedRoute roles={['admin']}>
                  <CompetitionDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/competitions/:competitionId/clubs/:clubId"
              element={
                <ProtectedRoute roles={['admin']}>
                  <CompetitionClubDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="/players"
              element={
                <ProtectedRoute roles={['admin', 'clubadmin']}>
                  <PlayerList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/players/create"
              element={
                <ProtectedRoute roles={['admin', 'clubadmin']}>
                  <CreatePlayer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/players/edit/:id"
              element={
                <ProtectedRoute roles={['admin', 'clubadmin']}>
                  <EditPlayer />
                </ProtectedRoute>
              }
            />

            <Route
              path="/clubcompetitions"
              element={
                <ProtectedRoute roles={['clubadmin']}>
                  <ClubCompetitionList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clubcompetitions/:id"
              element={
                <ProtectedRoute roles={['clubadmin']}>
                  <ClubCompetitionDetails />
                </ProtectedRoute>
              }
            />

            {/* Observer routes mirroring club competition separation */}
            <Route
              path="/observercompetitions"
              element={
                <ProtectedRoute roles={['observer']}>
                  <CompetitionList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/observercompetitions/:id"
              element={
                <ProtectedRoute roles={['observer']}>
                  <CompetitionDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/observercompetitions/:competitionId/clubs/:clubId"
              element={
                <ProtectedRoute roles={['observer']}>
                  <CompetitionClubDetails />
                </ProtectedRoute>
              }
            />

            {/* Referee routes mirroring observer separation */}
            <Route
              path="/refereecompetitions"
              element={
                <ProtectedRoute roles={['referee']}>
                  <CompetitionList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/refereecompetitions/:id"
              element={
                <ProtectedRoute roles={['referee']}>
                  <CompetitionDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/refereecompetitions/:competitionId/clubs/:clubId"
              element={
                <ProtectedRoute roles={['referee']}>
                  <CompetitionClubDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="/registers"
              element={
                <ProtectedRoute>
                  <Registerformat />
                </ProtectedRoute>
              }
            />

            {/* Unauthorized access page */}
            <Route path="/unauthorized" element={<Unauthorized />} />

          </Route>
        </Routes>
      </Router>
    </>
  );
};

export default App;
