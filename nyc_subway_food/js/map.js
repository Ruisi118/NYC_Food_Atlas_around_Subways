// Create global namespace
if (!window.appData) {
    window.appData = {
        stations: [],
        restaurants: [],
        subwayLines: []
    };
}

// Map module namespace
window.mapModule = {
    // Map-related variables
    map: null,
    stationMarkers: [],
    restaurantMarkers: [],
    subwayLayerGroup: null,
    stationsLayerGroup: null,
    restaurantsLayerGroup: null,
    selectedStation: null,

    // Initialize map
    initMap: function() {
        console.log("Initializing map...");
        
        // Create map instance, set center point to New York Manhattan
        this.map = L.map('map-container').setView([40.7128, -74.0060], 12);
        
        // Add Carto Light style basemap - elegant style
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);
        
        // Create layer groups
        this.subwayLayerGroup = L.layerGroup().addTo(this.map);
        this.stationsLayerGroup = L.layerGroup().addTo(this.map);
        this.restaurantsLayerGroup = L.layerGroup().addTo(this.map);
        
        console.log("Map initialization complete");
        
        // Load data
        this.loadData();
    },

    // Load data
    loadData: function() {
        console.log("Starting to load data...");
        
        Promise.all([
            fetch('data/stations.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`stations.json request failed: ${response.status}`);
                    }
                    console.log("stations.json retrieved successfully");
                    return response.json();
                }),
            fetch('data/restaurants.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`restaurants.json request failed: ${response.status}`);
                    }
                    console.log("restaurants.json retrieved successfully");
                    return response.json();
                }),
            fetch('data/subway_lines.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`subway_lines.json request failed: ${response.status}`);
                    }
                    console.log("subway_lines.json retrieved successfully");
                    return response.json();
                })
        ]).then(([stationsData, restaurantsData, subwayLinesData]) => {
            console.log("All data loaded successfully", {
                stations: stationsData.length,
                restaurants: restaurantsData.length,
                lines: subwayLinesData.length
            });
            
            // Save to global namespace
            window.appData.stations = stationsData;
            window.appData.restaurants = restaurantsData;
            window.appData.subwayLines = subwayLinesData;
            
            // Ensure all stations have route data
            window.appData.stations.forEach(station => {
                if (!station.routes || !Array.isArray(station.routes) || station.routes.length === 0) {
                    station.routes = [];
                }
            });
            
            // Initialize filter options
            this.initFilters();
            
            // Draw subway lines
            this.drawSubwayLines();
            
            // Draw subway stations
            this.drawStations();
            
            // Add interactive event listeners
            this.addEventListeners();
        }).catch(error => {
            console.error('Error loading data:', error);
            // Display error message to user
            document.getElementById('map-container').innerHTML = 
                `<div style="padding: 20px; color: red;">Error loading map data: ${error.message}<br>Please check the console for more information.</div>`;
        });
    },

    // Initialize filter options
    initFilters: function() {
        // Subway line filter
        const lineFilter = document.getElementById('subway-line-filter');
        if (!lineFilter) {
            console.error("Could not find subway line filter element");
            return;
        }
        
        // Get all unique lines
        const uniqueLines = new Set();
        window.appData.stations.forEach(station => {
            if (station.routes && Array.isArray(station.routes)) {
                station.routes.forEach(route => {
                    if (route && route.trim() !== '') {
                        uniqueLines.add(route.trim());
                    }
                });
            }
        });
        
        // Sort lines alphabetically
        const sortedLines = [...uniqueLines].sort();
        
        // Clear existing options (avoid duplicates)
        lineFilter.innerHTML = '<option value="all">All Lines</option>';
        
        // Add line options
        sortedLines.forEach(line => {
            const option = document.createElement('option');
            option.value = line;
            option.textContent = `Line ${line}`;
            lineFilter.appendChild(option);
        });
        
        // Cuisine filter
        const cuisineFilter = document.getElementById('cuisine-filter');
        if (!cuisineFilter) {
            console.error("Could not find cuisine filter element");
            return;
        }
        
        // Get all unique cuisines
        const cuisines = new Set();
        window.appData.restaurants.forEach(restaurant => {
            if (restaurant.cuisine && restaurant.cuisine.type) {
                cuisines.add(restaurant.cuisine.type);
            }
        });
        
        // Sort cuisines alphabetically
        const sortedCuisines = [...cuisines].sort();
        
        // Clear existing options (avoid duplicates)
        cuisineFilter.innerHTML = '<option value="all">All Types</option>';
        
        // Add cuisine options
        sortedCuisines.forEach(cuisine => {
            const option = document.createElement('option');
            option.value = cuisine;
            option.textContent = cuisine;
            cuisineFilter.appendChild(option);
        });
    },

    // Draw subway lines
    drawSubwayLines: function() {
        // Clear existing subway lines
        this.subwayLayerGroup.clearLayers();
        
        console.log("Starting to draw subway lines...");
        
        // Use Leaflet's GeoJSON support to directly load GeoJSON data
        fetch('data/subway_lines.geojson')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`subway_lines.geojson request failed: ${response.status}`);
                }
                return response.json();
            })
            .then(geojsonData => {
                // Create subway line layer
                L.geoJSON(geojsonData, {
                    style: function(feature) {
                        // Use subway line color
                        return {
                            color: feature.properties.color || '#888',
                            weight: 1.5,
                            opacity: 0.8
                        };
                    },
                    onEachFeature: function(feature, layer) {
                        // Add hover information
                        if (feature.properties && feature.properties.line_name) {
                            layer.bindTooltip(feature.properties.line_name);
                        }
                    }
                }).addTo(this.subwayLayerGroup);
                
                console.log("Subway lines drawing complete");
            })
            .catch(error => {
                console.error('Error loading subway line data:', error);
                
                // If GeoJSON loading fails, try using existing subway_lines.json data
                console.log("Attempting to draw subway lines using subway_lines.json data...");
                
                // Process each subway line
                window.appData.subwayLines.forEach(line => {
                    // If coordinates exist and are not empty, use them directly
                    if (line.coordinates && line.coordinates.length > 0) {
                        const lineCoordinates = line.coordinates.map(coord => [coord.lat, coord.lng]);
                        
                        // Only draw lines when there are enough coordinate points
                        if (lineCoordinates.length >= 2) {
                            // Create line
                            const polyline = L.polyline(lineCoordinates, {
                                color: line.color || '#888',
                                weight: 4,
                                opacity: 0.8
                            }).addTo(this.subwayLayerGroup);
                            
                            // Add hover information
                            polyline.bindTooltip(`Line ${line.id}`);
                        }
                    }
                });
                
                console.log("Drawing subway lines using subway_lines.json data complete");
            });
    },

    // Draw subway stations
    drawStations: function() {
        // Clear existing station markers
        this.stationsLayerGroup.clearLayers();
        this.stationMarkers = [];
        
        console.log("Starting to draw stations, total:", window.appData.stations.length);
        
        // Get current filter condition
        const selectedLine = document.getElementById('subway-line-filter')?.value || 'all';
        
        // Filter stations
        let filteredStations = window.appData.stations;
        
        if (selectedLine !== 'all') {
            filteredStations = window.appData.stations.filter(station => 
                station.routes && Array.isArray(station.routes) && station.routes.includes(selectedLine)
            );
        }
        
        console.log(`Filtered stations count: ${filteredStations.length}, filter condition: ${selectedLine}`);
        
        // Draw each station
        let drawnCount = 0;
        filteredStations.forEach(station => {
            if (station.coordinates && station.coordinates.latitude && station.coordinates.longitude) {
                // Determine station icon style - improve station visibility, more clearly reflect passenger volume
                const size = this.getStationSize(station);
                const icon = L.divIcon({
                    className: 'station-marker',
                    html: `<div class="station-icon" style="
                        width: ${size}px;
                        height: ${size}px;
                        background-color: ${this.getStationColor(station)};
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 0 2px rgba(0,0,0,0.3);
                    "></div>`,
                    iconSize: [size, size],
                    iconAnchor: [size/2, size/2]
                });
                
                // Create station marker
                const marker = L.marker([station.coordinates.latitude, station.coordinates.longitude], {
                    icon: icon,
                    stationId: station.id
                }).addTo(this.stationsLayerGroup);
                
                // Add hover information
                const routesInfo = station.routes && station.routes.length > 0 ? 
                    `Lines: ${station.routes.join(', ')}` : 'No line information';
                marker.bindTooltip(`${station.name}<br>${routesInfo}<br>Restaurants: ${station.foodMetrics.restaurantCount}<br>Ridership: ${this.formatNumber(station.ridership)}`);
                
                // Add click event
                marker.on('click', () => {
                    this.showStationInfo(station);
                    this.showRestaurantsForStation(station);
                });
                
                this.stationMarkers.push(marker);
                drawnCount++;
            }
        });
        
        console.log("Successfully drawn station count:", drawnCount);
    },

    // Get station size (based on ridership) - improved calculation method to make ridership differences more visible
    getStationSize: function(station) {
        const ridership = station.ridership || 0;
        
        // Base size
        let size = 5; // Minimum station size
        
        // Increase size based on ridership (using logarithmic scaling to make differences more visible)
        if (ridership > 0) {
            // Use logarithmic proportion, but multiply by a larger coefficient to make differences obvious
            size += Math.min(15, Math.log10(ridership + 1) * 2.5);
        }
        
        // Return size with range limits
        return Math.max(5, Math.min(20, size));
    },

    // Get station color (based on food diversity)
    getStationColor: function(station) {
        // Stations without restaurants use default color
        if (!station.foodMetrics.restaurantCount) {
            return '#999999';
        }
        
        const diversity = station.foodMetrics.foodDiversity || 0;
        
        // Determine color based on diversity value
        if (diversity > 1.6) {
            return '#f50c61'; // High diversity: theme color
        } else if (diversity > 1.0) {
            return '#fc6fa2'; // Medium diversity: lighter shade
        } else {
            return '#fcb6cf'; // Low diversity: orange
        }
    },

    // Show station information
    showStationInfo: function(station) {
        this.selectedStation = station;
        
        // Update station information panel
        const infoPanel = document.getElementById('station-info-content');
        if (!infoPanel) {
            console.error("Could not find station info content element");
            return;
        }
        
        // Ensure route information is correctly displayed
        let routesDisplay = 'None';
        if (station.routes && Array.isArray(station.routes) && station.routes.length > 0) {
            routesDisplay = station.routes.join(', ');
        }
        
        // Create information content
        let infoContent = `
            <h3>${station.name}</h3>
            <div class="station-details">
                <p><strong>Borough:</strong> ${station.borough || 'Unknown'}</p>
                <p><strong>Routes:</strong> ${routesDisplay}</p>
                <p><strong>Daily Ridership:</strong> ${this.formatNumber(station.ridership)}</p>
                <hr>
                <p><strong>Nearby Restaurants:</strong> ${station.foodMetrics.restaurantCount}</p>
                <p><strong>Food Diversity Index:</strong> ${station.foodMetrics.foodDiversity ? station.foodMetrics.foodDiversity.toFixed(2) : 'N/A'}</p>
                <p><strong>Dominant Cuisine:</strong> ${station.foodMetrics.dominantFood || 'None'}</p>
                <p><strong>Average Rating:</strong> ${station.foodMetrics.avgRating ? station.foodMetrics.avgRating.toFixed(1) : 'N/A'}</p>
                
                <h4>Price Distribution</h4>
                <div class="price-distribution">
                    <div class="price-bar">
                        <div class="price-segment" style="width:${station.foodMetrics.priceDistribution.level1 * 100}%; background-color:#8bc34a;" title="$: ${(station.foodMetrics.priceDistribution.level1 * 100).toFixed(0)}%"></div>
                        <div class="price-segment" style="width:${station.foodMetrics.priceDistribution.level2 * 100}%; background-color:#ffc107;" title="$$: ${(station.foodMetrics.priceDistribution.level2 * 100).toFixed(0)}%"></div>
                        <div class="price-segment" style="width:${station.foodMetrics.priceDistribution.level3 * 100}%; background-color:#ff9800;" title="$$$: ${(station.foodMetrics.priceDistribution.level3 * 100).toFixed(0)}%"></div>
                        <div class="price-segment" style="width:${station.foodMetrics.priceDistribution.level4 * 100}%; background-color:#f44336;" title="$$$$: ${(station.foodMetrics.priceDistribution.level4 * 100).toFixed(0)}%"></div>
                    </div>
                    <div class="price-legend">
                        <span>$ </span>
                        <span>$$ </span>
                        <span>$$$ </span>
                        <span>$$$$ </span>
                    </div>
                </div>
            </div>
        `;
        
        // Update information panel content
        infoPanel.innerHTML = infoContent;
    },

    // Show restaurants around the station
    showRestaurantsForStation: function(station) {
        // Clear existing restaurant markers
        this.restaurantsLayerGroup.clearLayers();
        this.restaurantMarkers = [];
        
        // Get current filter conditions
        const selectedCuisine = document.getElementById('cuisine-filter')?.value || 'all';
        const selectedPrice = document.querySelector('.price-button.active')?.dataset.price || 'all';
        
        console.log(`Filter conditions: cuisine=${selectedCuisine}, price=${selectedPrice}`);
        
        // Find restaurants related to this station
        let filteredRestaurants = window.appData.restaurants.filter(restaurant => {
            // Check if restaurant belongs to this station
            if (restaurant.nearestStation && restaurant.nearestStation.id === station.id) {
                // Apply cuisine filter
                if (selectedCuisine !== 'all' && (!restaurant.cuisine || restaurant.cuisine.type !== selectedCuisine)) {
                    return false;
                }
                
                // Apply price filter - fix price comparison logic
                if (selectedPrice !== 'all') {
                    const priceLevel = parseInt(selectedPrice);
                    if (restaurant.priceLevel !== priceLevel) {
                        return false;
                    }
                }
                
                return true;
            }
            return false;
        });
        
        console.log(`Found restaurants matching criteria: ${filteredRestaurants.length}`);
        
        // Draw each restaurant - modify restaurant marker style
        filteredRestaurants.forEach(restaurant => {
            if (restaurant.coordinates && restaurant.coordinates.latitude && restaurant.coordinates.longitude) {
                // Update restaurant icon style - small borderless dots
                const icon = L.divIcon({
                    className: 'restaurant-marker',
                    html: `<div class="restaurant-icon" style="
                        width: 10px;
                        height: 10px;
                        background-color: ${this.getRestaurantColor(restaurant)};
                        border-radius: 50%;
                        opacity: 0.8;
                    "></div>`,
                    iconSize: [10, 10],
                    iconAnchor: [4, 4]
                });
                
                // Create restaurant marker
                const marker = L.marker([restaurant.coordinates.latitude, restaurant.coordinates.longitude], {
                    icon: icon,
                    restaurantId: restaurant.id
                }).addTo(this.restaurantsLayerGroup);
                
                // Add hover information
                marker.bindTooltip(`
                    ${restaurant.name}<br>
                    Cuisine: ${restaurant.cuisine?.type || 'Unknown'}<br>
                    Price: ${this.getPriceSymbols(restaurant.priceLevel)}<br>
                    Rating: ${restaurant.rating?.value || 'N/A'} (${restaurant.rating?.user_count || 0} reviews)
                `);
                
                // Add click event
                marker.on('click', () => {
                    this.showRestaurantInfo(restaurant);
                });
                
                this.restaurantMarkers.push(marker);
            }
        });
        
        // If restaurants are found, center the map on the station location
        if (filteredRestaurants.length > 0 && station.coordinates) {
            this.map.setView([station.coordinates.latitude, station.coordinates.longitude], 16);
        }
    },

    // Get restaurant color (based on cuisine)
    getRestaurantColor: function(restaurant) {
        if (!restaurant.cuisine || !restaurant.cuisine.type) {
            return '#999999'; // Default color
        }
        
        // Set color based on cuisine type
        const cuisineType = restaurant.cuisine.type.toLowerCase();
        
        if (cuisineType.includes('chinese')) {
            return '#e53935'; // Red
        } else if (cuisineType.includes('italian')) {
            return '#43a047'; // Green
        } else if (cuisineType.includes('japanese')) {
            return '#1e88e5'; // Blue
        } else if (cuisineType.includes('mexican')) {
            return '#ff9800'; // Orange
        } else if (cuisineType.includes('thai')) {
            return '#9c27b0'; // Purple
        } else if (cuisineType.includes('indian')) {
            return '#ffc107'; // Yellow
        } else if (cuisineType.includes('french')) {
            return '#3f51b5'; // Indigo
        } else if (cuisineType.includes('mediterranean')) {
            return '#009688'; // Teal
        } else if (cuisineType.includes('american')) {
            return '#795548'; // Brown
        } else if (cuisineType.includes('seafood')) {
            return '#00BCD4'; // Cyan
        } else if (cuisineType.includes('asian')) {
            return '#D500F9'; // Purple
        } else {
            return '#607d8b'; // Blue-gray
        }
    },

    // Get price symbols
    getPriceSymbols: function(priceLevel) {
        if (!priceLevel) return 'Unknown';
        
        switch(priceLevel) {
            case 1: return '$';
            case 2: return '$$';
            case 3: return '$$$';
            case 4: return '$$$$';
            default: return 'Unknown';
        }
    },

    // Show restaurant information
    showRestaurantInfo: function(restaurant) {
        // Create a popup window
        const popupContent = `
            <div class="restaurant-popup">
                <h3>${restaurant.name}</h3>
                <p><strong>Address:</strong> ${restaurant.address || 'Unknown'}</p>
                <p><strong>Cuisine:</strong> ${restaurant.cuisine?.type || 'Unknown'}</p>
                <p><strong>Price:</strong> ${this.getPriceSymbols(restaurant.priceLevel)}</p>
                <p><strong>Rating:</strong> ${restaurant.rating?.value || 'N/A'} (${restaurant.rating?.user_count || 0} reviews)</p>
                <p><strong>Distance to Station:</strong> ${restaurant.nearestStation ? restaurant.nearestStation.distance : 'Unknown'}</p>
            </div>
        `;
        
        // Add popup to restaurant marker
        L.popup()
            .setLatLng([restaurant.coordinates.latitude, restaurant.coordinates.longitude])
            .setContent(popupContent)
            .openOn(this.map);
    },

    // Add event listeners
    addEventListeners: function() {
        // Subway line filter
        const lineFilter = document.getElementById('subway-line-filter');
        if (lineFilter) {
            lineFilter.addEventListener('change', () => {
                this.drawStations();
                if (this.selectedStation) {
                    this.showRestaurantsForStation(this.selectedStation);
                }
            });
        }
        
        // Cuisine filter
        const cuisineFilter = document.getElementById('cuisine-filter');
        if (cuisineFilter) {
            cuisineFilter.addEventListener('change', () => {
                if (this.selectedStation) {
                    this.showRestaurantsForStation(this.selectedStation);
                }
            });
        }
        
        // Price filter
        document.querySelectorAll('.price-button').forEach(button => {
            button.addEventListener('click', function() {
                // Update active button state
                document.querySelectorAll('.price-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                this.classList.add('active');
                
                // Update restaurant display
                if (window.mapModule.selectedStation) {
                    window.mapModule.showRestaurantsForStation(window.mapModule.selectedStation);
                }
            });
        });
        
        // Diversity ranking button
        const diversityBtn = document.getElementById('diversity-rank-btn');
        if (diversityBtn) {
            diversityBtn.addEventListener('click', () => {
                this.showHighDiversityStations();
            });
        }
    },

    // Show stations with highest food diversity
    showHighDiversityStations: function() {
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
        
        // Create a popup window to display rankings
        let popupContent = `
            <div class="diversity-popup">
                <h3>Most Diverse Food Stations</h3>
                <table class="diversity-table">
                    <tr>
                        <th>Rank</th>
                        <th>Station</th>
                        <th>Diversity Index</th>
                        <th>Restaurant Count</th>
                    </tr>
        `;
        
        // Add information for each station
        topDiversityStations.forEach((station, index) => {
            popupContent += `
                <tr class="station-row" data-station-id="${station.id}">
                    <td>${index + 1}</td>
                    <td>${station.name}</td>
                    <td>${station.foodMetrics.foodDiversity.toFixed(2)}</td>
                    <td>${station.foodMetrics.restaurantCount}</td>
                </tr>
            `;
        });
        
        popupContent += `
                </table>
                <p class="popup-note">Click on a station for details</p>
            </div>
        `;
        
        // Create custom popup window
        const customPopup = L.popup({
            className: 'diversity-rankings-popup',
            maxWidth: 400
        })
        .setLatLng(this.map.getCenter())
        .setContent(popupContent)
        .openOn(this.map);
        
        // Add click events
        setTimeout(() => {
            document.querySelectorAll('.station-row').forEach(row => {
                row.addEventListener('click', () => {
                    const stationId = parseInt(row.dataset.stationId);
                    const station = window.appData.stations.find(s => s.id === stationId);
                    
                    if (station) {
                        // Close popup window
                        this.map.closePopup();
                        
                        // Show station information
                        this.showStationInfo(station);
                        this.showRestaurantsForStation(station);
                        
                        // Move map to station location
                        if (station.coordinates) {
                            this.map.setView([station.coordinates.latitude, station.coordinates.longitude], 16);
                        }
                    }
                });
            });
        }, 100);
    },

    // Utility function: format number
    formatNumber: function(num) {
        if (num === null || num === undefined) return 'Unknown';
        
        return new Intl.NumberFormat().format(Math.round(num));
    }
};

// Initialize map after page load is complete
document.addEventListener('DOMContentLoaded', function() {
    window.mapModule.initMap();
});