// Global variables for commuter view
let commuterMap = null;
let routePathLayer = null;
let subwayLayerGroup = null; // New layer for subway lines
let stationMarkers = [];
let restaurantMarkers = [];
let selectedRoute = null;

// Initialize commuter view
function initCommuterView() {
    // Create map instance if not already created
    if (!commuterMap) {
        commuterMap = L.map('commuter-map').setView([40.7128, -74.0060], 12);
        
        // Use Carto Light style basemap - matches the elegant style of the main map
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(commuterMap);
        
        // Create layer groups
        subwayLayerGroup = L.layerGroup().addTo(commuterMap); // Add subway layer first (bottom layer)
        routePathLayer = L.layerGroup().addTo(commuterMap);  // Add route layer on top
        
        // Initialize station selectors
        initCommuterStationSelectors();
        
        // Add find food button event
        document.getElementById('find-food-btn').addEventListener('click', findFoodOnRoute);
        
        // Draw subway lines
        drawSubwayLines();
    }
}

// Draw subway lines
function drawSubwayLines() {
    // Clear existing subway lines
    subwayLayerGroup.clearLayers();
    
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
                    // Use subway line colors with reduced opacity
                    return {
                        color: feature.properties.color || '#888',
                        weight: 1,
                        opacity: 0.3 // Reduce opacity to distinguish from routes
                    };
                }
            }).addTo(subwayLayerGroup);
            
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
                            weight: 1,
                            opacity: 0.5 // Reduce opacity to distinguish from routes
                        }).addTo(subwayLayerGroup);
                    }
                }
            });
            
            console.log("Drawing subway lines using subway_lines.json data complete");
        });
}

// Initialize station selectors
// Update this function in commuter.js
function initCommuterStationSelectors() {
    // Get stations with valid coordinates
    const validStations = window.appData.stations.filter(station => 
        station.coordinates && station.coordinates.latitude && station.coordinates.longitude
    );
    
    // Group stations by name
    const stationsByName = {};
    validStations.forEach(station => {
        if (!stationsByName[station.name]) {
            stationsByName[station.name] = station;
        } else {
            // If we already have a station with this name, keep the one with more routes or higher ridership
            const existingStation = stationsByName[station.name];
            const existingRouteCount = existingStation.routes ? existingStation.routes.length : 0;
            const newRouteCount = station.routes ? station.routes.length : 0;
            
            if (newRouteCount > existingRouteCount || 
                (newRouteCount === existingRouteCount && station.ridership > existingStation.ridership)) {
                stationsByName[station.name] = station;
            }
        }
    });
    
    // Convert back to array and sort by name
    const uniqueStations = Object.values(stationsByName);
    uniqueStations.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    });
    
    // Get selector elements
    const startSelector = document.getElementById('start-station');
    const endSelector = document.getElementById('end-station');
    
    // Clear existing options
    startSelector.innerHTML = '<option value="">-- Select Departure --</option>';
    endSelector.innerHTML = '<option value="">-- Select Destination --</option>';
    
    // Add station options
    uniqueStations.forEach(station => {
        const startOption = document.createElement('option');
        startOption.value = station.id;
        startOption.textContent = station.name;
        startSelector.appendChild(startOption);
        
        const endOption = document.createElement('option');
        endOption.value = station.id;
        endOption.textContent = station.name;
        endSelector.appendChild(endOption);
    });
}

// Find food along route
function findFoodOnRoute() {
    // Get selected station IDs
    const startStationId = document.getElementById('start-station').value;
    const endStationId = document.getElementById('end-station').value;
    
    if (!startStationId || !endStationId) {
        alert('Please select both departure and destination stations');
        return;
    }
    
    if (startStationId === endStationId) {
        alert('Departure and destination stations cannot be the same');
        return;
    }
    
    // Find stations
    const startStation = window.appData.stations.find(s => s.id.toString() === startStationId);
    const endStation = window.appData.stations.find(s => s.id.toString() === endStationId);
    
    if (!startStation || !endStation) {
        alert('Cannot find selected station data');
        return;
    }
    
    // Find route
    const route = findRoute(startStation, endStation);
    
    if (!route || route.length < 2) {
        alert('Cannot find a route between the selected stations');
        return;
    }
    
    // Save current route
    selectedRoute = route;
    
    // Show route on map
    showRouteOnMap(route);
    
    // Find food recommendations along the route
    findFoodRecommendations(route);
}

