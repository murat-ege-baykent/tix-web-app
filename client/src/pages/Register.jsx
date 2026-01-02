import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css"; 

const Register = () => {
  const [info, setInfo] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    role: "attendee" // ✅ ROLE IS NOW HARDCODED TO ATTENDEE
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setInfo((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleClick = async (e) => {
    e.preventDefault();
    try {
      // NOTE: Ensure VITE_API_BASE_URL is set in your .env file
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/register`, info);
      alert("Account created successfully!");
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("Error creating account. Check console for details.");
    }
  };

  return (
    <div className="loginContainer">
      <div className="loginWrapper">
        <h2>Register for Tix</h2>
        <p style={{fontSize: "14px", color: "gray", textAlign: "center", marginBottom: "20px"}}>
          Create an account to discover and buy concert tickets.
        </p>
        
        <input 
          id="username" 
          onChange={handleChange} 
          className="lInput" 
          placeholder="Username" 
          required
        />
        
        <input 
          id="email" 
          onChange={handleChange} 
          className="lInput" 
          placeholder="Email" 
          required
        />
        
        <input 
          id="fullName" 
          onChange={handleChange} 
          className="lInput" 
          placeholder="Full Name (Ad Soyad)" 
          required
        />

        <input 
          id="password" 
          type="password" 
          onChange={handleChange} 
          className="lInput" 
          placeholder="Password" 
          required
        />
        
        {/* ❌ ROLE SELECTION REMOVED FOR SECURITY */}

        <button onClick={handleClick} className="lButton">Register</button>
        
        <a href="/login" style={{textAlign:"center", marginTop:"10px", textDecoration:"none", color:"#0071c2"}}>
          Already have an account? Login
        </a>
      </div>
    </div>
  );
};

export default Register;