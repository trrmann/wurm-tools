using System;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    /// <summary>
    /// Represents the Stun figured characteristic, which dynamically calculates its base value 
    /// from primary characteristics (Body, Strength, and Constitution) inside the character profile.
    /// </summary>
    public class Stun : FiguredCharacteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from Stun.
        /// </summary>
        public static new Collection<Stun> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<Stun>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Stun stunInstance)
                {
                    filteredList.Add(stunInstance);
                }
            });

            return new Collection<Stun>(filteredList);
        }

        /// <summary>
        /// Instantiates a Stun characteristic component, configuring operational formulas and rule defaults.
        /// </summary>
        public Stun(IDictionary<string, object> options = null) : base(UpdateOptions(options))
        {
        }

        private static IDictionary<string, object> UpdateOptions(IDictionary<string, object> options)
        {
            var baseOptions = options == null
                ? new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, object>(options, StringComparer.OrdinalIgnoreCase);

            baseOptions["AbsoluteMinValue"] = "0";
            baseOptions["MinValue"] = "0";
            baseOptions["UnderMinValueRate"] = "0";
            baseOptions["MaxValue"] = "50";
            baseOptions["OverMaxValueRate"] = "2";
            baseOptions["ValueRate"] = "1";
            baseOptions["BaseValue"] = "0";
            baseOptions["Name"] = "Stun";
            baseOptions["ShortName"] = "STUN";

            // Define the calculation rule pipeline matching the precise JavaScript conditional chain
            baseOptions["BaseValueFunction"] = new Func<IDictionary<string, object>, object>((parameters) =>
            {
                if (parameters.TryGetValue("characterElements", out var elementsObj) && elementsObj is CharacterElements characterElements)
                {
                    var constitutionCharacteristic = Constitution.Filter(characterElements).FirstOrDefault();
                    var strengthCharacteristic = Strength.Filter(characterElements).FirstOrDefault();
                    var bodyCharacteristic = Body.Filter(characterElements).FirstOrDefault();

                    bool hasCon = constitutionCharacteristic != null;
                    bool hasStr = strengthCharacteristic != null;
                    bool hasBody = bodyCharacteristic != null;

                    if (hasStr && hasBody && hasCon)
                    {
                        return MixedNumber.From(bodyCharacteristic.Value())
                            .Add(MixedNumber.From(strengthCharacteristic.Value()).Divide(2))
                            .Add(MixedNumber.From(constitutionCharacteristic.Value()).Divide(2));
                    }
                    if (hasStr && hasBody)
                    {
                        return MixedNumber.From(bodyCharacteristic.Value())
                            .Add(MixedNumber.From(strengthCharacteristic.Value()).Divide(2));
                    }
                    if (hasStr && hasCon)
                    {
                        return MixedNumber.From(strengthCharacteristic.Value())
                            .Add(constitutionCharacteristic.Value())
                            .Divide(2);
                    }
                    if (hasBody && hasCon)
                    {
                        return MixedNumber.From(bodyCharacteristic.Value())
                            .Add(MixedNumber.From(constitutionCharacteristic.Value()).Divide(2));
                    }
                    if (hasStr)
                    {
                        return MixedNumber.From(strengthCharacteristic.Value()).Divide(2);
                    }
                    if (hasBody)
                    {
                        return MixedNumber.From(bodyCharacteristic.Value());
                    }
                    if (hasCon)
                    {
                        return MixedNumber.From(constitutionCharacteristic.Value()).Divide(2);
                    }
                }

                throw new InvalidOperationException("Stun Base Value requires valid Strength, Body, and Constitution objects");
            });

            return baseOptions;
        }
    }

    /// <summary>
    /// Special purpose collection wrapper for managing portfolios of Stun characteristics.
    /// </summary>
    public class StunCharacteristics : Collection<Stun>
    {
        public StunCharacteristics() : base() { }
        public StunCharacteristics(IEnumerable<Stun> items) : base(items) { }
    }
}
