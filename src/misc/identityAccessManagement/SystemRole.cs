namespace Common.IAM
{
    /// <summary>
    /// Holds the system-wide catalog of valid dynamic roles.
    /// </summary>
    public static class SystemRoles
    {
        private static readonly HashSet<SecurityRole> _registeredRoles = new HashSet<SecurityRole>();

        // System Constants
        public static readonly SecurityRole Admin = Register("Admin");

        public static SecurityRole Register(string name)
        {
            var role = new SecurityRole(name);
            _registeredRoles.Add(role);
            return role;
        }

        public static bool IsRegistered(string name)
        {
            return _registeredRoles.Contains(new SecurityRole(name));
        }

        public static void ClearCustomRoles()
        {
            _registeredRoles.Clear();
            _registeredRoles.Add(Admin);
        }
    }

}
