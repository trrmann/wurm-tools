using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;

namespace Heros.IAM
{
    /// <summary>
    /// Root Identity and Access Management governance engine for the Heroes ecosystem.
    /// </summary>
    public class HeroesAppIdentityManager
    {
        private readonly ConcurrentDictionary<string, HeroesUserContext> _users = new ConcurrentDictionary<string, HeroesUserContext>(StringComparer.OrdinalIgnoreCase);
        private readonly ConcurrentDictionary<Guid, GameWorld> _worlds = new ConcurrentDictionary<Guid, GameWorld>();
        private readonly AclEngine _aclEngine = new AclEngine();
        private const int SaltSize = 32;

        public HeroesAppIdentityManager()
        {
            ConfigureBaseAclRules();
        }

        /// <summary>
        /// Seeds the fundamental engine permissions using the first structural ACL logic block.
        /// </summary>
        private void ConfigureBaseAclRules()
        {
            // Core visibility actions matching domain resource scopes
            _aclEngine.Grant(HeroesAppRoles.GameMaster, "world.administer", PermissionAction.Update);
            _aclEngine.Grant(HeroesAppRoles.Player, "player.data.vision", PermissionAction.Read);
        }

        #region Operational Provisioning

        public HeroesUserContext RegisterUser(string username, string plaintextPassword, IEnumerable<string> initialRoleNames)
        {
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(plaintextPassword))
                throw new ArgumentException("Valid authentication strings are required.");

            byte[] saltBytes = RandomNumberGenerator.GetBytes(SaltSize);
            using var rfc2898 = new Rfc2898DeriveBytes(plaintextPassword, saltBytes, 350000, HashAlgorithmName.SHA512);

            var user = new HeroesUserContext(username.Trim())
            {
                Salt = Convert.ToBase64String(saltBytes),
                PasswordHash = Convert.ToBase64String(rfc2898.GetBytes(64))
            };

            if (initialRoleNames != null)
            {
                foreach (var role in initialRoleNames)
                {
                    user.Roles.Add(SystemRoles.Register(role));
                }
            }

            if (!_users.TryAdd(user.Username, user))
                throw new InvalidOperationException("Username path conflict encountered.");

            return user;
        }

        public GameWorld ProvisionGameWorld(string name, HeroesUserContext gameMaster, List<string> genres)
        {
            if (gameMaster == null) throw new ArgumentNullException(nameof(gameMaster));
            if (!_aclEngine.IsAuthorized(gameMaster, "world.administer", PermissionAction.Update) && 
                !gameMaster.Roles.Contains(HeroesAppRoles.GameMaster))
            {
                throw new UnauthorizedAccessException("The acting user profile cannot provision a GameWorld construct.");
            }

            // Populate categorization and genres inside our native ThingName metadata dictionary wrapper
            var metadata = new Dictionary<string, object>
            {
                { "classificationNames", genres ?? new List<string>() }
            };

            var world = new GameWorld(name, gameMaster.Id, metadata);
            _worlds.TryAdd(world.Id, world);
            return world;
        }

        public void LinkPlayerToWorld(Guid worldId, HeroesUserContext player)
        {
            if (!_worlds.TryGetValue(worldId, out var world))
                throw new KeyNotFoundException("The requested game world configuration locus does not exist.");

            lock (world)
            {
                if (!world.RegisteredPlayerUserIds.Contains(player.Id))
                {
                    world.RegisteredPlayerUserIds.Add(player.Id);
                }
            }
        }

        #endregion

        #region Authentication & Impersonation Runtime

        public HeroesSessionContext Authenticate(string username, string plaintextPassword)
        {
            if (!_users.TryGetValue(username, out var user) || user.IsLockedOut)
                return null;

            byte[] saltBytes = Convert.FromBase64String(user.Salt);
            using var rfc2898 = new Rfc2898DeriveBytes(plaintextPassword, saltBytes, 350000, HashAlgorithmName.SHA512);
            string calculatedHash = Convert.ToBase64String(rfc2898.GetBytes(64));

            if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(user.PasswordHash), Encoding.UTF8.GetBytes(calculatedHash)))
                return null;

            return new HeroesSessionContext { PresentActor = user };
        }

        public void ForceImpersonationSession(HeroesSessionContext context, string targetUsername)
        {
            if (context?.PresentActor == null) throw new ArgumentNullException(nameof(context));

            // Core override rule validation
            if (!context.PresentActor.Roles.Contains(HeroesAppRoles.SystemAdmin))
                throw new UnauthorizedAccessException("Identity Fault: Actor profile lacks structural impersonation capabilities.");

            if (!_users.TryGetValue(targetUsername, out var targetUser))
                throw new KeyNotFoundException($"Target account parameter identity '{targetUsername}' does not exist.");

            context.ImpersonatedUser = targetUser;
        }

        public void RescindImpersonationSession(HeroesSessionContext context)
        {
            if (context != null) context.ImpersonatedUser = null;
        }

        #endregion

        #region Access Boundary Assessment Rules

        public bool VerifyPlayerDataAccess(HeroesSessionContext context, Guid targetPlayerUserId)
        {
            if (context == null) return false;

            // Rule 1: Master bypass logic check on the base Actor account
            if (context.PresentActor.Roles.Contains(HeroesAppRoles.SystemAdmin)) return true;

            HeroesUserContext effectiveUser = context.EffectiveUser;

            // Rule 2: Explicit self validation
            if (effectiveUser.Id == targetPlayerUserId) return true;

            // Rule 3: Game Master campaign structural relationship assessment
            if (effectiveUser.Roles.Contains(HeroesAppRoles.GameMaster))
            {
                return _worlds.Values.Any(w => w.GameMasterUserId == effectiveUser.Id && 
                                               w.RegisteredPlayerUserIds.Contains(targetPlayerUserId));
            }

            return false;
        }

        public bool VerifyWorldAdministrationAccess(HeroesSessionContext context, Guid worldId)
        {
            if (context == null) return false;
            if (!_worlds.TryGetValue(worldId, out var world)) return false;

            if (context.PresentActor.Roles.Contains(HeroesAppRoles.SystemAdmin)) return true;

            return world.GameMasterUserId == context.EffectiveUser.Id;
        }

        #endregion
    }
}
