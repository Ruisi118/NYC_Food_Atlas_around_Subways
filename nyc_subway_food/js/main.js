// Create global namespace (if it doesn't exist yet)
if (!window.appData) {
    window.appData = {
        stations: [],
        restaurants: [],
        subwayLines: []
    };
}

// Current active tab
let currentTab = 'map';

// Initialize application
function initApp() {
    console.log("Application initialization starting...");
    
    // Add tab switching events
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            // Get target tab
            const targetTab = this.dataset.tab;
            
            // Switch tabs
            switchTab(targetTab);
        });
    });
    
    // Set page title
    document.title = "NYC Subway Food Atlas";
    
    // Set default active tab
    switchTab('map');
    
    console.log("Application initialization complete");
}

// Switch tab
function switchTab(tabName) {
    console.log(`Switching tab: ${currentTab} -> ${tabName}`);
    
    // Update current tab
    currentTab = tabName;
    
    // Update tab button states
    document.querySelectorAll('.tab-button').forEach(button => {
        if (button.dataset.tab === tabName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Update content tab states
    document.querySelectorAll('.content-tab').forEach(tab => {
        if (tab.id === `${tabName}-tab`) {
            tab.classList.add('active');
            tab.style.display = 'flex'; // Explicitly set display style
        } else {
            tab.classList.remove('active');
            tab.style.display = 'none'; // Hide inactive tabs
        }
    });
    
    // Handle special logic based on tab type
    switch(tabName) {
        case 'map':
            // If map is already initialized, resize it
            if (window.mapModule && window.mapModule.map) {
                console.log("Resizing map");
                window.mapModule.map.invalidateSize();
            }
            break;
            
        case 'data':
            // If charts not initialized, initialize them
            if (window.chartsModule && !window.chartsModule.diversityChart) {
                console.log("Initializing data analysis charts");
                window.chartsModule.initCharts();
            }
            break;
            
        case 'commuter':
            // Initialize commuter view
            console.log("Initializing commuter view");
            if (typeof initCommuterView === 'function') {
                initCommuterView();
            } else if (window.commuterModule && window.commuterModule.initCommuterView) {
                window.commuterModule.initCommuterView();
            }
            break;
    }
}

// Handle interactive elements
function initInteractiveElements() {
    // Price filter buttons
    document.querySelectorAll('.price-button').forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('.price-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update restaurant display if in map view
            if (currentTab === 'map' && window.mapModule && window.mapModule.selectedStation) {
                window.mapModule.showRestaurantsForStation(window.mapModule.selectedStation);
            }
        });
    });
    
    // Subway line filter
    const lineFilter = document.getElementById('subway-line-filter');
    if (lineFilter) {
        lineFilter.addEventListener('change', function() {
            if (currentTab === 'map' && window.mapModule) {
                window.mapModule.drawStations();
            }
        });
    }
    
    // Cuisine filter
    const cuisineFilter = document.getElementById('cuisine-filter');
    if (cuisineFilter) {
        cuisineFilter.addEventListener('change', function() {
            if (currentTab === 'map' && window.mapModule && window.mapModule.selectedStation) {
                window.mapModule.showRestaurantsForStation(window.mapModule.selectedStation);
            }
        });
    }
    
    // Diversity ranking button
    const diversityBtn = document.getElementById('diversity-rank-btn');
    if (diversityBtn) {
        diversityBtn.addEventListener('click', function() {
            if (currentTab === 'map' && window.mapModule) {
                window.mapModule.showHighDiversityStations();
            }
        });
    }
    
    // Find food button
    const findFoodBtn = document.getElementById('find-food-btn');
    if (findFoodBtn) {
        findFoodBtn.addEventListener('click', function() {
            if (currentTab === 'commuter' && typeof findFoodOnRoute === 'function') {
                findFoodOnRoute();
            }
        });
    }
}

// Page load complete, initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Initialize application
    initApp();
    
    // Initialize interactive elements
    initInteractiveElements();
    
    // Add window resize event
    window.addEventListener('resize', function() {
        // Adjust active view
        switch(currentTab) {
            case 'map':
                if (window.mapModule && window.mapModule.map) {
                    window.mapModule.map.invalidateSize();
                }
                break;
                
            case 'data':
                if (window.chartsModule) {
                    // Update chart sizes if resize method is available
                    if (window.chartsModule.diversityChart && window.chartsModule.diversityChart.resize) {
                        window.chartsModule.diversityChart.resize();
                    }
                    if (window.chartsModule.boroughChart && window.chartsModule.boroughChart.resize) {
                        window.chartsModule.boroughChart.resize();
                    }
                    if (window.chartsModule.cuisineChart && window.chartsModule.cuisineChart.resize) {
                        window.chartsModule.cuisineChart.resize();
                    }
                    if (window.chartsModule.priceChart && window.chartsModule.priceChart.resize) {
                        window.chartsModule.priceChart.resize();
                    }
                }
                break;
                
            case 'commuter':
                if (typeof commuterMap !== 'undefined' && commuterMap) {
                    commuterMap.invalidateSize();
                }
                break;
        }
    });
});

// Add error handling
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    
    // Show error notification
    const errorNotification = document.createElement('div');
    errorNotification.className = 'error-notification';
    errorNotification.innerHTML = `
        <div class="error-content">
            <h3>Error</h3>
            <p>${event.message}</p>
            <button class="close-btn">Close</button>
        </div>
    `;
    
    document.body.appendChild(errorNotification);
    
    // Add close button event
    errorNotification.querySelector('.close-btn').addEventListener('click', function() {
        errorNotification.remove();
    });
    
    // Auto close
    setTimeout(() => {
        if (document.body.contains(errorNotification)) {
            errorNotification.remove();
        }
    }, 5000);
});