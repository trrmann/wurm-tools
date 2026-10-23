using System.Linq;
using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace Common.IAM
{
    /// <summary>
    /// Handles user lifecycle operations, cryptographically sound credential evaluation, 
    /// and explicit authorization checks across dynamic roles.
    /// </summary>
    public class DynamicIdentityManager
    {
        private readonly Dictionary<string, SecurityUser> _userStore = new Dictionary<string, SecurityUser>(StringComparer.OrdinalIgnoreCase);
        private const int SaltSize = 32;

        /// <summary>
        /// Registers a user with custom configured text-based roles.
        /// </summary>
        public SecurityUser RegisterUser(string username, string plaintextPassword, IEnumerable<string> roleNames)
        {
            if (string.IsNullOrWhiteSpace(username)) throw new ArgumentNullException(nameof(username));
            if (string.IsNullOrWhiteSpace(plaintextPassword)) throw new ArgumentNullException(nameof(plaintextPassword));
            if (_userStore.ContainsKey(username)) throw new InvalidOperationException("User already exists.");

            byte[] saltBytes = RandomNumberGenerator.GetBytes(SaltSize);
            string saltStr = Convert.ToBase64String(saltBytes);
            string hashStr = ComputeHash(plaintextPassword, saltBytes);

            var user = new SecurityUser
            {
                Username = username,
                PasswordHash = hashStr,
                Salt = saltStr
            };

            if (roleNames != null)
            {
                foreach (var name in roleNames)
                {
                    // Dynamically provision the role context if it is not already explicitly added
                    if (!SystemRoles.IsRegistered(name))
                    {
                        SystemRoles.Register(name);
                    }
                    user.Roles.Add(new SecurityRole(name));
                }
            }

            _userStore[username] = user;
            return user;
        }

        /// <summary>
        /// Authenticates the user profile using timing-attack resistant comparisons.
        /// </summary>
        public bool Authenticate(string username, string plaintextPassword, out SecurityUser user)
        {
            user = null;
            if (!_userStore.TryGetValue(username, out var foundUser)) return false;
            if (foundUser.IsLockedOut) return false;

            byte[] saltBytes = Convert.FromBase64String(foundUser.Salt);
            string calculatedHash = ComputeHash(plaintextPassword, saltBytes);

            if (CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(foundUser.PasswordHash), 
                Encoding.UTF8.GetBytes(calculatedHash)))
            {
                foundUser.LastLoginTime = DateTime.UtcNow;
                user = foundUser;
                return true;
            }

            return false;
        }

        /// <summary>
        /// Validates that a user holds authorization for a designated context role string.
        /// </summary>
        public bool IsUserInRole(SecurityUser user, string requiredRoleName)
        {
            if (user == null || string.IsNullOrWhiteSpace(requiredRoleName)) return false;

            // Admin tier automatically satisfies access requirements across all dynamic scopes
            if (user.Roles.Contains(SystemRoles.Admin)) return true;

            return user.Roles.Contains(new SecurityRole(requiredRoleName));
        }

        private string ComputeHash(string password, byte[] salt)
        {
            using var rfc2898 = new Rfc2898DeriveBytes(password, salt, 350000, HashAlgorithmName.SHA512);
            return Convert.ToBase64String(rfc2898.GetBytes(64));
        }
    }
}
