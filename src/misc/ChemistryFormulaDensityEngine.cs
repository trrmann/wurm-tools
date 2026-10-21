using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using NUnit.Framework;

namespace PhysicsEngine.Nuclear
{
    public class ChemistryFormulaDensityEngine
    {
        private const double Avogadro = 6.02214076e23;
        private readonly CompletePeriodicTableEngine _baseTableEngine;

        public enum MatterState { CrystallineSolid, FluidLiquid, IdealGas }

        public ChemistryFormulaDensityEngine()
        {
            _baseTableEngine = new CompletePeriodicTableEngine();
        }

        public Dictionary<string, double> ParseComplexFormula(string formula)
        {
            if (string.IsNullOrWhiteSpace(formula))
                throw new ArgumentException("Formula string cannot be empty.");

            return ParseFormulaInternal(formula);
        }

        private Dictionary<string, double> ParseFormulaInternal(string formula)
        {
            var elementCounts = new Dictionary<string, double>();
            string nestedPattern = @"\(([^()]+)\)(\d*)";
            
            while (Regex.IsMatch(formula, nestedPattern))
            {
                formula = Regex.Replace(formula, nestedPattern, match =>
                {
                    var group = Regex.Match(match, @"\(([^()]+)\)");
                    string innerFormula = group.Groups[1].Value;
                    string multiplierStr = match.Substring(group.Length);
                    double multiplier = string.IsNullOrEmpty(multiplierStr) ? 1.0 : double.Parse(multiplierStr);

                    var innerMap = ParseFormulaInternal(innerFormula);
                    string flattened = "";
                    foreach (var kvp in innerMap)
                    {
                        flattened += $"{kvp.Key}{kvp.Value * multiplier}";
                    }
                    return flattened;
                });
            }

            var regex = new Regex(@"([A-Z][a-z]?)(-?\d*\.?\d*)");
            var matches = regex.Matches(formula);

            foreach (Match match in matches)
            {
                string symbol = match.Groups[1].Value;
                string countStr = match.Groups[2].Value;
                double count = string.IsNullOrEmpty(countStr) ? 1.0 : double.Parse(countStr);

                if (elementCounts.ContainsKey(symbol))
                    elementCounts[symbol] += count;
                else
                    elementCounts[symbol] = count;
            }

            return elementCounts;
        }

        public double CalculateMolarMass(string formula)
        {
            var parsedMap = ParseComplexFormula(formula);
            double totalMass = 0.0;

            foreach (var kvp in parsedMap)
            {
                int z = _baseTableEngine.GetZFromSymbol(kvp.Key);
                if (z == -1) throw new KeyNotFoundException($"Element symbol '{kvp.Key}' not verified.");
                
                var element = _baseTableEngine.CompileElement(z);
                totalMass += element.MassNumber * kvp.Value;
            }
            return totalMass;
        }

        public double ComputeSolidLatticeDensity(string formula, int formulaUnitsPerCell, double cellVolumePM3)
        {
            double massGmol = CalculateMolarMass(formula);
            double volumeCm3 = cellVolumePM3 * 1e-30; 
            double cellMassGrams = (formulaUnitsPerCell * massGmol) / Avogadro;

            return cellMassGrams / volumeCm3;
        }

        public double ComputeFluidDensity(string formula, double baselineDensityGcm3, double targetTempC, double referenceTempC, double volumetricExpansionCoeff)
        {
            double deltaT = targetTempC - referenceTempC;
            return baselineDensityGcm3 / (1.0 + (volumetricExpansionCoeff * deltaT));
        }

        public double ComputeGasDensity(string formula, double pressureAtm, double temperatureKelvin)
        {
            double molarMass = CalculateMolarMass(formula);
            const double IdealGasConstantR = 0.082057338; 
            
            double densityGL = (pressureAtm * molarMass) / (IdealGasConstantR * temperatureKelvin);
            return densityGL * 0.001; 
        }
    }

    [TestFixture]
    public class ChemistryFormulaDensityEngineTests
    {
        private struct SolidTruthSample
        {
            public string Formula;
            public int ZCell;
            public double VolumePM3;
            public double ExpectedDensity;
        }

        private struct LiquidTruthSample
        {
            public string Formula;
            public double BaseDensity;
            public double TargetTempC;
            public double RefTempC;
            public double CoeffAlpha;
            public double ExpectedDensity;
        }

        [Test]
        public void Test_Verify_MultiState_StatisticalFits()
        {
            var engine = new ChemistryFormulaDensityEngine();

            var solidBaselines = new List<SolidTruthSample>
            {
                new SolidTruthSample { Formula = "NaCl", ZCell = 4, VolumePM3 = 1.794e8, ExpectedDensity = 2.165 },
                new SolidTruthSample { Formula = "CaF2", ZCell = 4, VolumePM3 = 1.631e8, ExpectedDensity = 3.180 }
            };

            double sumSquaredErrorsSolid = 0;
            foreach (var sample in solidBaselines)
            {
                double calculated = engine.ComputeSolidLatticeDensity(sample.Formula, sample.ZCell, sample.VolumePM3);
                sumSquaredErrorsSolid += Math.Pow(sample.ExpectedDensity - calculated, 2);
            }
            double rmseSolid = Math.Sqrt(sumSquaredErrorsSolid / solidBaselines.Count);

            var liquidBaselines = new List<LiquidTruthSample>
            {
                new LiquidTruthSample { Formula = "H2O", BaseDensity = 1.000, TargetTempC = 80.0, RefTempC = 4.0, CoeffAlpha = 0.000214, ExpectedDensity = 0.983 }
            };

            double sumSquaredErrorsLiquid = 0;
            foreach (var sample in liquidBaselines)
            {
                double calculated = engine.ComputeFluidDensity(sample.Formula, sample.BaseDensity, sample.TargetTempC, sample.RefTempC, sample.CoeffAlpha);
                sumSquaredErrorsLiquid += Math.Pow(sample.ExpectedDensity - calculated, 2);
            }
            double rmseLiquid = Math.Sqrt(sumSquaredErrorsLiquid / liquidBaselines.Count);

            Assert.That(rmseSolid, Is.LessThan(0.05), "Solid model fit error limits violated.");
            Assert.That(rmseLiquid, Is.LessThan(0.05), "Liquid model thermal error bounds exceeded.");
        }
    }
}
