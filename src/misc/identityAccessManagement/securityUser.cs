using System.Linq;
using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace Common.IAM
{
    /// <summary>
    /// Represents a secure user record within the dynamic identity management environment.
    /// </summary>
    public class SecurityUser
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Username { get; set; }
        public string PasswordHash { get; set; }
        public string Salt { get; set; }
        public HashSet<SecurityRole> Roles { get; set; } = new HashSet<SecurityRole>();
        public bool IsLockedOut { get; set; } = false;
        public DateTime? LastLoginTime { get; set; }
    }

}
