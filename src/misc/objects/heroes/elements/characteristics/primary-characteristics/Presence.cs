using System;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    public class Presence : PrimaryCharacteristic
    {
        public static new Collection<Presence> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }
            var filteredList = new List<Presence>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Presence presenceInstance)
                {
                    filteredList.Add(presenceInstance);
                }
            });
            return new Collection<Presence>(filteredList);
        }

        private string AttackDice(double score)
        {
            if (score < 3) return "0";
            double baseValue = (score - 0) / 5.0;
            double whole = Math.Floor(baseValue);
            double fraction = baseValue - whole;

            if (Math.Abs(fraction - 0.6) < 0.0001) return $"{whole} 1/2";
            if (Math.Abs(fraction) < 0.0001) return $"{whole}";
            return $"{whole}";
        }

        public Presence(IDictionary<string, object> options = null) : base(ConfigureOptions(options, "Presence", "PRE", "1"))
        {
        }

        public int PresenceRoll()
        {
            return this.CharacteristicRoll();
        }

        public int EffectivePresenceRoll()
        {
            return this.EffectiveCharacteristicRoll();
        }

        public double EffectivePresence()
        {
            return this.Effective;
        }

        public string BasePresenceAttack()
        {
            return AttackDice(this.Value());
        }

        public string BaseEffectivePresenceAttack()
        {
            return AttackDice(this.EffectivePresence());
        }
    }

    public class PresenceCharacteristics : Collection<Presence>
    {
        public System.Collections.Generic.IEnumerable<Presence> Items => this;
        public PresenceCharacteristics() : base() { }
        public PresenceCharacteristics(IEnumerable<Presence> items) : base(items) { }
    }
}
