using System.Linq;
using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace Common.IAM
{
    /// <summary>
    /// Explicit rule entry matching a dynamic role context to an allowed action on a targeted resource.
    /// </summary>
    public class AceEntry : IEquatable<AceEntry>
    {
        public SecurityRole Role { get; }
        public string ResourceTarget { get; }
        public PermissionAction Action { get; }

        public AceEntry(SecurityRole role, string resourceTarget, PermissionAction action)
        {
            if (role == null) throw new ArgumentNullException(nameof(role));
            if (string.IsNullOrWhiteSpace(resourceTarget)) 
                throw new ArgumentException("Resource target identifier cannot be empty.", nameof(resourceTarget));

            Role = role;
            ResourceTarget = resourceTarget.Trim().ToLowerInvariant();
            Action = action;
        }

        public bool Equals(AceEntry other)
        {
            if (other is null) return false;
            return Role.Equals(other.Role) && 
                   ResourceTarget == other.ResourceTarget && 
                   Action == other.Action;
        }

        public override bool Equals(object obj) => Equals(obj as AceEntry);

        public override int GetHashCode()
        {
            return HashCode.Combine(Role, ResourceTarget, Action);
        }
    }
}
