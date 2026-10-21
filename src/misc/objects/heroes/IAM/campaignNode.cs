namespace Heros.IAM
{
    /// <summary>
    /// Represents a campaign thread anchored to a parent Game World topology.
    /// </summary>
    public class CampaignNode : Common.Base.Thing
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public bool IsActive { get; set; } = true;

        public CampaignNode(string campaignName, Dictionary<string, object> metadata = null) 
            : base(campaignName, metadata) { }
    }
}