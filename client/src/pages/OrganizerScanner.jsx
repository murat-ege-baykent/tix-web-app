import React, { useState, useContext } from "react";
import QrScanner from "react-qr-scanner";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const OrganizerScanner = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [scanResult, setScanResult] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle, scanning, success, already-scanned, error
  const [ticketData, setTicketData] = useState(null);

  const handleScan = (data) => {
    if (data && status === "idle") { 
      verifyTicket(data.text);
    }
  };

  const handleError = (err) => {
    console.error(err);
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      alert("❌ Camera access denied. Please enable camera permissions in your settings.");
    }
  };

  const verifyTicket = async (code) => {
    setStatus("loading");
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/tickets/verify`, 
        { qrCode: code },
        { headers: { token: `Bearer ${user.accessToken}` } }
      );
      
      setTicketData(res.data);
      setStatus("success");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setStatus("already-scanned");
      } else {
        setStatus("error");
      }
      setScanResult(code);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setTicketData(null);
    setStatus("idle");
    setManualCode("");
  };

  return (
    <div style={{ maxWidth: "500px", margin: "20px auto", textAlign: "center", padding: "20px" }}>
      <button onClick={() => navigate("/")} style={{ float: "left", background: "none", border: "none", cursor: "pointer" }}>← Back</button>
      <h2 style={{ color: "#333" }}>🎟 Ticket Scanner</h2>

      {/* --- SUCCESS RESULT --- */}
      {status === "success" && (
        <div style={{ background: "#d4edda", color: "#155724", padding: "20px", borderRadius: "10px", margin: "20px 0", border: "2px solid #c3e6cb" }}>
          <h1 style={{ margin: 0 }}>✅ VALID</h1>
          <hr style={{ opacity: 0.5 }} />
          <p><strong>Event:</strong> {ticketData.event}</p>
          <p><strong>Guest:</strong> {ticketData.owner}</p>
          <p><strong>Qty:</strong> {ticketData.quantity} Ticket(s)</p>
          <button onClick={resetScanner} style={{ padding: "10px 20px", background: "#155724", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginTop: "10px" }}>Scan Next</button>
        </div>
      )}

      {/* --- ALREADY SCANNED WARNING --- */}
      {status === "already-scanned" && (
        <div style={{ background: "#fff3cd", color: "#856404", padding: "20px", borderRadius: "10px", margin: "20px 0", border: "2px solid #ffeeba" }}>
          <h1 style={{ margin: 0 }}>⚠️ USED</h1>
          <p>This ticket has already been scanned.</p>
          <button onClick={resetScanner} style={{ padding: "10px 20px", background: "#856404", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>Scan Next</button>
        </div>
      )}

      {/* --- ERROR RESULT --- */}
      {status === "error" && (
        <div style={{ background: "#f8d7da", color: "#721c24", padding: "20px", borderRadius: "10px", margin: "20px 0", border: "2px solid #f5c6cb" }}>
          <h1 style={{ margin: 0 }}>❌ INVALID</h1>
          <p>Ticket not found or fake.</p>
          <button onClick={resetScanner} style={{ padding: "10px 20px", background: "#721c24", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginTop: "10px" }}>Try Again</button>
        </div>
      )}

      {/* --- CAMERA AREA --- */}
      {status === "idle" && (
        <div style={{ marginTop: "20px" }}>
          <div style={{ 
            border: "5px solid #333", 
            borderRadius: "20px", 
            overflow: "hidden", 
            height: "300px", 
            background: "#000", 
            position: "relative",
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center" 
          }}>
            {/* 🟢 Visual Scanner Box */}
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "180px",
              height: "180px",
              border: "2px solid #00ff00",
              boxShadow: "0 0 0 4000px rgba(0, 0, 0, 0.4)",
              zIndex: 1,
              pointerEvents: "none",
              borderRadius: "10px"
            }}></div>

            <QrScanner
              delay={300}
              onError={handleError}
              onScan={handleScan}
              constraints={{ video: { facingMode: "environment" } }} // 👈 Forces Back Camera
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <p style={{ color: "#777", marginTop: "10px" }}>Point back camera at QR Code</p>
          
          <hr style={{ margin: "20px 0" }} />
          
          <input 
            placeholder="Or type code manually..." 
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            style={{ padding: "10px", width: "60%" }}
          />
          <button onClick={() => verifyTicket(manualCode)} style={{ padding: "10px", width: "30%" }}>Check</button>
        </div>
      )}
    </div>
  );
};

export default OrganizerScanner;