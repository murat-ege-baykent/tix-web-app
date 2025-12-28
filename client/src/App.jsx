import React, { useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

// Import Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import AttendeeDashboard from "./pages/AttendeeDashboard"; 
import MyTickets from "./pages/MyTickets"; // <--- Import
import OrganizerScanner from "./pages/OrganizerScanner";


function App() {
  const { user } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <Routes>
        
        {/* --- ROLE BASED DASHBOARDS --- */}

        {/* 1. ATTENDEE (Default View) */}
        {/* Even guests can see this, but Purchase button will require login */}
        <Route path="/" element={<AttendeeDashboard />} />
        <Route path="/my-tickets" element={<MyTickets />} />

        {/* 2. ADMIN (Protected) */}
        <Route path="/admin" element={
            user && user.role === 'admin' 
            ? <AdminDashboard /> 
            : <Navigate to="/login" />
        } />

        {/* 3. ORGANIZER (Protected) */}
        <Route path="/organizer" element={
            user && (user.role === 'organizer' || user.role === 'admin') 
            ? <OrganizerDashboard /> 
            : <Navigate to="/login" />
        } />
        <Route path="/scanner" element={<OrganizerScanner />} />
        
        {/* --- AUTHENTICATION --- */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;