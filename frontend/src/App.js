import React from "react";
import "./index.css";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Spinner } from "./components/ui";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AppLayout from "./pages/AppLayout";
import Overview from "./pages/Overview";
import Jobs from "./pages/Jobs";
import Inventory from "./pages/Inventory";
import Settings from "./pages/Settings";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-bg"><Spinner label="Loading" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-bg"><Spinner label="Loading" /></div>;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: "#121216", border: "1px solid #1E1E24", color: "#fff", fontFamily: "JetBrains Mono, monospace", borderRadius: 0 } }} />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<PublicOnly><Auth /></PublicOnly>} />
          <Route path="/app" element={<Protected><AppLayout /></Protected>}>
            <Route index element={<Overview />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
