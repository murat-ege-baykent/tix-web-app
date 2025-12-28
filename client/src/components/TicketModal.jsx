import React from "react";
import QRCode from "react-qr-code";

const TicketModal = ({ ticket, onClose }) => {
  if (!ticket) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
    }}>
      <div style={{ background: "white", padding: "30px", borderRadius: "10px", textAlign: "center", maxWidth: "400px", width: "90%" }}>
        <h2 style={{ color: "green", marginTop: 0 }}>Purchase Successful!</h2>
        <p>Your ticket has been queued and generated.</p>
        
        <div style={{ background: "#f4f4f4", padding: "20px", borderRadius: "10px", margin: "20px 0" }}>
          {/* This component turns the String into a Graphic */}
          <QRCode value={ticket.qrCode} size={200} />
        </div>

        <p style={{ fontSize: "12px", color: "#555", wordBreak: "break-all" }}>
          <strong>Ticket Code:</strong><br/> {ticket.qrCode}
        </p>
        
        <button 
          onClick={onClose} 
          style={{ padding: "10px 20px", background: "#0071c2", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px" }}
        >
          Close & Check Email
        </button>
      </div>
    </div>
  );
};

export default TicketModal;