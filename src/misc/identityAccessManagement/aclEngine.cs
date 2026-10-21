namespace Common.IAM
{
    /// <summary>
    /// Access Control List authorization matching engine for evaluating dynamic security profiles.
    /// </summary>
    public class AclEngine
    {
        private readonly HashSet<AceEntry> _rules = new HashSet<AceEntry>();
        private readonly object _lock = new object();

        /// <summary>
        /// Grants a specific permission action to a dynamic role for a designated resource path.
        /// </summary>
        public void Grant(SecurityRole role, string resourceTarget, PermissionAction action)
        {
            lock (_lock)
            {
                var entry = new AceEntry(role, resourceTarget, action);
                _rules.Add(entry);
            }
        }

        /// <summary>
        /// Revokes an existing permission action mapping from a role.
        /// </summary>
        public bool Revoke(SecurityRole role, string resourceTarget, PermissionAction action)
        {
            lock (_lock)
            {
                var entry = new AceEntry(role, resourceTarget, action);
                return _rules.Remove(entry);
            }
        }

        /// <summary>
        /// Evaluates a user context against authorization rules. 
        /// Admin roles automatically bypass checks, returning true for all resource permissions.
        /// </summary>
        public bool IsAuthorized(SecurityUser user, string resourceTarget, PermissionAction action)
        {
            if (user == null || string.IsNullOrWhiteSpace(resourceTarget)) return false;

            // Administrative override rule
            if (user.Roles.Contains(SystemRoles.Admin)) return true;

            string normalizedTarget = resourceTarget.Trim().ToLowerInvariant();

            lock (_lock)
            {
                // Check if any of the user's assigned roles possess an explicit authorization entry matching target parameters
                return user.Roles.Any(role => _rules.Contains(new AceEntry(role, normalizedTarget, action)));
            }
        }

        /// <summary>
        /// Flushes out custom permission rule assignments from memory storage.
        /// </summary>
        public void ClearRules()
        {
            lock (_lock)
            {
                _rules.Clear();
            }
        }
    }
}
