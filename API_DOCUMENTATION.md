# 🚀 BrightData Scraper API Documentation

## Overview

This API provides access to restaurant menu data scraped from various sources including Il Caminetto Italian Restaurant and Uber Eats.

## Base URL

```
http://localhost:3000
```

## Authentication

Currently, no authentication is required. All endpoints are publicly accessible.

## Endpoints

### 🔍 Health Check

```
GET /health
```

Returns server status and uptime information.

**Response:**

```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5
}
```

### 📚 Available Scrapers

```
GET /api/v1/scrapers
```

Returns information about all available scrapers and their endpoints.

**Response:**

```json
{
  "scrapers": [
    {
      "id": "ilcaminetto",
      "name": "Il Caminetto Italian Restaurant",
      "description": "Italian restaurant menu scraper",
      "endpoints": {
        "menu": "/api/v1/scrapers/ilcaminetto/menu",
        "scrape": "/api/v1/scrapers/ilcaminetto/scrape"
      }
    },
    {
      "id": "uber",
      "name": "Uber Eats",
      "description": "Uber Eats restaurant menu scraper",
      "endpoints": {
        "menu": "/api/v1/scrapers/uber/menu",
        "scrape": "/api/v1/scrapers/uber/scrape"
      }
    }
  ]
}
```

### 🍕 Il Caminetto Endpoints

#### Get Menu Data

```
GET /api/v1/scrapers/ilcaminetto/menu
```

Returns the current menu data for Il Caminetto Italian Restaurant.

**Response:**

```json
{
  "success": true,
  "data": [...],
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "totalItems": 51
}
```

#### Run Scraper

```
POST /api/v1/scrapers/ilcaminetto/scrape
```

Triggers a new scraping session for Il Caminetto.

**Response:**

```json
{
  "success": true,
  "message": "Scraping completed successfully",
  "data": {
    "success": true,
    "filename": "ilcaminetto_menu.json",
    "totalItems": 51,
    "categories": [...],
    "sampleItem": {...}
  }
}
```

### 🚗 Uber Eats Endpoints

#### Get Menu Data

```
GET /api/v1/scrapers/uber/menu
```

Returns the current menu data for Uber Eats.

**Response:**

```json
{
  "success": true,
  "data": [...],
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "totalItems": 3064
}
```

#### Run Scraper

```
POST /api/v1/scrapers/uber/scrape
```

Triggers a new scraping session for Uber Eats.

**Response:**

```json
{
  "success": true,
  "message": "Scraping completed successfully",
  "data": {
    "success": true,
    "filename": "uber_menu.json",
    "totalItems": 3064,
    "categories": [...],
    "sampleItem": {...}
  }
}
```

### 🔍 Search and Filter

```
GET /api/v1/search
```

Search and filter menu items across all scrapers.

**Query Parameters:**

- `query` (string): Search term for item names and descriptions
- `scraper` (string): Which scraper to search ('ilcaminetto' or 'uber')
- `category` (string): Filter by category
- `maxPrice` (string): Maximum price filter (e.g., "20.00")
- `dietary` (string): Comma-separated dietary requirements (e.g., "vegan,vegetarian")

**Example:**

```
GET /api/v1/search?query=pizza&scraper=ilcaminetto&maxPrice=30.00&dietary=vegetarian
```

**Response:**

```json
{
  "success": true,
  "data": [...],
  "totalResults": 5,
  "filters": {
    "query": "pizza",
    "scraper": "ilcaminetto",
    "category": null,
    "maxPrice": "30.00",
    "dietary": "vegetarian"
  }
}
```

### 📂 Categories

```
GET /api/v1/categories/:scraper
```

Get all available categories for a specific scraper.

**Example:**

```
GET /api/v1/categories/ilcaminetto
```

**Response:**

```json
{
  "success": true,
  "data": [
    "STUZZICHINI E ANTIPASTI",
    "PASTE",
    "PIZZE",
    "MAIN",
    "CONTORNI E INSALATE",
    "DESSERT",
    "DRINK LIST",
    "KIDS OPTIONS"
  ],
  "totalCategories": 8
}
```

## Data Schema

### Menu Item Structure

```json
{
  "_id": { "$oid": "unique_id" },
  "name": "Item Name",
  "price": "$17.00",
  "image": "http://example.com/image.jpg",
  "tags": ["pizza", "main"],
  "category": "PIZZE",
  "restaurant": "Restaurant Name",
  "dietary": ["vegetarian", "vegan"],
  "brandId": { "$oid": "brand_id" },
  "description": "Item description"
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message"
}
```

**Common HTTP Status Codes:**

- `200`: Success
- `404`: Resource not found
- `500`: Internal server error

## Usage Examples

### Using cURL

#### Get Il Caminetto Menu

```bash
curl http://localhost:3000/api/v1/scrapers/ilcaminetto/menu
```

#### Run Uber Scraper

```bash
curl -X POST http://localhost:3000/api/v1/scrapers/uber/scrape
```

#### Search for Vegetarian Pizza

```bash
curl "http://localhost:3000/api/v1/search?query=pizza&dietary=vegetarian&scraper=ilcaminetto"
```

### Using JavaScript/Fetch

#### Get Menu Data

```javascript
const response = await fetch(
  "http://localhost:3000/api/v1/scrapers/ilcaminetto/menu"
);
const data = await response.json();
console.log(data.data);
```

#### Run Scraper

```javascript
const response = await fetch(
  "http://localhost:3000/api/v1/scrapers/uber/scrape",
  {
    method: "POST",
  }
);
const result = await response.json();
console.log(result.message);
```

## Rate Limiting

Currently, no rate limiting is implemented. However, scraping operations are resource-intensive, so it's recommended to:

1. Not run multiple scrapers simultaneously
2. Wait for one scraping operation to complete before starting another
3. Use the GET endpoints for data retrieval rather than repeatedly running scrapers

## Development

### Starting the Server

```bash
npm start
```

### Development Mode (with auto-restart)

```bash
npm run dev
```

### Running Individual Scrapers

```bash
npm run scrape:ilcaminetto
npm run scrape:uber
```

## Notes

- Scraping operations may take several minutes to complete
- The API serves data from JSON files generated by the scrapers
- Real-time data is only available after running the scrapers
- Images are served from external URLs (restaurant websites or Unsplash)
- All prices are in USD format ($XX.XX)

## Support

For issues or questions:

1. Check the server logs for detailed error information
2. Verify that the target websites are accessible
3. Ensure all dependencies are properly installed
4. Check that the scrapers have generated the required JSON files
