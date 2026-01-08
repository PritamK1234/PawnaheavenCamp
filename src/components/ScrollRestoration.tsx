import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export default function ScrollRestoration() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // Scroll to top only on "PUSH" navigation (going to a new page)
    // On "POP" navigation (back button), the browser/React Router will handle 
    // restoration naturally if we don't interfere.
    if (navType === "PUSH") {
      window.scrollTo(0, 0);
    }
  }, [pathname, navType]);

  return null;
}
