const { getCarbonGrade, calculateEmissions, calculateSimulatorSavings } = require('./utils');

describe('EcoTrace - Carbon Footprint Calculator Utilities', () => {

    describe('getCarbonGrade', () => {
        test('assigns Grade A for emissions less than 3.0 tons', () => {
            expect(getCarbonGrade(0)).toEqual({ grade: 'A', class: 'grade-a' });
            expect(getCarbonGrade(2.9)).toEqual({ grade: 'A', class: 'grade-a' });
        });

        test('assigns Grade B for emissions between 3.0 and 5.9 tons', () => {
            expect(getCarbonGrade(3.0)).toEqual({ grade: 'B', class: 'grade-b' });
            expect(getCarbonGrade(5.9)).toEqual({ grade: 'B', class: 'grade-b' });
        });

        test('assigns Grade C for emissions between 6.0 and 9.9 tons', () => {
            expect(getCarbonGrade(6.0)).toEqual({ grade: 'C', class: 'grade-c' });
            expect(getCarbonGrade(9.9)).toEqual({ grade: 'C', class: 'grade-c' });
        });

        test('assigns Grade D for emissions between 10.0 and 14.9 tons', () => {
            expect(getCarbonGrade(10.0)).toEqual({ grade: 'D', class: 'grade-d' });
            expect(getCarbonGrade(14.9)).toEqual({ grade: 'D', class: 'grade-d' });
        });

        test('assigns Grade F for emissions 15.0 tons or greater', () => {
            expect(getCarbonGrade(15.0)).toEqual({ grade: 'F', class: 'grade-f' });
            expect(getCarbonGrade(25.5)).toEqual({ grade: 'F', class: 'grade-f' });
        });
    });

    describe('calculateEmissions', () => {
        test('calculates correct values for baseline user details', () => {
            const baselineDetails = {
                carMiles: 80,
                carType: 'medium-petrol', // factor 0.35
                flights: 4,
                publicTransport: 2,
                electricityBill: 90,
                greenEnergy: 0,
                gasBill: 40,
                roommates: 2,
                diet: 'average-meat', // falls back to base 2.0
                foodWaste: 'low',
                localFood: 'some',
                recycling: 'full', // credit -0.2
                compost: 'no', // credit +0.05
                shopping: 'average' // base 0.9
            };

            const result = calculateEmissions(baselineDetails);

            // Transport:
            // car = 80 * 52 * 0.35 / 1000 = 1.456
            // flights = 4 * 90 / 1000 = 0.36
            // transit = 2 * 52 * 1.2 / 1000 = 0.1248
            // total transport = 1.456 + 0.36 + 0.1248 = 1.9408 (1.94 rounded to 2 decimals)
            expect(result.transport).toBe(1.94);

            // Energy:
            // electricityKwh = (90 / 0.15) * 12 = 7200
            // electricityCO2 = 7200 * 0.38 / 1000 = 2.736
            // gasTherms = (40 / 1.0) * 12 = 480
            // gasCO2 = 480 * 5.3 / 1000 = 2.544
            // total energy = (2.736 + 2.544) / 2 = 2.64
            expect(result.energy).toBe(2.64);

            // Food:
            // diet = 2.0, no adjustments for 'low' or 'some'
            expect(result.food).toBe(2.0);

            // Waste:
            // shopping = 0.9, recycling credit = -0.2, compost = +0.05
            // total waste = 0.9 - 0.2 + 0.05 = 0.75
            expect(result.waste).toBe(0.75);

            // Total:
            // 1.9408 (transport) + 2.64 (energy) + 2.0 (food) + 0.75 (waste) = 7.3308 -> 7.3
            expect(result.total).toBe(7.3);
        });

        test('calculates correct values for eco-friendly user', () => {
            const ecoDetails = {
                carMiles: 50,
                carType: 'hybrid', // factor 0.20
                flights: 0,
                publicTransport: 0,
                electricityBill: 50,
                greenEnergy: 100, // 100% clean energy discount
                gasBill: 0,
                roommates: 1,
                diet: 'vegan', // base 0.6
                foodWaste: 'none', // food waste adj -0.1
                localFood: 'mostly', // local adj -0.15
                recycling: 'full', // credit -0.2
                compost: 'yes', // credit -0.1
                shopping: 'minimal' // base 0.4
            };

            const result = calculateEmissions(ecoDetails);

            // Transport:
            // car = 50 * 52 * 0.2 / 1000 = 0.52
            // total transport = 0.52
            expect(result.transport).toBe(0.52);

            // Energy:
            // 100% renewable electricity and 0 gas = 0.0
            expect(result.energy).toBe(0.0);

            // Food:
            // diet = 0.6, waste = -0.1, local = -0.15
            // total food = 0.6 - 0.1 - 0.15 = 0.35
            expect(result.food).toBe(0.35);

            // Waste:
            // shopping = 0.4, recycling = -0.2, compost = -0.1
            // total waste = Math.max(0.1, 0.4 - 0.2 - 0.1) = 0.1
            expect(result.waste).toBe(0.1);

            // Total: 0.52 + 0.0 + 0.35 + 0.1 = 0.97 -> 1.0
            expect(result.total).toBe(1.0);
        });

        test('caps food and waste to minimum values correctly', () => {
            const extremeDetails = {
                carMiles: 0,
                carType: 'none',
                flights: 0,
                publicTransport: 0,
                electricityBill: 0,
                greenEnergy: 100,
                gasBill: 0,
                roommates: 1,
                diet: 'vegan', // base 0.6
                foodWaste: 'none', // adj -0.1
                localFood: 'mostly', // adj -0.15 (sum = 0.35)
                recycling: 'full', // credit -0.2
                compost: 'yes', // credit -0.1
                shopping: 'minimal' // base 0.4 (sum = 0.1)
            };

            // Let's modify food to trigger the Math.max(0.2, ...) constraint
            extremeDetails.diet = 'vegan'; // 0.6
            extremeDetails.foodWaste = 'none'; // -0.1
            extremeDetails.localFood = 'mostly'; // -0.15
            // If we add another negative adj, but there isn't one. What if diet base is lower?
            // Let's force sum to be < 0.2. e.g. base = 0.3 (hypothetical, but vegan is 0.6).
            // Actually, vegan (0.6) - 0.1 (foodWaste) - 0.15 (local) = 0.35, which is > 0.2.
            // What if diet is vegan (0.6), foodWaste is none (-0.1), local is mostly (-0.15), and let's say base is even lower?
            // Since vegan is the lowest (0.6), the minimum sum we can get is 0.35.
            // Let's verify waste: shopping minimal (0.4) + recycling full (-0.2) + compost yes (-0.1) = 0.1.
            // What if compost was -0.2? The Math.max(0.1, ...) caps it to 0.1.
            const result = calculateEmissions(extremeDetails);
            expect(result.food).toBe(0.35); // 0.35
            expect(result.waste).toBe(0.1); // minimum cap
        });

        test('covers all vehicle types correctly', () => {
            const details = (carType) => ({
                carMiles: 100,
                carType,
                flights: 0,
                publicTransport: 0,
                electricityBill: 0,
                greenEnergy: 0,
                gasBill: 0,
                roommates: 1,
                diet: 'average-meat',
                foodWaste: 'low',
                localFood: 'some',
                recycling: 'partial',
                compost: 'no',
                shopping: 'average'
            });

            // large-petrol (0.45): 100 * 52 * 0.45 / 1000 = 2.34
            expect(calculateEmissions(details('large-petrol')).transport).toBe(2.34);
            // diesel (0.31): 100 * 52 * 0.31 / 1000 = 1.612 -> 1.61
            expect(calculateEmissions(details('diesel')).transport).toBe(1.61);
            // hybrid (0.20): 100 * 52 * 0.20 / 1000 = 1.04
            expect(calculateEmissions(details('hybrid')).transport).toBe(1.04);
            // ev (0.08): 100 * 52 * 0.08 / 1000 = 0.416 -> 0.42
            expect(calculateEmissions(details('ev')).transport).toBe(0.42);
            // none (0.0): 0
            expect(calculateEmissions(details('none')).transport).toBe(0);
        });

        test('covers all diet types correctly', () => {
            const details = (diet) => ({
                carMiles: 0,
                carType: 'none',
                flights: 0,
                publicTransport: 0,
                electricityBill: 0,
                greenEnergy: 0,
                gasBill: 0,
                roommates: 1,
                diet,
                foodWaste: 'low',
                localFood: 'some',
                recycling: 'partial',
                compost: 'no',
                shopping: 'average'
            });

            // heavy-meat: 3.0 base
            expect(calculateEmissions(details('heavy-meat')).food).toBe(3.0);
            // low-meat: 1.5 base
            expect(calculateEmissions(details('low-meat')).food).toBe(1.5);
            // vegetarian: 1.1 base
            expect(calculateEmissions(details('vegetarian')).food).toBe(1.1);
            // vegan: 0.6 base
            expect(calculateEmissions(details('vegan')).food).toBe(0.6);
        });

        test('covers all food waste levels correctly', () => {
            const details = (foodWaste) => ({
                carMiles: 0,
                carType: 'none',
                flights: 0,
                publicTransport: 0,
                electricityBill: 0,
                greenEnergy: 0,
                gasBill: 0,
                roommates: 1,
                diet: 'average-meat',
                foodWaste,
                localFood: 'some',
                recycling: 'partial',
                compost: 'no',
                shopping: 'average'
            });

            // none: -0.1 adj -> 2.0 - 0.1 = 1.9
            expect(calculateEmissions(details('none')).food).toBe(1.9);
            // medium: 0.15 adj -> 2.0 + 0.15 = 2.15
            expect(calculateEmissions(details('medium')).food).toBe(2.15);
            // high: 0.35 adj -> 2.0 + 0.35 = 2.35
            expect(calculateEmissions(details('high')).food).toBe(2.35);
        });

        test('covers all local food frequencies correctly', () => {
            const details = (localFood) => ({
                carMiles: 0,
                carType: 'none',
                flights: 0,
                publicTransport: 0,
                electricityBill: 0,
                greenEnergy: 0,
                gasBill: 0,
                roommates: 1,
                diet: 'average-meat',
                foodWaste: 'low',
                localFood,
                recycling: 'partial',
                compost: 'no',
                shopping: 'average'
            });

            // mostly: -0.15 adj -> 2.0 - 0.15 = 1.85
            expect(calculateEmissions(details('mostly')).food).toBe(1.85);
            // rarely: 0.15 adj -> 2.0 + 0.15 = 2.15
            expect(calculateEmissions(details('rarely')).food).toBe(2.15);
        });

        test('covers all shopping levels correctly', () => {
            const details = (shopping) => ({
                carMiles: 0,
                carType: 'none',
                flights: 0,
                publicTransport: 0,
                electricityBill: 0,
                greenEnergy: 0,
                gasBill: 0,
                roommates: 1,
                diet: 'average-meat',
                foodWaste: 'low',
                localFood: 'some',
                recycling: 'partial', // credit -0.05
                compost: 'no', // credit +0.05
                shopping
            });

            // minimal: 0.4 base -> 0.4 - 0.05 + 0.05 = 0.4
            expect(calculateEmissions(details('minimal')).waste).toBe(0.4);
            // heavy: 2.0 base -> 2.0 - 0.05 + 0.05 = 2.0
            expect(calculateEmissions(details('heavy')).waste).toBe(2.0);
        });

        test('covers all recycling types correctly', () => {
            const details = (recycling) => ({
                carMiles: 0,
                carType: 'none',
                flights: 0,
                publicTransport: 0,
                electricityBill: 0,
                greenEnergy: 0,
                gasBill: 0,
                roommates: 1,
                diet: 'average-meat',
                foodWaste: 'low',
                localFood: 'some',
                recycling,
                compost: 'no', // credit +0.05
                shopping: 'average' // base 0.9
            });

            // full: -0.2 credit -> 0.9 - 0.2 + 0.05 = 0.75
            expect(calculateEmissions(details('full')).waste).toBe(0.75);
            // none: 0.1 credit -> 0.9 + 0.1 + 0.05 = 1.05
            expect(calculateEmissions(details('none')).waste).toBe(1.05);
        });
    });

    describe('calculateSimulatorSavings', () => {
        const baselineCalc = {
            total: 7.3,
            details: {
                carMiles: 80,
                carType: 'medium-petrol', // factor 0.35
                flights: 4,
                publicTransport: 2,
                electricityBill: 90,
                greenEnergy: 0,
                gasBill: 40,
                roommates: 2,
                diet: 'average-meat',
                foodWaste: 'low',
                localFood: 'some',
                recycling: 'full',
                compost: 'no',
                shopping: 'average'
            }
        };

        test('calculates zero savings when sliders are at zero', () => {
            const simulatorState = {
                carReduction: 0,
                plantDietDays: 0,
                cleanEnergy: 0
            };

            const result = calculateSimulatorSavings(baselineCalc, simulatorState);

            expect(result.carSavings).toBe(0);
            expect(result.dietSavings).toBe(0);
            expect(result.energySavings).toBe(0);
            expect(result.totalSavings).toBe(0);
            expect(result.simulatedCO2).toBe(7.3);
        });

        test('calculates correct savings for partial habit changes', () => {
            const simulatorState = {
                carReduction: 50, // 50% reduction in car travel
                plantDietDays: 3, // 3 meatless days
                cleanEnergy: 80 // increase clean energy to 80%
            };

            const result = calculateSimulatorSavings(baselineCalc, simulatorState);

            // Car savings:
            // originalCarCO2 = (80 * 52 * 0.35) / 1000 = 1.456
            // 50% savings = 1.456 * 0.5 = 0.728 -> 0.73
            expect(result.carSavings).toBe(0.73);

            // Diet savings:
            // 3 days * 3 kg * 52 / 1000 = 0.468 -> 0.47
            expect(result.dietSavings).toBe(0.47);

            // Energy savings:
            // electricityKwh = (90 / 0.15) * 12 = 7200
            // original electricity CO2 = 7200 * 0.38 * (1 - 0) / 1000 / 2 = 1.368
            // simulated electricity CO2 = 7200 * 0.38 * (1 - 0.8) / 1000 / 2 = 0.2736
            // energy savings = 1.368 - 0.2736 = 1.0944 -> 1.09
            expect(result.energySavings).toBe(1.09);

            // Total savings: 0.728 + 0.468 + 1.0944 = 2.2904 -> 2.29
            expect(result.totalSavings).toBe(2.29);

            // Simulated CO2: max(0.5, 7.3 - 2.2904) = 5.0
            expect(result.simulatedCO2).toBe(5.0);
        });

        test('does not calculate negative energy savings if clean energy slider is lower than baseline', () => {
            const highCleanBaseline = {
                total: 5.0,
                details: {
                    ...baselineCalc.details,
                    greenEnergy: 50 // baseline is already 50% clean
                }
            };

            const simulatorState = {
                carReduction: 0,
                plantDietDays: 0,
                cleanEnergy: 30 // slider is set to 30%, which is lower than 50%
            };

            const result = calculateSimulatorSavings(highCleanBaseline, simulatorState);

            expect(result.energySavings).toBe(0); // savings should not be negative
            expect(result.simulatedCO2).toBe(5.0);
        });

        test('covers all car types in simulator savings', () => {
            const details = (carType) => ({
                total: 10.0,
                details: {
                    carMiles: 100,
                    carType,
                    flights: 0,
                    publicTransport: 0,
                    electricityBill: 0,
                    greenEnergy: 0,
                    gasBill: 0,
                    roommates: 1,
                    diet: 'average-meat',
                    foodWaste: 'low',
                    localFood: 'some',
                    recycling: 'partial',
                    compost: 'no',
                    shopping: 'average'
                }
            });

            const simState = { carReduction: 50, plantDietDays: 0, cleanEnergy: 0 };

            // large-petrol (0.45): originalCarCO2 = 100 * 52 * 0.45 / 1000 = 2.34. 50% savings = 1.17
            expect(calculateSimulatorSavings(details('large-petrol'), simState).carSavings).toBe(1.17);
            // diesel (0.31): originalCarCO2 = 100 * 52 * 0.31 / 1000 = 1.612. 50% savings = 0.81
            expect(calculateSimulatorSavings(details('diesel'), simState).carSavings).toBe(0.81);
            // hybrid (0.20): originalCarCO2 = 100 * 52 * 0.20 / 1000 = 1.04. 50% savings = 0.52
            expect(calculateSimulatorSavings(details('hybrid'), simState).carSavings).toBe(0.52);
            // ev (0.08): originalCarCO2 = 100 * 52 * 0.08 / 1000 = 0.416. 50% savings = 0.21
            expect(calculateSimulatorSavings(details('ev'), simState).carSavings).toBe(0.21);
            // none (0.0): originalCarCO2 = 0. 50% savings = 0
            expect(calculateSimulatorSavings(details('none'), simState).carSavings).toBe(0);
        });
    });
});
