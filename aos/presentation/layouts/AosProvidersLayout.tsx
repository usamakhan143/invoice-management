import React from "react";
import { Outlet } from "react-router-dom";
import { AosProviders } from "../providers";

/**
 * Route layout wrapping all /aos/* routes with AOS provider stack.
 */
const AosProvidersLayout: React.FC = () => {
  return (
    <AosProviders>
      <Outlet />
    </AosProviders>
  );
};

export default AosProvidersLayout;
