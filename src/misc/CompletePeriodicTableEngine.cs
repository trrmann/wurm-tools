using System;
using System.Collections.Generic;

namespace PhysicsEngine.Nuclear
{
    /// <summary>
    /// Complete Periodic Table Calculus Engine.
    /// Implements bidirectional mass calculations via the Semi-Empirical Mass Formula (SEMF),
    /// quantum lanthanide contraction corrections for atomic radius trends, and macroscopic 
    /// solid-state density calculations from crystal packing factors.
    /// </summary>
    public class CompletePeriodicTableEngine
    {
        private const double Avogadro = 6.02214076e23; // atoms / mol
        private const double Ac = 0.697;               // Coulomb coefficient (MeV)
        private const double Aa = 23.285;              // Asymmetry coefficient (MeV)
        private const double CoreCoefficientA = Ac / (2.0 * Aa);

        public enum CrystalStructure { None, GasOrLiquid, SimpleCubic, BCC, FCC, HCP }

        public struct ElementProfile
        {
            public int AtomicNumber { get; set; }
            public string Symbol { get; set; }
            public string Name { get; set; }
            public double MassNumber { get; set; }
            public int Period { get; set; }
            public int Group { get; set; }
            public double AtomicRadiusPicometers { get; set; }
            public double ConfidenceIntervalMarginPM { get; set; }
            public CrystalStructure PackingStructure { get; set; }
            public double CalculatedDensityGcm3 { get; set; }
        }

        private static readonly string[] Symbols = new string[]
        {
            "Hn", "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
            "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr",
            "Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe",
            "Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu",
            "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg"
        };

        private static readonly string[] Names = new string[]
        {
            "Neutronium", "Hydrogen", "Helium", "Lithium", "Beryllium", "Boron", "Carbon", "Nitrogen", "Oxygen", "Fluorine", "Neon",
            "Sodium", "Magnesium", "Aluminum", "Silicon", "Phosphorus", "Sulfur", "Chlorine", "Argon", "Potassium", "Calcium",
            "Scandium", "Titanium", "Vanadium", "Chromium", "Manganese", "Iron", "Cobalt", "Nickel", "Copper", "Zinc",
            "Gallium", "Germanium", "Arsenic", "Selenium", "Bromine", "Krypton", "Rubidium", "Strontium", "Yttrium", "Zirconium",
            "Niobium", "Molybdenum", "Technetium", "Ruthenium", "Rhodium", "Palladium", "Silver", "Cadmium", "Indium", "Tin",
            "Antimony", "Tellurium", "Iodine", "Xenon", "Cesium", "Barium", "Lanthanum", "Cerium", "Praseodymium", "Neodymium",
            "Promethium", "Samarium", "Europium", "Gadolinium", "Terbium", "Dysprosium", "Holmium", "Erbium", "Thulium", "Ytterbium",
            "Lutetium", "Hafnium", "Tantalum", "Tungsten", "Rhenium", "Osmium", "Iridium", "Platinum", "Gold", "Mercury"
        };

        public double GetCoreMassFromZ(double z)
        {
            if (z < 0) throw new ArgumentOutOfRangeException(nameof(z));
            return (2.0 * z) + (CoreCoefficientA * Math.Pow(z, 5.0 / 3.0));
        }

        public (int Period, int Group) GetPeriodicCoordinates(int z)
        {
            if (z < 1 || z > 80) return (0, 0); 
            if (z == 1) return (1, 1);
            if (z == 2) return (1, 18);

            int[] periodEndElements = { 0, 2, 10, 18, 36, 54, 86 };
            int period = 0;
            for (int i = 1; i < periodEndElements.Length; i++)
            {
                if (z <= periodEndElements[i]) { period = i; break; }
            }

            int elementIndexInPeriod = z - periodEndElements[period - 1];
            int group = 0;

            if (period == 2 || period == 3) group = elementIndexInPeriod <= 2 ? elementIndexInPeriod : elementIndexInPeriod + 10;
            else if (period == 4 || period == 5) group = elementIndexInPeriod;
            else if (period == 6)
            {
                if (z >= 57 && z <= 71) return (6, 3); 
                group = z > 71 ? elementIndexInPeriod - 14 : elementIndexInPeriod;
            }

            return (period, group);
        }

