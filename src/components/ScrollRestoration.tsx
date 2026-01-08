import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const scrollPositions: Record<string, number> = {};

export default function ScrollRestoration() {
  const { pathname, key } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // Save scroll position when navigating away
    const handleScroll = () => {
      scrollPositions[pathname] = window.scrollY;
    };

    window.addEventListener("scroll", handleScroll);
    
    // Restore position when navigating back or arriving
    if (navType === "POP" && scrollPositions[pathname] !== undefined) {
      // Use setTimeout to ensure the DOM has rendered
      setTimeout(() => {
        window.scrollTo({
          top: scrollPositions[pathname],
          behavior: "instant"
        });
      }, 0);
    } else if (navType === "PUSH") {
      window.scrollTo(0, 0);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname, navType, key]);

  return null;
}
