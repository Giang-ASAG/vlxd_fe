"use client";

import { Navigate, useLocation } from "react-router-dom";
import { getSession } from "./session";

export function RequireAuth({ children }) {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