// Improved route finding algorithm - along subway lines
function findRoute(startStation, endStation) {
    console.log("Finding route between", startStation.name, "and", endStation.name);
    
    // If two stations are on the same line, find all intermediate stations along that line
    const commonLines = findCommonLines(startStation, endStation);
    
    if (commonLines.length > 0) {
        // Use the first common line
        const line = commonLines[0];
        console.log("Found common line:", line);
        
        // Find all stations on this line
        const lineStations = window.appData.stations.filter(station => 
            station.routes && 
            Array.isArray(station.routes) && 
            station.routes.includes(line) &&
            station.coordinates && 
            station.coordinates.latitude && 
            station.coordinates.longitude
        );
        
        // Only continue when there are enough stations
        if (lineStations.length >= 2) {
            // Sort stations by geographic location (enhanced algorithm)
            // First sort by approximate direction (east-west or north-south)
            const longitudeDiff = Math.abs(startStation.coordinates.longitude - endStation.coordinates.longitude);
            const latitudeDiff = Math.abs(startStation.coordinates.latitude - endStation.coordinates.latitude);
            
            // Determine if it's an east-west or north-south direction
            const isEastWestLine = longitudeDiff > latitudeDiff;
            
            // Sort based on direction
            if (isEastWestLine) {
                // East-west direction line
                lineStations.sort((a, b) => a.coordinates.longitude - b.coordinates.longitude);
            } else {
                // North-south direction line
                lineStations.sort((a, b) => a.coordinates.latitude - b.coordinates.latitude);
            }
            
            // Find indices of start and end stations
            const startIndex = lineStations.findIndex(s => s.id === startStation.id);
            const endIndex = lineStations.findIndex(s => s.id === endStation.id);
            
            if (startIndex !== -1 && endIndex !== -1) {
                // Determine travel direction
                if (startIndex < endIndex) {
                    // Move forward through the array
                    return lineStations.slice(startIndex, endIndex + 1);
                } else {
                    // Move backward through the array
                    return lineStations.slice(endIndex, startIndex + 1).reverse();
                }
            }
        }
    }
    
    // If stations are not on the same line, try to find one or more transfer routes
    console.log("No common lines, attempting to find transfer route");
    
    // Find possible transfer stations
    const transferStations = findTransferStations(startStation, endStation);
    
    if (transferStations.length > 0) {
        // Use the first transfer station
        const transferStation = transferStations[0];
        console.log("Using transfer station:", transferStation.name);
        
        // Create a route with transfer
        const route1 = findDirectRoute(startStation, transferStation);
        const route2 = findDirectRoute(transferStation, endStation);
        
        // Combine routes (remove duplicate transfer station)
        if (route1.length > 0 && route2.length > 1) {
            return [...route1, ...route2.slice(1)];
        }
    }
    
    // If all methods fail, return direct line route
    console.log("Falling back to direct route");
    return findDirectRoute(startStation, endStation);
}

// Find direct line route between two stations
function findDirectRoute(startStation, endStation) {
    // Find all possible stations on the direct path
    const directLineStations = [];
    
    // Add start and end points to the route
    directLineStations.push(startStation);
    
    // Calculate distance between start and end points
    const distance = calculateDistance(
        startStation.coordinates.latitude, 
        startStation.coordinates.longitude,
        endStation.coordinates.latitude, 
        endStation.coordinates.longitude
    );
    
    // If the distance is far, try to find intermediate stations
    if (distance > 0.01) { // About 1 kilometer
        // Find possible intermediate stations
        const potentialMidpoints = window.appData.stations.filter(station => 
            station.id !== startStation.id && 
            station.id !== endStation.id &&
            station.coordinates && 
            station.coordinates.latitude && 
            station.coordinates.longitude &&
            isStationBetween(station, startStation, endStation)
        );
        
        // Sort stations by distance to the direct line
        potentialMidpoints.sort((a, b) => {
            const distA = distanceToLine(
                a.coordinates.latitude, 
                a.coordinates.longitude,
                startStation.coordinates.latitude, 
                startStation.coordinates.longitude,
                endStation.coordinates.latitude, 
                endStation.coordinates.longitude
            );
            const distB = distanceToLine(
                b.coordinates.latitude, 
                b.coordinates.longitude,
                startStation.coordinates.latitude, 
                startStation.coordinates.longitude,
                endStation.coordinates.latitude, 
                endStation.coordinates.longitude
            );
            return distA - distB;
        });
        
        // Add at most 5 intermediate stations
        for (let i = 0; i < Math.min(5, potentialMidpoints.length); i++) {
            directLineStations.push(potentialMidpoints[i]);
        }
    }
    
    // Add destination station
    directLineStations.push(endStation);
    
    // Sort by distance to starting point
    directLineStations.sort((a, b) => {
        const distA = calculateDistance(
            startStation.coordinates.latitude, 
            startStation.coordinates.longitude,
            a.coordinates.latitude, 
            a.coordinates.longitude
        );
        const distB = calculateDistance(
            startStation.coordinates.latitude, 
            startStation.coordinates.longitude,
            b.coordinates.latitude, 
            b.coordinates.longitude
        );
        return distA - distB;
    });
    
    return directLineStations;
}

