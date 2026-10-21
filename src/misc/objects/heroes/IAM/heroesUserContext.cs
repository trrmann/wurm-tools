namespace Heros.IAM
{
    /// <summary>
    /// Enhanced user record mapping state variables and security contexts.
    /// </summary>
    public class HeroesUserContext : SecurityUser
    {
        public HeroesUserContext(string username)
        {
            this.Username = username;
        }
    }

}