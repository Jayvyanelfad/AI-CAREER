// Session management functions
export const checkSession = () => {
  const token = localStorage.getItem("token");
  const session = JSON.parse(sessionStorage.getItem("userSession"));
  
  // Return session status without redirecting
  return token && session?.authenticated;
};

export const updateSession = () => {
  sessionStorage.setItem("userSession", JSON.stringify({
    authenticated: true,
    lastActivity: Date.now()
  }));
};

// For protected pages only - redirects if no session
export const protectRoute = () => {
  if (!checkSession()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
};