// Determine if a station is on the path between start and end stations
function isStationBetween(station, startStation, endStation) {
    // Calculate distances to start and end points
    const distToStart = calculateDistance(
        station.coordinates.latitude, 
        station.coordinates.longitude,
        startStation.coordinates.latitude, 
        startStation.coordinates.longitude
    );
    
    const distToEnd = calculateDistance(
        station.coordinates.latitude, 
        station.coordinates.longitude,
        endStation.coordinates.latitude, 
        endStation.coordinates.longitude
    );
    
    // Calculate distance from start to end
    const startToEnd = calculateDistance(
        startStation.coordinates.latitude, 
        startStation.coordinates.longitude,
        endStation.coordinates.latitude, 
        endStation.coordinates.longitude
    );
    
    // If the sum of distances from the station to start and end is close to the distance from start to end, consider the station on the path
    // Add a small margin to accommodate errors
    return (distToStart + distToEnd) < (startToEnd * 1.3);
}

// Calculate distance from a point to a line
function distanceToLine(x, y, x1, y1, x2, y2) {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    
    if (len_sq != 0) {
        param = dot / len_sq;
    }
    
    let xx, yy;
    
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    
    const dx = x - xx;
    const dy = y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
}

// Calculate distance between two points (using Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius (kilometers)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Find common subway lines between two stations
function findCommonLines(station1, station2) {
    if (!station1.routes || !station2.routes || !Array.isArray(station1.routes) || !Array.isArray(station2.routes)) {
        return [];
    }
    
    // Find common lines
    return station1.routes.filter(route => station2.routes.includes(route));
}

// Find potential transfer stations
function findTransferStations(startStation, endStation) {
    // Get all potential transfer stations
    // These are stations that share a line with both start and end stations
    const transferStations = [];
    
    // Ensure routes arrays exist
    if (!startStation.routes || !Array.isArray(startStation.routes) || 
        !endStation.routes || !Array.isArray(endStation.routes)) {
        return transferStations;
    }
    
    // Check each station to see if it's a valid transfer station
    window.appData.stations.forEach(station => {
        if (!station.routes || !Array.isArray(station.routes) || 
            station.id === startStation.id || station.id === endStation.id) {
            return;
        }
        
        // Check if this station has a line in common with start station
        const sharesLineWithStart = station.routes.some(route => 
            startStation.routes.includes(route)
        );
        
        // Check if this station has a line in common with end station
        const sharesLineWithEnd = station.routes.some(route => 
            endStation.routes.includes(route)
        );
        
        // If it shares lines with both start and end, it's a transfer station
        if (sharesLineWithStart && sharesLineWithEnd) {
            transferStations.push(station);
        }
    });
    
    // Sort transfer stations by connection quality (number of lines)
    transferStations.sort((a, b) => (b.routes?.length || 0) - (a.routes?.length || 0));
    
    return transferStations;
}

