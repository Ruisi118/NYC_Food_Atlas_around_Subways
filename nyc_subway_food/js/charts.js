// Create global namespace
if (!window.appData) {
    window.appData = {
        stations: [],
        restaurants: [],
        subwayLines: []
    };
}

// Charts module namespace
window.chartsModule = {
    // Chart objects
    diversityChart: null,
    boroughChart: null,
    cuisineChart: null,
    priceChart: null,

    // Initialize charts
    initCharts: function() {
        // First, ensure all chart elements have proper containers
        this.setupChartContainers();
        
        // Use existing data if available, otherwise load data
        if (window.appData.stations.length > 0 && window.appData.restaurants.length > 0) {
            console.log("Using existing data to create charts");
            this.createDiversityChart();
            this.createBoroughChart();
            this.createCuisineChart();
            this.createPriceChart();
        } else {
            console.log("Loading data from server to create charts");
            // Data not loaded, need to load data first
            this.loadDataForCharts();
        }
    },

    // Setup proper chart containers for all charts
    setupChartContainers: function() {
        const chartIds = ['diversity-chart', 'borough-chart', 'cuisine-chart', 'price-chart'];
        
        chartIds.forEach(id => {
            const chartElement = document.getElementById(id);
            if (chartElement) {
                const parentElement = chartElement.parentElement;
                
                // Check if parent is not already a chart-container
                if (!parentElement.classList.contains('chart-container')) {
                    // Get the chart card (parent)
                    const chartCard = parentElement.closest('.chart-card');
                    
                    if (chartCard) {
                        // Create a new chart container
                        const container = document.createElement('div');
                        container.className = 'chart-container';
                        
                        // Move the canvas into the container
                        parentElement.insertBefore(container, chartElement);
                        container.appendChild(chartElement);
                    }
                }
            }
        });
    },

    // If data not loaded, load data for charts
    loadDataForCharts: function() {
        console.log("Starting to load data for charts...");
        
        Promise.all([
            fetch('data/stations.json').then(response => response.json()),
            fetch('data/restaurants.json').then(response => response.json()),
            fetch('data/subway_lines.json').then(response => response.json())
        ]).then(([stationsData, restaurantsData, subwayLinesData]) => {
            console.log("Data loaded successfully for charts");
            
            // Save to global namespace
            window.appData.stations = stationsData;
            window.appData.restaurants = restaurantsData;
            window.appData.subwayLines = subwayLinesData;
            
            // Create charts
            this.createDiversityChart();
            this.createBoroughChart();
            this.createCuisineChart();
            this.createPriceChart();
        }).catch(error => {
            console.error("Error loading chart data:", error);
            document.querySelector('.charts-container').innerHTML = 
                `<div style="padding: 20px; color: red; grid-column: span 2;">
                    Error loading chart data: ${error.message}<br>Please check the console for more information.
                </div>`;
        });
    },

    // TOP 10 station food diversity chart

    // Replace the createDiversityChart function with this updated version:
    createDiversityChart: function() {
        // Clear existing chart to avoid duplication
        if (this.diversityChart) {
            this.diversityChart.destroy();
        }
        
        // Get element and ensure it has appropriate container
        const chartElement = document.getElementById('diversity-chart');
        if (!chartElement) {
            console.error("Could not find diversity-chart element");
            return;
        }
        
        // Filter stations with restaurants
        const stationsWithRestaurants = window.appData.stations.filter(station => 
            station.foodMetrics && station.foodMetrics.restaurantCount > 0
        );
        
        // Sort by food diversity in descending order
        stationsWithRestaurants.sort((a, b) => 
            (b.foodMetrics.foodDiversity || 0) - (a.foodMetrics.foodDiversity || 0)
        );
        
        // Get top 10 stations
        const topDiversityStations = stationsWithRestaurants.slice(0, 10);
        
        // Prepare chart data
        const labels = topDiversityStations.map(station => station.name);
        const diversityData = topDiversityStations.map(station => {
            // Ensure the value is a number before calling toFixed
            const diversity = station.foodMetrics.foodDiversity;
            return diversity !== null && diversity !== undefined ? parseFloat(diversity).toFixed(2) : 0;
        });
        const restaurantData = topDiversityStations.map(station => 
            station.foodMetrics.restaurantCount || 0
        );
        
        // Create chart
        const ctx = chartElement.getContext('2d');
        
        this.diversityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Food Diversity Index',
                        data: diversityData,
                        backgroundColor: 'rgba(216, 17, 89, 0.6)',
                        borderColor: 'rgba(216, 17, 89, 1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Restaurant Number',
                        data: restaurantData,
                        backgroundColor: 'rgba(255, 159, 64, 0.6)',
                        borderColor: 'rgba(255, 159, 64, 1)',
                        borderWidth: 1,
                        type: 'line',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                // Ensure the value is a number before calling toFixed
                                const value = context.raw;
                                const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
                                return `${label}: ${formattedValue}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 10
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Food Diversity Index'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Restaurant Number'
                        }
                    }
                }
            }
        });
    },

    // Restaurant distribution by borough chart
    createBoroughChart: function() {
        // Clear existing chart to avoid duplication
        if (this.boroughChart) {
            this.boroughChart.destroy();
        }
        
        // Get element and ensure it has appropriate container
        const chartElement = document.getElementById('borough-chart');
        if (!chartElement) {
            console.error("Could not find borough-chart element");
            return;
        }
        
        // Count restaurants by borough
        const boroughCounts = {};
        
        // Count restaurant numbers for each borough
        window.appData.restaurants.forEach(restaurant => {
            const station = window.appData.stations.find(s => 
                restaurant.nearestStation && s.id === restaurant.nearestStation.id
            );
            
            if (station && station.borough) {
                if (!boroughCounts[station.borough]) {
                    boroughCounts[station.borough] = 0;
                }
                boroughCounts[station.borough]++;
            }
        });
        
        // Prepare chart data
        const labels = Object.keys(boroughCounts);
        const data = Object.values(boroughCounts);
        
        // Create chart
        const ctx = chartElement.getContext('2d');
        
        this.boroughChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [
                    {
                        data: data,
                        backgroundColor: [
                            'rgba(216, 17, 89, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(153, 102, 255, 0.6)'
                        ],
                        borderColor: [
                            'rgba(216, 17, 89, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)'
                        ],
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    // Add these properties to adjust the legend spacing
                    legend: {
                        position: 'right',
                        align: 'center',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 11
                            },
                            padding: 25  // Increase padding between legend items
                        },
                        // Add margin to create space between chart and legend
                        title: {
                            display: false,
                            padding: {
                                left: 25  // Add left padding to push legend away from chart
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    // Cuisine distribution chart
    createCuisineChart: function() {
        // Clear existing chart to avoid duplication
        if (this.cuisineChart) {
            this.cuisineChart.destroy();
        }
        
        // Get element and ensure it has appropriate container
        const chartElement = document.getElementById('cuisine-chart');
        if (!chartElement) {
            console.error("Could not find cuisine-chart element");
            return;
        }
        
        // Count restaurants by cuisine
        const cuisineCounts = {};
        
        window.appData.restaurants.forEach(restaurant => {
            if (restaurant.cuisine && restaurant.cuisine.type) {
                if (!cuisineCounts[restaurant.cuisine.type]) {
                    cuisineCounts[restaurant.cuisine.type] = 0;
                }
                cuisineCounts[restaurant.cuisine.type]++;
            }
        });
        
        // Sort by count and get the top 10 cuisines
        const sortedCuisines = Object.entries(cuisineCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        // Prepare chart data
        const labels = sortedCuisines.map(entry => entry[0]);
        const data = sortedCuisines.map(entry => entry[1]);
        
        // Create chart
        const ctx = chartElement.getContext('2d');
        
        this.cuisineChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Restaurant Number',
                        data: data,
                        backgroundColor: 'rgba(216, 17, 89, 0.6)',
                        borderColor: 'rgba(216, 17, 89, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 10
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Restaurant Number'
                        }
                    }
                }
            }
        });
    },

    // Price distribution chart
    createPriceChart: function() {
        // Clear existing chart to avoid duplication
        if (this.priceChart) {
            this.priceChart.destroy();
        }
        
        // Get element and ensure it has appropriate container
        const chartElement = document.getElementById('price-chart');
        if (!chartElement) {
            console.error("Could not find price-chart element");
            return;
        }
        
        // Count restaurants by price level
        const priceCounts = {
            '$': 0,
            '$$': 0,
            '$$$': 0,
            '$$$$': 0
        };
        
        window.appData.restaurants.forEach(restaurant => {
            if (restaurant.priceLevel) {
                switch(restaurant.priceLevel) {
                    case 1:
                        priceCounts['$']++;
                        break;
                    case 2:
                        priceCounts['$$']++;
                        break;
                    case 3:
                        priceCounts['$$$']++;
                        break;
                    case 4:
                        priceCounts['$$$$']++;
                        break;
                }
            }
        });
        
        // Prepare chart data
        const labels = [
            '$ (Inexpensive)',
            '$$ (Moderate)',
            '$$$ (Expensive)',
            '$$$$ (Very Expensive)'
        ];
        const data = Object.values(priceCounts);
        
        // Create chart
        const ctx = chartElement.getContext('2d');
        
        this.priceChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [
                    {
                        data: data,
                        backgroundColor: [
                            'rgba(76, 175, 80, 0.6)',
                            'rgba(255, 193, 7, 0.6)',
                            'rgba(255, 152, 0, 0.6)',
                            'rgba(244, 67, 54, 0.6)'
                        ],
                        borderColor: [
                            'rgba(76, 175, 80, 1)',
                            'rgba(255, 193, 7, 1)',
                            'rgba(255, 152, 0, 1)',
                            'rgba(244, 67, 54, 1)'
                        ],
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    // Add these properties to adjust the legend spacing
                    legend: {
                        position: 'right',
                        align: 'center',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 11
                            },
                            padding: 25  // Increase padding between legend items
                        },
                        // Add margin to create space between chart and legend
                        title: {
                            display: false,
                            padding: {
                                left: 25  // Add left padding to push legend away from chart
                            }
                        }
                    },

                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },
    
    // Update chart container height - prevent chart overlap
    resizeChartContainer: function() {
        // Get chart container
        const container = document.querySelector('.charts-container');
        if (!container) return;
        
        // Calculate appropriate height
        const containerWidth = container.clientWidth;
        const aspectRatio = 1.5; // Aspect ratio
        
        // Adjust height of each chart card based on layout
        const chartCards = document.querySelectorAll('.chart-card');
        const calculatedHeight = containerWidth / 2 / aspectRatio;
        
        chartCards.forEach(card => {
            card.style.height = `${calculatedHeight}px`;
        });
    }
};

// Page load complete, initialize charts when data analysis tab is clicked
document.addEventListener('DOMContentLoaded', function() {
    // Add click event for data analysis tab
    document.querySelector('.tab-button[data-tab="data"]').addEventListener('click', function() {
        // Delay execution to ensure container is displayed
        setTimeout(() => {
            // First adjust container size
            window.chartsModule.resizeChartContainer();
            
            // Initialize charts (if not already done)
            if (!window.chartsModule.diversityChart) {
                window.chartsModule.initCharts();
            }
        }, 100);
    });
    
    // Add window resize event - for responsive layout
    window.addEventListener('resize', function() {
        if (document.getElementById('data-tab').classList.contains('active')) {
            window.chartsModule.resizeChartContainer();
            
            // Only recreate charts if they are already initialized
            if (window.chartsModule.diversityChart) {
                window.chartsModule.createDiversityChart();
                window.chartsModule.createBoroughChart();
                window.chartsModule.createCuisineChart();
                window.chartsModule.createPriceChart();
            }
        }
    });
});