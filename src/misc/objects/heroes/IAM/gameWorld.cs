namespace Heros.IAM
{
    /// <summary>
    /// Represents a comprehensive sandbox multi-tenant world instance governed by a specific Game Master.
    /// </summary>
    public class GameWorld : Common.Base.Thing
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid GameMasterUserId { get; set; }
        
        // Custom base collections for tracking players and campaign structures
        public Collection<Guid> RegisteredPlayerUserIds { get; set; } = new Collection<Guid>(new List<Guid>());
        public Collection<CampaignNode> Campaigns { get; set; } = new Collection<CampaignNode>(new List<CampaignNode>());

        public GameWorld(string worldName, Guid gameMasterUserId, Dictionary<string, object> metadata = null) 
            : base(worldName, metadata)
        {
            GameMasterUserId = gameMasterUserId;
        }
    }

}