// Show route on map
function showRouteOnMap(route) {
    // Clear existing route
    routePathLayer.clearLayers();
    
    // Clear station and restaurant markers
    stationMarkers.forEach(marker => marker.remove());
    restaurantMarkers.forEach(marker => marker.remove());
    stationMarkers = [];
    restaurantMarkers = [];
    
    // Create route coordinates
    const coordinates = route.map(station => [
        station.coordinates.latitude, 
        station.coordinates.longitude
    ]);
    
    // Create route line with appropriate subway line color
    let routeColor = '#d81159'; // Default color
    
    // Try to use the color of the common subway line if available
    if (route.length >= 2) {
        const startStation = route[0];
        const endStation = route[route.length - 1];
        const commonLines = findCommonLines(startStation, endStation);
        
        if (commonLines.length > 0) {
            // Find the subway line color
            const subwayLine = window.appData.subwayLines.find(line => line.id === commonLines[0]);
            if (subwayLine && subwayLine.color) {
                routeColor = subwayLine.color;
            }
        }
    }
    
    // Create a single, thick colored route line
    const routePath = L.polyline(coordinates, {
        color: routeColor,
        weight: 8,         // Much thicker line
        opacity: 1,        // Full opacity
        lineJoin: 'round', // Rounded corners
        lineCap: 'round',  // Rounded ends
        className: 'route-path' // Custom class for styling
    }).addTo(routePathLayer);
    
    // Add station markers
    route.forEach((station, index) => {
        // Use different icon styles for departure, destination, and transfer stations
        let iconColor, iconSize;
        
        if (index === 0) {
            // Departure station
            iconColor = '#4CAF50';
            iconSize = 15;
        } else if (index === route.length - 1) {
            // Destination station
            iconColor = '#F44336';
            iconSize = 15;
        } else {
            // Transfer station
            iconColor = '#FFC107';
            iconSize = 13.5;
        }
        
        // Create station icon
        const icon = L.divIcon({
            className: 'route-station-marker',
            html: `<div style="
                width: ${iconSize}px;
                height: ${iconSize}px;
                background-color: ${iconColor};
                border-radius: 50%;
                border: 2.5px solid white;
                box-shadow: 0 0 3px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [iconSize, iconSize],
            iconAnchor: [iconSize/2, iconSize/2]
        });
        
        // Create marker
        const marker = L.marker([station.coordinates.latitude, station.coordinates.longitude], {
            icon: icon,
            zIndexOffset: 1000 // Ensure stations appear on top
        }).addTo(routePathLayer);
        
        // Ensure route information is correctly displayed
        let routesDisplay = 'None';
        if (station.routes && Array.isArray(station.routes) && station.routes.length > 0) {
            routesDisplay = station.routes.join(', ');
        }
        
        // Add hover info
        marker.bindTooltip(`
            ${station.name}<br>
            ${index === 0 ? '(Departure)' : index === route.length - 1 ? '(Destination)' : '(Transfer)'}
            ${routesDisplay ? '<br>Lines: ' + routesDisplay : ''}
            ${station.ridership ? '<br>Ridership: ' + formatNumber(station.ridership) : ''}
        `);
        
        stationMarkers.push(marker);
    });
    
    // Adjust map view to show entire route
    commuterMap.fitBounds(routePath.getBounds(), {
        padding: [50, 50]
    });
}

// Find food recommendations along the route
function findFoodRecommendations(route) {
    // Clear existing recommendation list
    const foodList = document.getElementById('food-list');
    foodList.innerHTML = '';
    
    // Create recommendations
    const recommendations = [];
    
    // For each station on the route
    route.forEach(station => {
        // Find restaurants near this station
        const stationRestaurants = window.appData.restaurants.filter(restaurant => 
            restaurant.nearestStation && restaurant.nearestStation.id === station.id
        );
        
        // If station has restaurants
        if (stationRestaurants.length > 0) {
            // Sort by rating
            stationRestaurants.sort((a, b) => 
                (b.rating?.value || 0) - (a.rating?.value || 0)
            );
            
            // Get top 3 restaurants
            const topRestaurants = stationRestaurants.slice(0, 3);
            
            // Add to recommendations
            topRestaurants.forEach(restaurant => {
                recommendations.push({
                    restaurant: restaurant,
                    station: station
                });
            });
        }
    });
    
    // If no recommendations found
    if (recommendations.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'empty-message';
        emptyMsg.textContent = 'No restaurant recommendations found along this route';
        foodList.appendChild(emptyMsg);
        return;
    }
    
    // Sort by value (rating/price) and diversity
    recommendations.sort((a, b) => {
        // Calculate value index
        const valueA = (a.restaurant.rating?.value || 0) / (a.restaurant.priceLevel || 1);
        const valueB = (b.restaurant.rating?.value || 0) / (b.restaurant.priceLevel || 1);
        
        // Prioritize high value
        if (valueB - valueA > 0.5) return 1;
        if (valueA - valueB > 0.5) return -1;
        
        // Then consider food diversity
        return (b.station.foodMetrics?.foodDiversity || 0) - (a.station.foodMetrics?.foodDiversity || 0);
    });
    
    // Add recommendations to list
    recommendations.slice(0, 5).forEach(rec => {
        const restaurant = rec.restaurant;
        const station = rec.station;
        
        // Create recommendation item
        const item = document.createElement('div');
        item.className = 'food-item';
        
        item.innerHTML = `
            <h4>${restaurant.name}</h4>
            <div class="food-details">
                <p><strong>Station:</strong> ${station.name}</p>
                <p><strong>Cuisine:</strong> ${restaurant.cuisine?.type || 'Unknown'}</p>
                <p><strong>Price:</strong> ${getPriceSymbols(restaurant.priceLevel)}</p>
                <p><strong>Rating:</strong> ${restaurant.rating?.value || 'N/A'} (${restaurant.rating?.user_count || 0} reviews)</p>
                <p><strong>Distance from station:</strong> ${restaurant.nearestStation ? restaurant.nearestStation.distance  : 'Unknown'}</p>
            </div>
        `;
        
        // Add click event
        item.addEventListener('click', () => {
            // Show restaurant on map
            showRestaurantOnMap(restaurant, station);
        });
        
        foodList.appendChild(item);
    });
}

// Show restaurant on map
function showRestaurantOnMap(restaurant, station) {
    // Clear existing restaurant markers
    restaurantMarkers.forEach(marker => marker.remove());
    restaurantMarkers = [];
    
    // Create restaurant icon - using the same restaurant marker style as the main map
    const icon = L.divIcon({
        className: 'recommended-restaurant-marker',
        html: `<div style="
            width: 8px;
            height: 8px;
            background-color: ${getRestaurantColor(restaurant)};
            border-radius: 50%;
            opacity: 0.9;
        "></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4]
    });
    
    // Create marker
    const marker = L.marker([restaurant.coordinates.latitude, restaurant.coordinates.longitude], {
        icon: icon
    }).addTo(routePathLayer);
    
    // Add popup
    marker.bindPopup(`
        <div class="restaurant-popup">
            <h3>${restaurant.name}</h3>
            <p><strong>Address:</strong> ${restaurant.address || 'Unknown'}</p>
            <p><strong>Cuisine:</strong> ${restaurant.cuisine?.type || 'Unknown'}</p>
            <p><strong>Price:</strong> ${getPriceSymbols(restaurant.priceLevel)}</p>
            <p><strong>Rating:</strong> ${restaurant.rating?.value || 'N/A'} (${restaurant.rating?.user_count || 0} reviews)</p>
            <p><strong>Distance from station:</strong> ${restaurant.nearestStation ? restaurant.nearestStation.distance : 'Unknown'}</p>
        </div>
    `).openPopup();
    
    restaurantMarkers.push(marker);
    
    // Center map on restaurant
    commuterMap.setView([restaurant.coordinates.latitude, restaurant.coordinates.longitude], 17);
}

// Get restaurant color (based on cuisine) - consistent with the main map
function getRestaurantColor(restaurant) {
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
}

// Get price symbols
function getPriceSymbols(priceLevel) {
    if (!priceLevel) return 'Unknown';
    
    switch(priceLevel) {
        case 1: return '$';
        case 2: return '$$';
        case 3: return '$$$';
        case 4: return '$$$$';
        default: return 'Unknown';
    }
}

// Format number with commas
function formatNumber(num) {
    if (num === null || num === undefined) return 'Unknown';
    
    return new Intl.NumberFormat().format(Math.round(num));
}

// Page load complete, add event listener for commuter tab
document.addEventListener('DOMContentLoaded', function() {
    // Add click event for commuter tab
    document.querySelector('.tab-button[data-tab="commuter"]').addEventListener('click', function() {
        // Initialize commuter view if not already done
        if (!commuterMap) {
            initCommuterView();
        } else {
            // If already initialized, just resize the map
            commuterMap.invalidateSize();
        }
    });
});