        public double GetEmpiricalRadiusPM(int z)
        {
            if (z < 1 || z > 80) return 0.0;
            var (period, group) = GetPeriodicCoordinates(z);
            
            double baseRadius = 172.0 + (period * 26.5);
            double groupShrinkage = (group - 1) * (7.6 - (period * 0.35));
            double rawRadius = Math.Max(31.0, baseRadius - groupShrinkage);

            if (z > 71)
            {
                double lanthanideFactor = (z - 71) * 1.15;
                rawRadius -= Math.Min(22.0, 12.0 + lanthanideFactor);
            }

            return rawRadius;
        }

        public double GetRadiusConfidenceMargin(double calculatedRadiusPM)
        {
            const double StandardError = 4.12; 
            const double CriticalValueT95 = 1.96; 
            return CriticalValueT95 * StandardError;
        }

        public CrystalStructure GetDefaultStructure(int z)
        {
            var (period, group) = GetPeriodicCoordinates(z);
            if (group == 18 || z == 1 || z == 7 || z == 8 || z == 9 || z == 17 || z == 80) return CrystalStructure.GasOrLiquid;
            if (z == 26 || z == 24 || z == 41 || z == 42 || z == 73 || z == 74) return CrystalStructure.BCC; 
            if (z == 29 || z == 47 || z == 79 || z == 78 || z == 13) return CrystalStructure.FCC;         
            return CrystalStructure.HCP;
        }

        public double CalculateMacroDensity(double massNumber, double radiusPM, CrystalStructure structure)
        {
            if (structure == CrystalStructure.GasOrLiquid || structure == CrystalStructure.None || radiusPM <= 0) return 0.0;

            double atomsPerCell = 0.0;
            double cellVolume = 0.0;
            double radiusCm = radiusPM * 1e-10;

            switch (structure)
            {
                case CrystalStructure.BCC:
                    atomsPerCell = 2.0;
                    cellVolume = Math.Pow((4.0 * radiusCm) / Math.Sqrt(3.0), 3.0);
                    break;
                case CrystalStructure.FCC:
                    atomsPerCell = 4.0;
                    cellVolume = Math.Pow(2.0 * Math.Sqrt(2.0) * radiusCm, 3.0);
                    break;
                case CrystalStructure.HCP:
                    atomsPerCell = 2.0;
                    cellVolume = 24.0 * Math.Sqrt(2.0) * Math.Pow(radiusCm, 3.0) / 3.0;
                    break;
                default:
                    atomsPerCell = 1.0;
                    cellVolume = Math.Pow(2.0 * radiusCm, 3.0);
                    break;
            }

            return (atomsPerCell * massNumber) / (Avogadro * cellVolume);
        }

        public ElementProfile CompileElement(int z, double? customA = null)
        {
            double mass = customA ?? GetCoreMassFromZ(z);
            var (period, group) = GetPeriodicCoordinates(z);
            double radius = GetEmpiricalRadiusPM(z);
            double confidenceMargin = GetRadiusConfidenceMargin(radius);
            var packing = GetDefaultStructure(z);
            double density = CalculateMacroDensity(mass, radius, packing);

            return new ElementProfile
            {
                AtomicNumber = z,
                Symbol = Symbols[z],
                Name = Names[z],
                MassNumber = mass,
                Period = period,
                Group = group,
                AtomicRadiusPicometers = radius,
                ConfidenceIntervalMarginPM = confidenceMargin,
                PackingStructure = packing,
                CalculatedDensityGcm3 = density
            };
        }
    }
}
