// EcoTrace Application Logic
document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const state = {
        theme: localStorage.getItem('theme') || 'dark',
        activeTab: 'dashboard',
        xp: parseInt(localStorage.getItem('eco_xp')) || 0,
        completedChallenges: JSON.parse(localStorage.getItem('eco_challenges')) || {},
        calculatorResults: JSON.parse(localStorage.getItem('eco_calc')) || {
            transport: 2.5,
            energy: 3.0,
            food: 2.1,
            waste: 0.8,
            total: 8.4,
            details: {
                carMiles: 80,
                carType: 'medium-petrol',
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
        },
        simulator: {
            carReduction: 0,
            plantDietDays: 0,
            cleanEnergy: 0
        }
    };

    // --- DOM ELEMENT REFERENCES ---
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const viewTitle = document.getElementById('view-title');
    const viewSubtitle = document.getElementById('view-subtitle');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const sunIcon = themeToggleBtn.querySelector('.sun-icon');
    const moonIcon = themeToggleBtn.querySelector('.moon-icon');

    // Calculator Elements
    const calcSteps = document.querySelectorAll('.calc-step');
    const calcDots = document.querySelectorAll('.step-dot');
    const progressFill = document.getElementById('calc-progress-fill');
    const btnCalcPrev = document.getElementById('btn-calc-prev');
    const btnCalcNext = document.getElementById('btn-calc-next');
    let currentCalcStep = 0;

    // Charts
    let breakdownChartInstance = null;
    let comparisonChartInstance = null;

    // --- THEME MANAGEMENT ---
    function applyTheme() {
        document.documentElement.setAttribute('data-theme', state.theme);
        if (state.theme === 'light') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
        // Redraw charts if they exist to match theme styles
        updateCharts();
    }

    themeToggleBtn.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', state.theme);
        applyTheme();
    });

    // --- TAB ROUTING ---
    function switchTab(tabId) {
        state.activeTab = tabId;
        
        // Update Nav Menu UI
        navItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update View Contents
        tabContents.forEach(content => {
            if (content.id === `tab-${tabId}`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        // Header Labels Update
        const meta = {
            dashboard: { title: 'Dashboard', subtitle: 'Your carbon footprint at a glance' },
            calculator: { title: 'Footprint Calculator', subtitle: 'Detailed assessment of your environmental impact' },
            challenges: { title: 'Eco Challenges', subtitle: 'Take simple daily actions to build sustainable habits' },
            roadmap: { title: 'Reduction Roadmap', subtitle: 'Personalized steps to minimize your carbon emissions' }
        };

        viewTitle.textContent = meta[tabId].title;
        viewSubtitle.textContent = meta[tabId].subtitle;

        // Perform specific updates per tab
        if (tabId === 'dashboard') {
            renderDashboard();
        } else if (tabId === 'challenges') {
            renderChallenges();
        } else if (tabId === 'roadmap') {
            renderRoadmap();
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            switchTab(item.getAttribute('data-tab'));
        });
    });

    // --- EMISSIONS COMPUTATION ENGINE ---
    // Calculations return tons of CO2e per year
    function runCalculations() {
        const d = state.calculatorResults.details;
        const results = calculateEmissions(d);
        
        state.calculatorResults.transport = results.transport;
        state.calculatorResults.energy = results.energy;
        state.calculatorResults.food = results.food;
        state.calculatorResults.waste = results.waste;
        state.calculatorResults.total = results.total;

        localStorage.setItem('eco_calc', JSON.stringify(state.calculatorResults));
        
        // Unlock badge for completion
        unlockBadge('badge-calculator');
    }

    // --- ECO IMPACT SIMULATOR ENGINE ---
    function updateSimulator() {
        const originalCalc = state.calculatorResults;
        const results = calculateSimulatorSavings(originalCalc, state.simulator);
        
        const totalSavings = results.totalSavings;
        const simulatedCO2 = results.simulatedCO2;

        // Update Simulator UI values
        document.getElementById('sim-result-co2').textContent = `${simulatedCO2} Tons`;
        document.getElementById('sim-result-savings').textContent = `-${totalSavings} Tons`;

        // Update simulation outputs on dashboard grade badge if sliders are dirty
        const isDirty = state.simulator.carReduction > 0 || state.simulator.plantDietDays > 0 || state.simulator.cleanEnergy > 0;
        
        const badgeNode = document.getElementById('carbon-grade-badge');
        const letterNode = document.getElementById('carbon-grade-val');
        const scoreTextNode = document.getElementById('annual-co2-val');

        if (isDirty) {
            const currentSimGrade = getCarbonGrade(simulatedCO2);
            scoreTextNode.textContent = simulatedCO2;
            
            // Clean older classes
            badgeNode.className = `score-grade-badge ${currentSimGrade.class}`;
            letterNode.textContent = currentSimGrade.grade;
            
            // Update meter bar fill
            const maxVal = 20; // 20 tons is the max representation
            const fillWidth = Math.min(100, (simulatedCO2 / maxVal) * 100);
            document.getElementById('score-meter-fill-bar').style.width = `${fillWidth}%`;

            if (totalSavings >= 2.0) {
                unlockBadge('badge-neutraliser');
            }
        } else {
            // Revert to computed baseline
            const baseGrade = getCarbonGrade(originalCalc.total);
            scoreTextNode.textContent = originalCalc.total;
            badgeNode.className = `score-grade-badge ${baseGrade.class}`;
            letterNode.textContent = baseGrade.grade;

            const maxVal = 20;
            const fillWidth = Math.min(100, (originalCalc.total / maxVal) * 100);
            document.getElementById('score-meter-fill-bar').style.width = `${fillWidth}%`;
        }
    }

    // Attach simulator events
    document.getElementById('sim-car').addEventListener('input', (e) => {
        state.simulator.carReduction = parseInt(e.target.value);
        document.getElementById('sim-car-val').textContent = `${state.simulator.carReduction}%`;
        updateSimulator();
    });

    document.getElementById('sim-diet').addEventListener('input', (e) => {
        state.simulator.plantDietDays = parseInt(e.target.value);
        document.getElementById('sim-diet-val').textContent = `${state.simulator.plantDietDays} days/wk`;
        updateSimulator();
    });

    document.getElementById('sim-energy').addEventListener('input', (e) => {
        state.simulator.cleanEnergy = parseInt(e.target.value);
        document.getElementById('sim-energy-val').textContent = `${state.simulator.cleanEnergy}%`;
        updateSimulator();
    });

    // --- CALCULATOR INTERACTIONS ---
    function updateCalculatorWizard() {
        // Show active step
        calcSteps.forEach((step, idx) => {
            if (idx === currentCalcStep) {
                step.classList.add('active-step');
            } else {
                step.classList.remove('active-step');
            }
        });

        // Update step indicators
        calcDots.forEach((dot, idx) => {
            if (idx === currentCalcStep) {
                dot.classList.add('active');
            } else if (idx < currentCalcStep) {
                dot.classList.add('active'); // show completed style
            } else {
                dot.classList.remove('active');
            }
        });

        // Update progress bar fill
        const progressPercent = ((currentCalcStep + 1) / calcSteps.length) * 100;
        progressFill.style.width = `${progressPercent}%`;

        // Update buttons state
        btnCalcPrev.disabled = currentCalcStep === 0;

        if (currentCalcStep === calcSteps.length - 1) {
            btnCalcNext.innerHTML = `Calculate Footprint <i data-lucide="check"></i>`;
        } else {
            btnCalcNext.innerHTML = `Next <i data-lucide="arrow-right"></i>`;
        }
        lucide.createIcons();
    }

    btnCalcNext.addEventListener('click', () => {
        if (currentCalcStep < calcSteps.length - 1) {
            currentCalcStep++;
            updateCalculatorWizard();
        } else {
            // Save inputs and compute footprint
            const details = state.calculatorResults.details;
            
            // Gather values
            details.carMiles = Math.max(0, parseFloat(document.getElementById('calc-car-miles').value) || 0);
            details.carType = document.getElementById('calc-car-type').value;
            details.flights = Math.max(0, parseFloat(document.getElementById('calc-flights').value) || 0);
            details.publicTransport = Math.max(0, parseFloat(document.getElementById('calc-public-transport').value) || 0);
            
            details.electricityBill = Math.max(0, parseFloat(document.getElementById('calc-electricity-bill').value) || 0);
            details.greenEnergy = parseInt(document.getElementById('calc-green-energy').value);
            details.gasBill = Math.max(0, parseFloat(document.getElementById('calc-gas-bill').value) || 0);
            details.roommates = Math.max(1, parseInt(document.getElementById('calc-roommates').value) || 1);
            
            // Diet Radio options
            const dietRadio = document.querySelector('input[name="diet"]:checked');
            if (dietRadio) {details.diet = dietRadio.value;}
            
            details.foodWaste = document.getElementById('calc-food-waste').value;
            details.localFood = document.getElementById('calc-local-food').value;
            
            details.recycling = document.getElementById('calc-recycling').value;
            details.compost = document.getElementById('calc-compost').value;
            details.shopping = document.getElementById('calc-shopping').value;

            // Trigger core calculation & state save
            runCalculations();

            // Zero waste badge check
            if (details.recycling === 'full' && details.compost === 'yes') {
                unlockBadge('badge-zerowaste');
            }

            // Redirect back to dashboard to view outputs
            switchTab('dashboard');
        }
    });

    btnCalcPrev.addEventListener('click', () => {
        if (currentCalcStep > 0) {
            currentCalcStep--;
            updateCalculatorWizard();
        }
    });

    // Populate initial inputs from stored values
    function initCalculatorValues() {
        const details = state.calculatorResults.details;
        document.getElementById('calc-car-miles').value = details.carMiles;
        document.getElementById('calc-car-type').value = details.carType;
        document.getElementById('calc-flights').value = details.flights;
        document.getElementById('calc-public-transport').value = details.publicTransport;
        
        document.getElementById('calc-electricity-bill').value = details.electricityBill;
        document.getElementById('calc-green-energy').value = details.greenEnergy;
        document.getElementById('calc-green-energy-val').textContent = details.greenEnergy;
        document.getElementById('calc-gas-bill').value = details.gasBill;
        document.getElementById('calc-roommates').value = details.roommates;

        // Diet radios
        const dietRadios = document.querySelectorAll('input[name="diet"]');
        dietRadios.forEach(radio => {
            if (radio.value === details.diet) {
                radio.checked = true;
                // Add styling helper to grandparent/parent wrapper
                document.querySelectorAll('.diet-radio-card').forEach(card => card.classList.remove('checked'));
                radio.closest('.diet-radio-card').classList.add('checked');
            }
        });

        document.getElementById('calc-food-waste').value = details.foodWaste;
        document.getElementById('calc-local-food').value = details.localFood;
        
        document.getElementById('calc-recycling').value = details.recycling;
        document.getElementById('calc-compost').value = details.compost;
        document.getElementById('calc-shopping').value = details.shopping;
    }

    // Diet radio interactive visual borders
    document.querySelectorAll('input[name="diet"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('.diet-radio-card').forEach(card => card.classList.remove('checked'));
            e.target.closest('.diet-radio-card').classList.add('checked');
        });
    });

    // Range display updating
    document.getElementById('calc-green-energy').addEventListener('input', (e) => {
        document.getElementById('calc-green-energy-val').textContent = e.target.value;
    });

    // --- CHARTS SYSTEM (CHART.JS) ---
    function updateCharts() {
        const isDark = state.theme === 'dark';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        const textLabelColor = isDark ? '#94a3b8' : '#475569';
        const titleFontFamily = 'Outfit, sans-serif';
        const labelFontFamily = 'Inter, sans-serif';

        // 1. BREAKDOWN CHART (Donut)
        const breakdownCtx = document.getElementById('breakdownChart')?.getContext('2d');
        if (breakdownCtx) {
            const dataValues = [
                state.calculatorResults.transport,
                state.calculatorResults.energy,
                state.calculatorResults.food,
                state.calculatorResults.waste
            ];

            const chartData = {
                labels: ['Transport', 'Home Energy', 'Food & Diet', 'Waste & Purchases'],
                datasets: [{
                    data: dataValues,
                    backgroundColor: [
                        '#3b82f6', // blue
                        '#f97316', // orange
                        '#10b981', // emerald
                        '#ef4444'  // red
                    ],
                    borderWidth: 0,
                    hoverOffset: 12
                }]
            };

            if (breakdownChartInstance) {
                breakdownChartInstance.data = chartData;
                breakdownChartInstance.options.plugins.legend.labels.color = textLabelColor;
                breakdownChartInstance.update();
            } else {
                breakdownChartInstance = new Chart(breakdownCtx, {
                    type: 'doughnut',
                    data: chartData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '68%',
                        plugins: {
                            legend: {
                                display: false // use custom HTML legend instead
                            },
                            tooltip: {
                                padding: 12,
                                bodyFont: { family: labelFontFamily, size: 13 },
                                titleFont: { family: titleFontFamily, weight: 'bold' }
                            }
                        }
                    }
                });
            }

            // Populate Custom Legend HTML
            const legendContainer = document.getElementById('breakdown-chart-legend');
            if (legendContainer) {
                const total = dataValues.reduce((a, b) => a + b, 0);
                legendContainer.innerHTML = '';
                chartData.labels.forEach((label, i) => {
                    const val = dataValues[i];
                    const percent = total > 0 ? Math.round((val / total) * 100) : 0;
                    const color = chartData.datasets[0].backgroundColor[i];
                    
                    legendContainer.innerHTML += `
                        <div class="legend-item">
                            <span class="legend-dot" style="background-color: ${color}"></span>
                            <span>${label} (${percent}%)</span>
                        </div>
                    `;
                });
            }
        }

        // 2. COMPARISON CHART (Bar)
        const comparisonCtx = document.getElementById('comparisonChart')?.getContext('2d');
        if (comparisonCtx) {
            const comparisonData = {
                labels: ['You', 'Global Avg', 'US Avg'],
                datasets: [{
                    label: 'CO₂e Emissions (Tons)',
                    data: [state.calculatorResults.total, 4.7, 16.0],
                    backgroundColor: [
                        '#10b981', // emerald
                        '#6366f1', // indigo
                        '#ef4444'  // red
                    ],
                    borderRadius: 8,
                    barThickness: 28
                }]
            };

            if (comparisonChartInstance) {
                comparisonChartInstance.data = comparisonData;
                comparisonChartInstance.options.scales.x.ticks.color = textLabelColor;
                comparisonChartInstance.options.scales.y.ticks.color = textLabelColor;
                comparisonChartInstance.options.scales.y.grid.color = gridColor;
                comparisonChartInstance.update();
            } else {
                comparisonChartInstance = new Chart(comparisonCtx, {
                    type: 'bar',
                    data: comparisonData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                padding: 12,
                                bodyFont: { family: labelFontFamily, size: 13 },
                                titleFont: { family: titleFontFamily }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: {
                                    color: textLabelColor,
                                    font: { family: labelFontFamily, weight: '500' }
                                }
                            },
                            y: {
                                border: { dash: [4, 4] },
                                grid: { color: gridColor },
                                ticks: {
                                    color: textLabelColor,
                                    font: { family: labelFontFamily }
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    // --- DASHBOARD RENDERING ---
    function renderDashboard() {
        const co2Val = state.calculatorResults.total;
        document.getElementById('annual-co2-val').textContent = co2Val;

        // Reset Simulator sliders inputs to 0
        document.getElementById('sim-car').value = 0;
        document.getElementById('sim-car-val').textContent = '0%';
        document.getElementById('sim-diet').value = 0;
        document.getElementById('sim-diet-val').textContent = '0 days/wk';
        document.getElementById('sim-energy').value = 0;
        document.getElementById('sim-energy-val').textContent = '0%';

        state.simulator = { carReduction: 0, plantDietDays: 0, cleanEnergy: 0 };
        document.getElementById('sim-result-co2').textContent = `${co2Val} Tons`;
        document.getElementById('sim-result-savings').textContent = `-0.0 Tons`;

        // Carbon Grade Badge
        const gradeInfo = getCarbonGrade(co2Val);
        const gradeBadge = document.getElementById('carbon-grade-badge');
        gradeBadge.className = `score-grade-badge ${gradeInfo.class}`;
        document.getElementById('carbon-grade-val').textContent = gradeInfo.grade;

        // Progress score meter line
        const maxVal = 20; // 20 tons is US Avg / indicator ceiling
        const fillWidth = Math.min(100, (co2Val / maxVal) * 100);
        document.getElementById('score-meter-fill-bar').style.width = `${fillWidth}%`;

        // Check if user is Grade A for badges
        if (gradeInfo.grade === 'A') {
            unlockBadge('badge-champion');
        }

        updateCharts();
        renderDashboardBadges();
        lucide.createIcons();
    }

    // --- ECO-CHALLENGES LIST & CHECKLISTS ---
    const challengesList = [
        { id: 'ch-transport', label: 'Commuted without a car', desc: 'Walk, cycle, carpool, or take public transit today.', offset: 4.5, xp: 25, icon: 'bike', cat: 'transport' },
        { id: 'ch-diet', label: 'Ate fully plant-based meals', desc: 'Avoided dairy and meat consumption all day.', offset: 3.2, xp: 20, icon: 'salad', cat: 'food' },
        { id: 'ch-appliances', label: 'Unplugged standby appliances', desc: 'Switched off home appliances at the source.', offset: 1.1, xp: 15, icon: 'power', cat: 'energy' },
        { id: 'ch-waste', label: 'Zero food waste daily check', desc: 'Finished leftovers, avoided rotting dumpster scrap.', offset: 1.5, xp: 15, icon: 'utensils-cross', cat: 'food' },
        { id: 'ch-plastic', label: 'Ditched single-use plastic', desc: 'Used reusable mugs, shopping bags, and bottles.', offset: 0.8, xp: 10, icon: 'ban', cat: 'waste' },
        { id: 'ch-shower', label: 'Short shower session (< 5 mins)', desc: 'Reduced hot water heating requirements.', offset: 1.2, xp: 15, icon: 'droplet', cat: 'energy' }
    ];

    function renderChallenges() {
        const container = document.getElementById('challenges-list-container');
        if (!container) {return;}

        container.innerHTML = '';
        challengesList.forEach(ch => {
            const isChecked = state.completedChallenges[ch.id] === true;
            
            const card = document.createElement('div');
            card.className = `eco-action-card ${isChecked ? 'checked' : ''}`;
            card.innerHTML = `
                <div class="action-checkbox-content" data-challenge-id="${ch.id}">
                    <div class="custom-checkbox">
                        <i data-lucide="check"></i>
                    </div>
                    <div class="action-info">
                        <span class="action-label">${ch.label}</span>
                        <span class="action-sub-lbl text-secondary">${ch.desc}</span>
                    </div>
                </div>
                <div class="action-impact-pill">-${ch.offset} kg CO₂e</div>
            `;

            // Setup click events
            card.querySelector('.action-checkbox-content').addEventListener('click', () => {
                toggleChallenge(ch.id);
            });

            container.appendChild(card);
        });

        // XP Block progress rendering
        const currentLevel = Math.floor(state.xp / 100) + 1;
        const progressInLevel = state.xp % 100;
        
        document.getElementById('badge-level-tag').textContent = `Eco Explorer (Lvl ${currentLevel})`;
        document.getElementById('xp-fraction').textContent = `${progressInLevel} / 100 XP`;
        document.getElementById('xp-bar-fill-indicator').style.width = `${progressInLevel}%`;

        // Render Sidebar XP tracker
        document.getElementById('user-xp-display').textContent = `${state.xp} XP • Level ${currentLevel}`;

        renderBadgesList();
        lucide.createIcons();
    }

    function toggleChallenge(challengeId) {
        const challenge = challengesList.find(ch => ch.id === challengeId);
        if (!challenge) {return;}

        const isAlreadyDone = state.completedChallenges[challengeId] === true;

        if (isAlreadyDone) {
            // Uncheck
            delete state.completedChallenges[challengeId];
            state.xp = Math.max(0, state.xp - challenge.xp);
        } else {
            // Check
            state.completedChallenges[challengeId] = true;
            state.xp += challenge.xp;
            
            // Check first checkin badge
            unlockBadge('badge-first-step');
            
            // Green Hero badge check
            if (state.xp >= 100) {
                unlockBadge('badge-hero');
            }
        }

        // Save
        localStorage.setItem('eco_challenges', JSON.stringify(state.completedChallenges));
        localStorage.setItem('eco_xp', state.xp);

        // Update total daily offset calculations
        calculateDailyOffsets();
        
        // Re-render challenges screen
        renderChallenges();
    }

    function calculateDailyOffsets() {
        let totalOffset = 0;
        challengesList.forEach(ch => {
            if (state.completedChallenges[ch.id] === true) {
                totalOffset += ch.offset;
            }
        });
        document.getElementById('today-offset-val').textContent = totalOffset.toFixed(1);
    }

    // Reset checklist items
    document.getElementById('reset-daily-btn')?.addEventListener('click', () => {
        state.completedChallenges = {};
        localStorage.setItem('eco_challenges', JSON.stringify(state.completedChallenges));
        calculateDailyOffsets();
        renderChallenges();
    });

    // --- ACHIEVEMENTS / BADGES DEFINITION ---
    const badgesData = [
        { id: 'badge-calculator', title: 'Eco Rookie', desc: 'Completed the Footprint Calculator.', icon: 'award' },
        { id: 'badge-first-step', title: 'First Steps', desc: 'Checked off your first daily action.', icon: 'footprints' },
        { id: 'badge-hero', title: 'Green Hero', desc: 'Accumulated 100 total XP points.', icon: 'shield-check' },
        { id: 'badge-champion', title: 'Climate Champion', desc: 'Achieved an emissions Grade A.', icon: 'globe' },
        { id: 'badge-neutraliser', title: 'Carbon Offsetter', desc: 'Simulated 2+ Tons of carbon reduction.', icon: 'sliders' },
        { id: 'badge-zerowaste', title: 'Zero Waste Knight', desc: 'Practiced full compost and recycling.', icon: 'trash-2' }
    ];

    function getUnlockedBadges() {
        return JSON.parse(localStorage.getItem('eco_unlocked_badges')) || [];
    }

    function unlockBadge(badgeId) {
        const unlocked = getUnlockedBadges();
        if (!unlocked.includes(badgeId)) {
            unlocked.push(badgeId);
            localStorage.setItem('eco_unlocked_badges', JSON.stringify(unlocked));
        }
    }

    function renderBadgesList() {
        const container = document.getElementById('badges-grid-container');
        if (!container) {return;}

        const unlocked = getUnlockedBadges();
        container.innerHTML = '';

        badgesData.forEach(badge => {
            const isUnlocked = unlocked.includes(badge.id);
            const card = document.createElement('div');
            card.className = `badge-card ${isUnlocked ? 'unlocked' : 'locked'}`;
            
            card.innerHTML = `
                <div class="badge-icon-wrap">
                    <i data-lucide="${badge.icon}"></i>
                </div>
                <span class="badge-title">${badge.title}</span>
                <span class="badge-desc">${badge.desc}</span>
            `;
            container.appendChild(card);
        });
    }

    function renderDashboardBadges() {
        const container = document.getElementById('dashboard-badges-container');
        if (!container) {return;}

        const unlocked = getUnlockedBadges();
        
        // Update total badges count title text
        document.getElementById('badge-count-text').textContent = `${unlocked.length} / ${badgesData.length} Badges`;
        
        container.innerHTML = '';
        badgesData.forEach(badge => {
            const isUnlocked = unlocked.includes(badge.id);
            
            const card = document.createElement('div');
            card.className = `badge-card ${isUnlocked ? 'unlocked' : 'locked'}`;
            card.style.width = '125px';
            card.innerHTML = `
                <div class="badge-icon-wrap">
                    <i data-lucide="${badge.icon}"></i>
                </div>
                <span class="badge-title" style="font-size: 11px;">${badge.title}</span>
            `;
            container.appendChild(card);
        });
    }

    // --- REDUCTION ROADMAP SUGGESTIONS ENGINE ---
    const roadmapList = [
        {
            id: 'rm-solar',
            category: 'energy',
            title: 'Transition to Home Solar Power',
            desc: 'Install solar PV panels on your rooftop to generate 100% clean, self-produced electric energy.',
            savings: '1.8 Tons CO₂e / yr',
            cost: 'High ($$$)',
            difficulty: 'Hard',
            effort: 'Installing clean solar offsets fossil fuels electricity emission output entirely.'
        },
        {
            id: 'rm-ev',
            category: 'transport',
            title: 'Upgrade to Electric Vehicle (EV)',
            desc: 'Replace standard fossil combustion engines with electric battery propulsion. Eliminates petrol tailpipes.',
            savings: '2.5 Tons CO₂e / yr',
            cost: 'High ($$$)',
            difficulty: 'Hard',
            effort: 'EVs have 70% lower emissions than traditional petrol vehicles, even on carbon-heavy grids.'
        },
        {
            id: 'rm-diet-change',
            category: 'food',
            title: 'Adopt Low-Meat / Flexitarian Diet',
            desc: 'Cut out red meat intake by substituting chicken, fish, or plant proteins. Drastically lowers agriculture impact.',
            savings: '1.2 Tons CO₂e / yr',
            cost: 'Saves Money (-$)',
            difficulty: 'Medium',
            effort: 'Beef generates massive quantities of methane compared to plants or avian proteins.'
        },
        {
            id: 'rm-led',
            category: 'energy',
            title: 'Install LED Lighting & Smart Outlets',
            desc: 'Change household incandescent light bulbs to high efficiency energy bulbs and switch off vampire loads.',
            savings: '0.3 Tons CO₂e / yr',
            cost: 'Low ($)',
            difficulty: 'Easy',
            effort: 'Saves electricity costs easily with quick payback rates.'
        },
        {
            id: 'rm-carpool',
            category: 'transport',
            title: 'Carpool / Transit Multi-day',
            desc: 'Commit to sharing vehicle rides or swapping commuting trips for trains/buses twice a week.',
            savings: '0.8 Tons CO₂e / yr',
            cost: 'Low ($)',
            difficulty: 'Medium',
            effort: 'Fewer single-occupancy vehicles means massive immediate savings.'
        },
        {
            id: 'rm-compost-scrap',
            category: 'waste',
            title: 'Start Indoor/Outdoor Composting',
            desc: 'Divert leftover food scraps, cardboard, and garden weeds into zero-methane compost boxes.',
            savings: '0.2 Tons CO₂e / yr',
            cost: 'Low ($)',
            difficulty: 'Easy',
            effort: 'Food rotting inside anaerobic landfill trash bins outputs methane, which is 28x more potent than CO2.'
        },
        {
            id: 'rm-thermostat',
            category: 'energy',
            title: 'Use Smart Thermostat Sensors',
            desc: 'Automate home temperature profiles to shut off heating/cooling when you are away from the property.',
            savings: '0.5 Tons CO₂e / yr',
            cost: 'Medium ($$)',
            difficulty: 'Easy',
            effort: 'Decreases standby gas and heating consumption margins.'
        },
        {
            id: 'rm-repair',
            category: 'waste',
            title: 'Repair/Refurbish Rather Than Buy',
            desc: 'Extend electronic device lifespans to 4+ years. Refurbish broken clothes rather than buying fast-fashion alternatives.',
            savings: '0.6 Tons CO₂e / yr',
            cost: 'Saves Money (-$)',
            difficulty: 'Medium',
            effort: 'Most product footprints occur upstream during material mining and assembly phases.'
        }
    ];

    let roadmapFilter = 'all';

    function renderRoadmap() {
        const container = document.getElementById('roadmap-grid-container');
        if (!container) {return;}

        container.innerHTML = '';

        // Sort roadmap: Put suggestions matching highest user emission category FIRST
        const categoriesOrder = [
            { cat: 'transport', val: state.calculatorResults.transport },
            { cat: 'energy', val: state.calculatorResults.energy },
            { cat: 'food', val: state.calculatorResults.food },
            { cat: 'waste', val: state.calculatorResults.waste }
        ].sort((a, b) => b.val - a.val);

        const sortedRoadmap = [...roadmapList].sort((a, b) => {
            const indexA = categoriesOrder.findIndex(c => c.cat === a.category);
            const indexB = categoriesOrder.findIndex(c => c.cat === b.category);
            return indexA - indexB;
        });

        const filteredRoadmap = sortedRoadmap.filter(item => {
            return roadmapFilter === 'all' || item.category === roadmapFilter;
        });

        filteredRoadmap.forEach(item => {
            const isHighest = item.category === categoriesOrder[0].cat;
            
            const card = document.createElement('div');
            card.className = 'roadmap-card glass';
            
            // Highlight card visual indicator if it matches user's peak source of carbon
            if (isHighest && roadmapFilter === 'all') {
                card.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                card.style.boxShadow = '0 8px 32px 0 var(--color-red-glow)';
            }

            // Category display info
            const displayCat = {
                transport: { label: 'Transport', badgeClass: 'cat-transport' },
                energy: { label: 'Home Energy', badgeClass: 'cat-energy' },
                food: { label: 'Food & Diet', badgeClass: 'cat-food' },
                waste: { label: 'Waste', badgeClass: 'cat-waste' }
            }[item.category];

            // Difficulty display badge colors
            const diffClass = {
                'Easy': 'impact-low',
                'Medium': 'impact-med',
                'Hard': 'impact-high'
            }[item.difficulty];

            card.innerHTML = `
                <div class="roadmap-card-inner">
                    <div class="roadmap-card-header">
                        <span class="card-cat-badge ${displayCat.badgeClass}">
                            ${displayCat.label} ${isHighest ? '🔥 Peak' : ''}
                        </span>
                        <span class="impact-badge ${diffClass}">${item.difficulty}</span>
                    </div>
                    <h4>${item.title}</h4>
                    <p class="card-info text-secondary">${item.desc}</p>
                    <div class="roadmap-meta">
                        <div class="meta-field">
                            <span class="meta-label">Est. Reduction</span>
                            <span class="meta-value text-emerald">${item.savings}</span>
                        </div>
                        <div class="meta-field">
                            <span class="meta-label">Financial Cost</span>
                            <span class="meta-value">${item.cost}</span>
                        </div>
                    </div>
                </div>
                <button class="btn btn-secondary implement-roadmap-btn" data-id="${item.id}">
                    Learn Impact Details
                </button>
            `;

            // Popup detail toggle (just simple alert/card detail display modal style interaction)
            card.querySelector('.implement-roadmap-btn').addEventListener('click', () => {
                alert(`IMPACT OVERVIEW:\n\n${item.title}\n\nWhy this helps: ${item.effort}\nEstimated offset: ${item.savings}\nSetup difficulty: ${item.difficulty}`);
            });

            container.appendChild(card);
        });
        lucide.createIcons();
    }

    // Roadmap filter button events
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            roadmapFilter = e.target.getAttribute('data-filter');
            renderRoadmap();
        });
    });

    // --- INITIALIZATION ---
    function init() {
        applyTheme();
        initCalculatorValues();
        calculateDailyOffsets();
        
        // Initial tab render
        switchTab(state.activeTab);
    }

    init();
});
