/**
 * Utility functions for managing user roles and permissions
 */

/**
 * Get the current user's role from localStorage
 * @returns {string | null} The user role or null if not found
 */
export const getUserRole = (): string | null => {
  // First try to get from dedicated role storage
  const role = localStorage.getItem('userRole');
  if (role) {
    return role;
  }

  // Fallback to getting role from user object
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user?.role || null;
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      return null;
    }
  }

  return null;
};

/**
 * Check if the current user has a specific role
 * @param {string} requiredRole - The role to check for
 * @returns {boolean} True if user has the role, false otherwise
 */
export const hasRole = (requiredRole: string): boolean => {
  const userRole = getUserRole();
  return userRole === requiredRole;
};

/**
 * Check if the current user has any of the specified roles
 * @param {string[]} requiredRoles - Array of roles to check for
 * @returns {boolean} True if user has any of the roles, false otherwise
 */
export const hasAnyRole = (requiredRoles: string[]): boolean => {
  const userRole = getUserRole();
  return userRole ? requiredRoles.includes(userRole) : false;
};

/**
 * Check if the current user is a SUPER_ADMIN
 * @returns {boolean} True if user is super admin, false otherwise
 */
export const isSuperAdmin = (): boolean => {
  return hasRole('SUPER_ADMIN');
};

/**
 * Check if the current user is an ADMIN
 * @returns {boolean} True if user is admin, false otherwise
 */
export const isAdmin = (): boolean => {
  return hasRole('ADMIN');
};

/**
 * Check if the current user is a CLUB
 * @returns {boolean} True if user is club, false otherwise
 */
export const isClub = (): boolean => {
  return hasRole('CLUB');
};

/**
 * Check if the current user is a USER
 * @returns {boolean} True if user is regular user, false otherwise
 */
export const isUser = (): boolean => {
  return hasRole('USER');
};

/**
 * Get user information from localStorage
 * @returns {any | null} User object or null if not found
 */
export const getUserInfo = (): any | null => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      return null;
    }
  }
  return null;
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is authenticated, false otherwise
 */
export const isAuthenticated = (): boolean => {
  return Boolean(localStorage.getItem('authToken'));
};
