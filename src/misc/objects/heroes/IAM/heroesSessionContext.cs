namespace Heros.IAM
{
    /// <summary>
    /// Current operation pipeline execution token containing administrative impersonation features.
    /// </summary>
    public class HeroesSessionContext
    {
        public HeroesUserContext PresentActor { get; set; }
        public HeroesUserContext ImpersonatedUser { get; set; }
        public bool IsImpersonating => ImpersonatedUser != null;
        public HeroesUserContext EffectiveUser => ImpersonatedUser ?? PresentActor;
    }

}