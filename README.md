#  New York Food Atlas around Subways
CS-GY 6313 / CUSP-GX 6006: Data Visualization Final Project


## Project Overview

The New York Food Atlas around Subways is an interactive web application that visualizes the relationship between NYC subway stations and their surrounding food environments. This project explores how transportation infrastructure shapes the urban food landscape by examining patterns of restaurant distribution, cuisine diversity, and price accessibility around subway stations.

![Project Screenshot](images/project-screenshot.png)

## Features

- **Interactive Map View**: Explore subway stations and nearby restaurants on an interactive map, with stations sized by ridership and restaurants color-coded by cuisine type.
- **Data Analysis View**: Visualize data insights through charts showing food diversity rankings, cuisine distributions, borough analysis, and price distributions.
- **Commuter Food Planning**: Plan your commute with food recommendations along your subway route, helping you find the best dining options during your journey.
- **Filtering Capabilities**: Filter displays by subway line, cuisine type, and price range to customize your exploration.
- **Food Diversity Rankings**: Discover which subway stations offer the highest diversity of food options through rankings and comparative analysis.

## Technical Architecture

### Core Components
- **HTML/CSS/JavaScript**: Front-end interface with responsive design
- **Leaflet.js**: Interactive mapping functionality
- **Chart.js**: Data visualization for analytics view
- **JavaScript Modules**: Organized into map, charts, and commuter components

### Data Sources
- Subway station data (locations, ridership, routes)
- Restaurant data (locations, ratings, prices, cuisine types)
- Subway line geospatial data

## Usage Guide

### Map View
- Click on any subway station to view detailed information about the station and its nearby restaurants
- Use the sidebar filters to refine restaurants by subway line, cuisine type, or price range
- Click the "Show the Most Diverse Station" button to see diversity rankings

### Data Analysis View
- Explore charts showing restaurant diversity, borough distribution, cuisine types, and price levels
- Hover over chart elements for detailed information

### Commuter View
- Select departure and destination stations to plan your route
- View recommended restaurants along your commute path
- Click on restaurant markers or list items to see more details

## Project Structure

```
├── index.html                # Main HTML file
├── css/
│   └── styles.css            # CSS styles
├── js/
│   ├── main.js               # Main application logic
│   ├── map.js                # Map view functionality
│   ├── charts.js             # Data visualization charts
│   └── commuter.js           # Commuter planning functionality
└── data/
    ├── stations.json         # Subway station data
    ├── restaurants.json      # Restaurant data
    ├── subway_lines.json     # Subway line data
    └── subway_lines.geojson  # GeoJSON subway line data

```

## Academic Context

This project was developed as part of the CS-GY 6313 / CUSP-GX 6006: Data Visualization Final Project, exploring the spatial relationships between transportation infrastructure and urban food ecosystems.

## Credits and Acknowledgments

- Leaflet.js for mapping capabilities
- Chart.js for data visualizations
- MTA for subway data
- Restaurant data collected and aggregated from multiple sources

## License

This project is created for academic purposes as part of CS-GY 6313 / CUSP-GX 6006: Data Visualization Final Project. All rights reserved by the author. Please contact the author for permissions regarding usage, distribution, or modification of this project.

---
*Created by Ruisi Dai (rd3686@nyu.edu)*
