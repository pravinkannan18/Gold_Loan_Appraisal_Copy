import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect directly to dashboard (no auth required)
    navigate("/dashboard");
  }, [navigate]);

  return null;
};

export default Index;
