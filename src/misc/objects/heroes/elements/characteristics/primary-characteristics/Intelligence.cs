using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Intelligence characteristic, extending the PrimaryCharacteristic base behavior
    /// and implementing standard Hero System perception roll mechanics.
    /// </summary>
    public class Intelligence : PrimaryCharacteristic
    {
        /// <summary>
        /// Filters a CharacterElements collection to return only instances of Intelligence.
        /// </summary>
        public static new Collection<Intelligence> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<Intelligence>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Intelligence intelligenceInstance)
                {
                    filteredList.Add(intelligenceInstance);
                }
            });

            return new Collection<Intelligence>(filteredList);
        }

        /// <summary>
        /// Instantiates an Intelligence characteristic setting default naming parameters and score multipliers.
        /// </summary>
        public Intelligence(IDictionary<string, object> options = null) : base(ConfigureOptions(options, "Intelligence", "INT", "1"))
        {
        }

        /// <summary>
        /// Gets the standard base check target for an Intelligence-based check roll.
        /// </summary>
        public int IntelligenceRoll()
        {
            return this.CharacteristicRoll();
        }

        /// <summary>
        /// Gets the active modified target for an Intelligence-based check roll incorporating status modifications.
        /// </summary>
        public int EffectiveIntelligenceRoll()
        {
            return this.EffectiveCharacteristicRoll();
        }

        /// <summary>
        /// Resolves the standard Base Perception roll threshold.
        /// </summary>
        public int PerceptionRollTarget
        {
            get => this.RollTarget;
        }

        /// <summary>
        /// Resolves the modified Active Perception roll threshold under temporary effects.
        /// </summary>
        public int EffectivePerceptionRollTarget
        {
            get => this.EffectiveRollTarget;
        }

        /// <summary>
        /// Runs a simulated check against the standard base perception threshold.
        /// </summary>
        public CharacteristicRollResult PerceptionRoll(int diceTotal)
        {
            return CheckRollAgainstTarget(diceTotal, this.PerceptionRollTarget);
        }

        /// <summary>
        /// Runs a simulated check against the dynamic effective perception threshold.
        /// </summary>
        public CharacteristicRollResult EffectivePerceptionRoll(int diceTotal)
        {
            return CheckRollAgainstTarget(diceTotal, this.EffectivePerceptionRollTarget);
        }
    }

    /// <summary>
    /// Specialized collection holding Intelligence attributes extending the base framework collection structure.
    /// </summary>
    public class IntelligenceCharacteristics : Collection<Intelligence>
    {
        public IntelligenceCharacteristics() : base() { }
        public IntelligenceCharacteristics(IEnumerable<Intelligence> items) : base(items) { }
    }
}
