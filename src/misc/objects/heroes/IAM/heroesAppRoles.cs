namespace Heros.IAM
{
    /// <summary>
    /// Holds the system-wide static references for our dynamic configurable roles.
    /// </summary>
    public static class HeroesAppRoles
    {
        public static readonly SecurityRole SystemAdmin = SystemRoles.Register("System Administrator");
        public static readonly SecurityRole GameMaster = SystemRoles.Register("Game Master");
        public static readonly SecurityRole Player = SystemRoles.Register("Player");
    }
}