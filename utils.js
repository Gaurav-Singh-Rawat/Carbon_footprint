// EcoTrace calculation utilities

/**
 * Helper to get carbon letter grade based on annual CO2 equivalent value in tons.
 * @param {number} co2Value 
 * @returns {{grade: string, class: string}}
 */
function getCarbonGrade(co2Value) {
    if (co2Value < 3.0) return { grade: 'A', class: 'grade-a' };
    if (co2Value < 6.0) return { grade: 'B', class: 'grade-b' };
    if (co2Value < 10.0) return { grade: 'C', class: 'grade-c' };
    if (co2Value < 15.0) return { grade: 'D', class: 'grade-d' };
    return { grade: 'F', class: 'grade-f' };
}

/**
 * Computes emissions in tons of CO2e per year based on input details.
 * @param {object} details 
 * @returns {{transport: number, energy: number, food: number, waste: number, total: number}}
 */
function calculateEmissions(details) {
    // 1. TRANSPORTATION COMPUTATIONS
    let carFactor = 0.35; // default medium-petrol
    if (details.carType === 'large-petrol') carFactor = 0.45;
    else if (details.carType === 'diesel') carFactor = 0.31;
    else if (details.carType === 'hybrid') carFactor = 0.20;
    else if (details.carType === 'ev') carFactor = 0.08;
    else if (details.carType === 'none') carFactor = 0.0;

    const carCO2 = (details.carMiles * 52 * carFactor) / 1000; // kg to tons
    const flightCO2 = (details.flights * 90) / 1000; // 90 kg CO2 per flight hour
    const publicTransportCO2 = (details.publicTransport * 52 * 1.2) / 1000; // 1.2 kg per transit hour

    const totalTransport = carCO2 + flightCO2 + publicTransportCO2;

    // 2. ENERGY COMPUTATIONS
    // Estimate electricity kWh: monthly bill / $0.15 average rate
    const electricityKwh = (details.electricityBill / 0.15) * 12;
    // Clean energy factor discount
    const cleanDiscount = details.greenEnergy / 100;
    const electricityCO2 = (electricityKwh * 0.38 * (1 - cleanDiscount)) / 1000; // 0.38 kg CO2 per kWh
    
    // Estimate natural gas: monthly bill / $1.00 per therm
    const gasTherms = (details.gasBill / 1.00) * 12;
    const gasCO2 = (gasTherms * 5.3) / 1000; // 5.3 kg CO2 per therm

    // Shared household split
    const totalEnergy = (electricityCO2 + gasCO2) / details.roommates;

    // 3. DIET & FOOD COMPUTATIONS
    let dietBase = 2.0; // average balanced diet
    if (details.diet === 'heavy-meat') dietBase = 3.0;
    else if (details.diet === 'low-meat') dietBase = 1.5;
    else if (details.diet === 'vegetarian') dietBase = 1.1;
    else if (details.diet === 'vegan') dietBase = 0.6;

    let foodWasteAdj = 0.0;
    if (details.foodWaste === 'none') foodWasteAdj = -0.1;
    else if (details.foodWaste === 'medium') foodWasteAdj = 0.15;
    else if (details.foodWaste === 'high') foodWasteAdj = 0.35;

    let localFoodAdj = 0.0;
    if (details.localFood === 'mostly') localFoodAdj = -0.15;
    else if (details.localFood === 'rarely') localFoodAdj = 0.15;

    const totalFood = Math.max(0.2, dietBase + foodWasteAdj + localFoodAdj);

    // 4. WASTE & CONSUMPTION COMPUTATIONS
    let shoppingBase = 0.9; // average
    if (details.shopping === 'minimal') shoppingBase = 0.4;
    else if (details.shopping === 'heavy') shoppingBase = 2.0;

    let recycleCredit = -0.05; // partial
    if (details.recycling === 'full') recycleCredit = -0.2;
    else if (details.recycling === 'none') recycleCredit = 0.1;

    let compostCredit = 0.05; // no compost
    if (details.compost === 'yes') compostCredit = -0.1;

    const totalWaste = Math.max(0.1, shoppingBase + recycleCredit + compostCredit);

    // COMBINE ALL RESULTS
    const total = parseFloat((totalTransport + totalEnergy + totalFood + totalWaste).toFixed(1));

    return {
        transport: parseFloat(totalTransport.toFixed(2)),
        energy: parseFloat(totalEnergy.toFixed(2)),
        food: parseFloat(totalFood.toFixed(2)),
        waste: parseFloat(totalWaste.toFixed(2)),
        total: total
    };
}

/**
 * Computes simulator adjustments and carbon savings.
 * @param {object} originalCalc 
 * @param {object} simulatorState 
 * @returns {{carSavings: number, dietSavings: number, energySavings: number, totalSavings: number, simulatedCO2: number}}
 */
function calculateSimulatorSavings(originalCalc, simulatorState) {
    const details = originalCalc.details;

    // Commuting reduction: scales transport car portion down
    let carFactor = 0.35;
    if (details.carType === 'large-petrol') carFactor = 0.45;
    else if (details.carType === 'diesel') carFactor = 0.31;
    else if (details.carType === 'hybrid') carFactor = 0.20;
    else if (details.carType === 'ev') carFactor = 0.08;
    else if (details.carType === 'none') carFactor = 0.0;

    const originalCarCO2 = (details.carMiles * 52 * carFactor) / 1000;
    const simCarSavings = originalCarCO2 * (simulatorState.carReduction / 100);

    // Plant based meals: saves ~3 kg per meatless day per week annually
    const simDietSavings = (simulatorState.plantDietDays * 3.0 * 52) / 1000;

    // Clean energy: scales energy electricity portion down to clean
    const electricityKwh = (details.electricityBill / 0.15) * 12;
    const originalClean = details.greenEnergy / 100;
    const originalElectricityCO2 = (electricityKwh * 0.38 * (1 - originalClean)) / 1000 / details.roommates;
    
    const simCleanPercent = simulatorState.cleanEnergy / 100;
    let simEnergySavings = 0;
    if (simCleanPercent > originalClean) {
        const simulatedElectricityCO2 = (electricityKwh * 0.38 * (1 - simCleanPercent)) / 1000 / details.roommates;
        simEnergySavings = originalElectricityCO2 - simulatedElectricityCO2;
    }

    const totalSavings = parseFloat((simCarSavings + simDietSavings + simEnergySavings).toFixed(2));
    const simulatedCO2 = Math.max(0.5, parseFloat((originalCalc.total - totalSavings).toFixed(1)));

    return {
        carSavings: parseFloat(simCarSavings.toFixed(2)),
        dietSavings: parseFloat(simDietSavings.toFixed(2)),
        energySavings: parseFloat(simEnergySavings.toFixed(2)),
        totalSavings,
        simulatedCO2
    };
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getCarbonGrade,
        calculateEmissions,
        calculateSimulatorSavings
    };
}
