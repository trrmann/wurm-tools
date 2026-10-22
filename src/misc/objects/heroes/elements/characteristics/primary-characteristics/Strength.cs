using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    public class Strength : PrimaryCharacteristic
    {
        public static new Collection<Strength> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }
            var filteredList = new List<Strength>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Strength strengthInstance)
                {
                    filteredList.Add(strengthInstance);
                }
            });
            return new Collection<Strength>(filteredList);
        }

        public static readonly Dictionary<int, Dictionary<string, object>> StrengthTable = new Dictionary<int, Dictionary<string, object>>
        {
            { -25, new Dictionary<string, object> { { "lift", 0.8 }, { "damage", "0" }, { "leap", "0" }, { "ref", "Dagger,javelin,grenade" } } },
            { -23, new Dictionary<string, object> { { "lift", 1.0 }, { "damage", "0" }, { "leap", "0" }, { "ref", "Pistol,laser pistol" } } },
            { -20, new Dictionary<string, object> { { "lift", 1.6 }, { "damage", "0" }, { "leap", "0" }, { "ref", "Pineapple,binoculars,longsword" } } },
            { -18, new Dictionary<string, object> { { "lift", 2.0 }, { "damage", "0" }, { "leap", "0" }, { "ref", "Clay brick" } } },
            { -15, new Dictionary<string, object> { { "lift", 3.2 }, { "damage", "0" }, { "leap", "0" }, { "ref", "Submachine gun, helmet" } } },
            { -13, new Dictionary<string, object> { { "lift", 4.0 }, { "damage", "0" }, { "leap", "0" }, { "ref", "Rifle, VCR, small metal shield" } } },
            { -10, new Dictionary<string, object> { { "lift", 6.4 }, { "damage", "0" }, { "leap", "0" }, { "ref", "Assult rifile,heavy crossbow" } } },
            { -8,  new Dictionary<string, object> { { "lift", 8.0 }, { "damage", "0" }, { "leap", "0" }, { "ref", "Shotput, greatsword" } } },
            { -5,  new Dictionary<string, object> { { "lift", 12.5 }, { "damage", "0" }, { "leap", "0" }, { "ref", "Machine gun, chainmail hauberk" } } },
            { -3,  new Dictionary<string, object> { { "lift", 16.0 }, { "damage", "0" }, { "leap", "0" }, { "ref", "Tavern bench" } } },
            { 0,   new Dictionary<string, object> { { "lift", 25.0 }, { "damage", "0" }, { "leap", "0" }, { "ref", "Full suitcase, TV set, bicycle" } } },
            { 3,   new Dictionary<string, object> { { "lift", 37.0 }, { "damage", "1/2" }, { "leap", "1/2" }, { "ref", "Small refrigerator, plate armor" } } },
            { 5,   new Dictionary<string, object> { { "lift", 50.0 }, { "damage", "1" }, { "leap", "1" }, { "ref", "Adolescent human, recliner" } } },
            { 8,   new Dictionary<string, object> { { "lift", 75.0 }, { "damage", "1 1/2" }, { "leap", "1 1/2" }, { "ref", "Brass bed, washing machine" } } },
            { 10,  new Dictionary<string, object> { { "lift", 100.0 }, { "damage", "2" }, { "leap", "2" }, { "ref", "Adult human" } } },
            { 13,  new Dictionary<string, object> { { "lift", 150.0 }, { "damage", "2 1/2" }, { "leap", "2 1/2" }, { "ref", "Refrigerator" } } },
            { 15,  new Dictionary<string, object> { { "lift", 200.0 }, { "damage", "3" }, { "leap", "3" }, { "ref", "Two men, piano, motocycle, boar" } } },
            { 18,  new Dictionary<string, object> { { "lift", 300.0 }, { "damage", "3 1/2" }, { "leap", "3 1/2" }, { "ref", "Medium floor safe" } } },
            { 20,  new Dictionary<string, object> { { "lift", 400.0 }, { "damage", "4" }, { "leap", "4" }, { "ref", "Chariot, grizzly bear" } } },
            { 23,  new Dictionary<string, object> { { "lift", 600.0 }, { "damage", "4 1/2" }, { "leap", "4 1/2" }, { "ref", "Sailboat, cow, horse" } } },
            { 25,  new Dictionary<string, object> { { "lift", 800.0 }, { "damage", "5" }, { "leap", "5" }, { "ref", "Sportscar, horse and rider" } } },
            { 28,  new Dictionary<string, object> { { "lift", 1200.0 }, { "damage", "5 1/2" }, { "leap", "5 1/2" }, { "ref", "Medium missle" } } },
            { 30,  new Dictionary<string, object> { { "lift", 1600.0 }, { "damage", "6" }, { "leap", "6" }, { "ref", "Small car, large missle" } } },
            { 35,  new Dictionary<string, object> { { "lift", 3200.0 }, { "damage", "7" }, { "leap", "7" }, { "ref", "Truck, limousine" } } },
            { 40,  new Dictionary<string, object> { { "lift", 6400.0 }, { "damage", "8" }, { "leap", "8" }, { "ref", "Small jet, large elephant" } } },
            { 45,  new Dictionary<string, object> { { "lift", 11350.0 }, { "damage", "9" }, { "leap", "9" }, { "ref", "Jetfighter, subway car" } } },
            { 50,  new Dictionary<string, object> { { "lift", 22680.0 }, { "damage", "10" }, { "leap", "10" }, { "ref", "Frigate, small standing stone" } } },
            { 55,  new Dictionary<string, object> { { "lift", 45360.0 }, { "damage", "11" }, { "leap", "11" }, { "ref", "Bulldozer, main battle tank" } } },
            { 60,  new Dictionary<string, object> { { "lift", 90718.5 }, { "damage", "12" }, { "leap", "12" }, { "ref", "Space Shuttle, blue whale" } } },
            { 65,  new Dictionary<string, object> { { "lift", 181437.0 }, { "damage", "13" }, { "leap", "13" }, { "ref", "Statue of Liberty" } } },
            { 70,  new Dictionary<string, object> { { "lift", 362874.0 }, { "damage", "14" }, { "leap", "14" }, { "ref", "Trawler, large starship" } } },
            { 75,  new Dictionary<string, object> { { "lift", 725748.0 }, { "damage", "15" }, { "leap", "15" }, { "ref", "Drilling rig" } } },
            { 80,  new Dictionary<string, object> { { "lift", 1451496.0 }, { "damage", "16" }, { "leap", "16" }, { "ref", "Small bridge, freighter (unloaded)" } } },
            { 85,  new Dictionary<string, object> { { "lift", 2902992.0 }, { "damage", "17" }, { "leap", "17" }, { "ref", "freighter (loaded)" } } },
            { 90,  new Dictionary<string, object> { { "lift", 5805984.0 }, { "damage", "18" }, { "leap", "18" }, { "ref", "destroyer (unloaded)" } } },
            { 95,  new Dictionary<string, object> { { "lift", 11339812.5 }, { "damage", "19" }, { "leap", "19" }, { "ref", "temple" } } },
            { 100, new Dictionary<string, object> { { "lift", 22679625.0 }, { "damage", "20" }, { "leap", "20" }, { "ref", "Large bridge, castle" } } }
        };

        public static readonly Dictionary<int, Dictionary<string, string>> ThrowingTable = new Dictionary<int, Dictionary<string, string>>
        {
            { 0,   new Dictionary<string, string> { { "extraRunning", "0" }, { "standing", "0" }, { "prone", "0" } } },
            { 3,   new Dictionary<string, string> { { "extraRunning", "2" }, { "standing", "1" }, { "prone", "1/2" } } },
            { 5,   new Dictionary<string, string> { { "extraRunning", "4" }, { "standing", "2" }, { "prone", "1" } } },
            { 8,   new Dictionary<string, string> { { "extraRunning", "6" }, { "standing", "3" }, { "prone", "1 1/2" } } },
            { 10,  new Dictionary<string, string> { { "extraRunning", "8" }, { "standing", "4" }, { "prone", "2" } } },
            { 13,  new Dictionary<string, string> { { "extraRunning", "10" }, { "standing", "5" }, { "prone", "2 1/2" } } },
            { 15,  new Dictionary<string, string> { { "extraRunning", "12" }, { "standing", "6" }, { "prone", "3" } } },
            { 18,  new Dictionary<string, string> { { "extraRunning", "14" }, { "standing", "7" }, { "prone", "3 1/2" } } },
            { 20,  new Dictionary<string, string> { { "extraRunning", "16" }, { "standing", "8" }, { "prone", "4" } } },
            { 23,  new Dictionary<string, string> { { "extraRunning", "18" }, { "standing", "9" }, { "prone", "4 1/2" } } },
            { 25,  new Dictionary<string, string> { { "extraRunning", "20" }, { "standing", "10" }, { "prone", "5" } } },
            { 28,  new Dictionary<string, string> { { "extraRunning", "22" }, { "standing", "11" }, { "prone", "5 1/2" } } },
            { 30,  new Dictionary<string, string> { { "extraRunning", "24" }, { "standing", "12" }, { "prone", "6" } } },
            { 35,  new Dictionary<string, string> { { "extraRunning", "28" }, { "standing", "14" }, { "prone", "7" } } },
            { 40,  new Dictionary<string, string> { { "extraRunning", "32" }, { "standing", "16" }, { "prone", "8" } } },
            { 45,  new Dictionary<string, string> { { "extraRunning", "36" }, { "standing", "18" }, { "prone", "9" } } },
            { 50,  new Dictionary<string, string> { { "extraRunning", "40" }, { "standing", "20" }, { "prone", "10" } } },
            { 55,  new Dictionary<string, string> { { "extraRunning", "44" }, { "standing", "22" }, { "prone", "11" } } },
            { 60,  new Dictionary<string, string> { { "extraRunning", "48" }, { "standing", "24" }, { "prone", "12" } } },
            { 65,  new Dictionary<string, string> { { "extraRunning", "52" }, { "standing", "26" }, { "prone", "13" } } },
            { 70,  new Dictionary<string, string> { { "extraRunning", "56" }, { "standing", "28" }, { "prone", "14" } } },
            { 75,  new Dictionary<string, string> { { "extraRunning", "60" }, { "standing", "30" }, { "prone", "15" } } },
            { 80,  new Dictionary<string, string> { { "extraRunning", "64" }, { "standing", "32" }, { "prone", "16" } } },
            { 85,  new Dictionary<string, string> { { "extraRunning", "68" }, { "standing", "34" }, { "prone", "17" } } },
            { 90,  new Dictionary<string, string> { { "extraRunning", "72" }, { "standing", "36" }, { "prone", "18" } } },
            { 95,  new Dictionary<string, string> { { "extraRunning", "76" }, { "standing", "38" }, { "prone", "19" } } },
            { 100, new Dictionary<string, string> { { "extraRunning", "80" }, { "standing", "40" }, { "prone", "20" } } }
        };

        private double ExtraStrength(double score, double weight)
        {
            double requiredScore = StrengthRequired(weight);
            return score - requiredScore;
        }

        private Dictionary<string, double> ThrowingCalculations(double score, double weight)
        {
            double extraScore = ExtraStrength(score, weight);
            if (extraScore < 0)
            {
                extraScore = 0;
            }

            double standing = Math.Floor(extraScore * 0.4);
            return new Dictionary<string, double>
            {
                { "running", standing * 2.0 },
                { "standing", standing },
                { "prone", standing * 0.5 }
            };
        }

        private string DamageAndLeap(double score)
        {
            if (score < 3) return "0";
            double baseValue = (score - 0) / 5.0;
            double whole = Math.Floor(baseValue);
            double fraction = baseValue - whole;

            if (Math.Abs(fraction - 0.6) < 0.0001) return $"{whole} 1/2";
            if (Math.Abs(fraction) < 0.0001) return $"{whole}";
            return $"{whole}";
        }

        private double LiftLowRange(double score)
        {
            return 25.0 * Math.Pow(2, (score - 0) / 10.0);
        }

        private double LiftMidRange(double score)
        {
            return 100.0 * Math.Pow(2, (score - 10) / 5.0);
        }

        private double LiftHighRange(double score)
        {
            return 90718.474 * Math.Pow(2, (score - 60) / 5.0);
        }

        private double LiftKg(double score)
        {
            if (score <= 0) return LiftLowRange(score);
            if (score <= 40) return LiftMidRange(score);
            return LiftHighRange(score);
        }

        private double StrengthLowRange(double weightKg)
        {
            return 0 + 10 * Math.Log2(weightKg / 25.0);
        }

        private double StrengthMidRange(double weightKg)
        {
            return 10 + 5 * Math.Log2(weightKg / 100.0);
        }

        private double StrengthHighRange(double weightKg)
        {
            return 60 + 5 * Math.Log2(weightKg / 90718.474);
        }

        private double StrengthRequiredCalculation(double weightKg)
        {
            if (weightKg <= 0) return double.NegativeInfinity;
            if (weightKg <= 25.0) return StrengthLowRange(weightKg);
            if (weightKg <= 6400.0) return StrengthMidRange(weightKg);
            return StrengthHighRange(weightKg);
        }

        public Strength(IDictionary<string, object> options = null) : base(ConfigureOptions(options, "Strength", "STR", "1"))
        {
        }

        public double EffectiveStrength()
        {
            return this.Effective;
        }

        public int StrengthRoll()
        {
            return this.CharacteristicRoll();
        }

        public int EffectiveStrengthRoll()
        {
            return this.EffectiveCharacteristicRoll();
        }

        public string BaseHTHDamage()
        {
            return DamageAndLeap(this.Value());
        }

        public string BaseEffectiveHTHDamage()
        {
            return DamageAndLeap(this.EffectiveStrength());
        }

        public string BaseLeap()
        {
            return DamageAndLeap(this.Value());
        }

        public string BaseEffectiveLeap()
        {
            return DamageAndLeap(this.EffectiveStrength());
        }

        public double LiftKg()
        {
            return LiftKg(this.Value());
        }

        public double EffectiveLiftKg()
        {
            return LiftKg(this.EffectiveStrength());
        }

        public double StrengthRequired(double weightKg)
        {
            return StrengthRequiredCalculation(weightKg);
        }

        public double ProneThrow(double weight)
        {
            return ThrowingCalculations(this.Value(), weight)["prone"];
        }

        public double ProneEffectiveThrow(double weight)
        {
            return ThrowingCalculations(this.EffectiveStrength(), weight)["prone"];
        }

        public double StandingThrow(double weight)
        {
            return ThrowingCalculations(this.Value(), weight)["standing"];
        }

        public double StandingEffectiveThrow(double weight)
        {
            return ThrowingCalculations(this.EffectiveStrength(), weight)["standing"];
        }

        public double RunningThrow(double weight)
        {
            return ThrowingCalculations(this.Value(), weight)["running"];
        }

        public double RunningEffectiveThrow(double weight)
        {
            return ThrowingCalculations(this.EffectiveStrength(), weight)["running"];
        }
    }

    public class StrengthCharacteristics : Collection<Strength>
    {
        public StrengthCharacteristics() : base() { }
        public StrengthCharacteristics(IEnumerable<Strength> items) : base(items) { }
    }
}
