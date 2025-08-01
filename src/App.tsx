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
import ClubList from "@/modules/club/ClubList";
import CompetitionList from "@/modules/competition/CompetitionList";
import { PlayerList } from "@/modules/players";
import CreatePlayer from "./modules/players/CreatePlayer";
import EditPlayer from "./modules/players/EditPlayer";
import Profile from "./modules/profile/EditAgency";
import Dashboard from "./modules/Dashboard/dashboard";
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
                <ProtectedRoute>
                  <Dashboard />
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
              path="/groups"
              element={
                <ProtectedRoute roles={['admin']}>
                  <GroupList />
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
