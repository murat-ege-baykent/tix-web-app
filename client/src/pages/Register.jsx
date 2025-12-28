import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // We reuse the styles from Login

const Register = () => {
  const [info, setInfo] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    role: "attendee" // Default role
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setInfo((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleClick = async (e) => {
    e.preventDefault();
    try {
      // NOTE: Make sure this URL matches your backend port (3000)
      await axios.post("http://localhost:3000/api/auth/register", info);
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
        
        <input 
          id="username" 
          onChange={handleChange} 
          className="lInput" 
          placeholder="Username" 
        />
        
        <input 
          id="email" 
          onChange={handleChange} 
          className="lInput" 
          placeholder="Email" 
        />
        
        <input 
          id="fullName" 
          onChange={handleChange} 
          className="lInput" 
          placeholder="Full Name (Ad Soyad)" 
        />

        <input 
          id="password" 
          type="password" 
          onChange={handleChange} 
          className="lInput" 
          placeholder="Password" 
        />
        
        <label style={{fontSize: "12px", color: "gray", marginBottom: "-10px"}}>Select Role:</label>
        <select id="role" onChange={handleChange} className="lInput">
            <option value="attendee">Attendee (Buy Tickets)</option>
            <option value="organizer">Organizer (Create Events)</option>
            <option value="admin">Admin</option>
        </select>

        <button onClick={handleClick} className="lButton">Register</button>
        
        <a href="/login" style={{textAlign:"center", marginTop:"10px", textDecoration:"none", color:"#0071c2"}}>
          Already have an account? Login
        </a>
      </div>
    </div>
  );
};

export default Register;