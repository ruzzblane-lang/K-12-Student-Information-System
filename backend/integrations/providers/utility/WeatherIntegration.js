/**
 * Weather API Integration
 * 
 * Provides integration with weather services for:
 * - School closure notifications
 * - Athletic event planning
 * - Field trip weather monitoring
 * - Emergency weather alerts
 */

const axios = require('axios');
const winston = require('winston');

class WeatherIntegration {
  constructor() {
    this.name = 'Weather Service';
    this.provider = 'weather';
    this.version = '1.0.0';
    this.category = 'utility';
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'weather-integration' },
      transports: [
        new winston.transports.File({ filename: 'logs/weather.log' }),
        new winston.transports.Console()
      ]
    });

    this.apiKey = null;
    this.apiBaseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  /**
   * Initialize the integration with tenant configuration
   * @param {Object} config - Tenant configuration
   */
  async initialize(config) {
    try {
      const {
        api_key,
        provider = 'openweathermap',
        units = 'metric'
      } = config;

      this.apiKey = api_key;
      this.units = units;

      // Set API base URL based on provider
      switch (provider) {
        case 'openweathermap':
          this.apiBaseUrl = 'https://api.openweathermap.org/data/2.5';
          break;
        case 'weatherbit':
          this.apiBaseUrl = 'https://api.weatherbit.io/v2.0';
          break;
        case 'accuweather':
          this.apiBaseUrl = 'https://dataservice.accuweather.com';
          break;
        default:
          this.apiBaseUrl = 'https://api.openweathermap.org/data/2.5';
      }

      this.logger.info('Weather integration initialized', {
        provider,
        units,
        services: ['current', 'forecast', 'alerts', 'historical']
      });

      return { success: true, message: 'Weather integration initialized successfully' };
    } catch (error) {
      this.logger.error('Failed to initialize Weather integration', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Authenticate with Weather API
   * @param {Object} config - Authentication configuration
   * @returns {Promise<Object>} Authentication result
   */
  async authenticate(config) {
    try {
      if (!this.apiKey) {
        throw new Error('Integration not initialized');
      }

      // Test authentication by getting current weather for a test location
      const response = await axios.get(`${this.apiBaseUrl}/weather`, {
        params: {
          q: 'London',
          appid: this.apiKey,
          units: this.units
        }
      });

      this.logger.info('Weather API authentication successful', {
        location: response.data.name,
        country: response.data.sys.country
      });

      return {
        success: true,
        authenticated: true,
        location: {
          name: response.data.name,
          country: response.data.sys.country
        }
      };
    } catch (error) {
      this.logger.error('Weather API authentication failed', {
        error: error.message
      });
      return {
        success: false,
        authenticated: false,
        error: error.message
      };
    }
  }

  /**
   * Get current weather
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Weather options
   * @returns {Promise<Object>} Current weather data
   */
  async getCurrentWeather(config, options) {
    try {
      const {
        location,
        latitude = null,
        longitude = null
      } = options;

      let params = {
        appid: this.apiKey,
        units: this.units
      };

      if (latitude && longitude) {
        params.lat = latitude;
        params.lon = longitude;
      } else if (location) {
        params.q = location;
      } else {
        throw new Error('Either location or latitude/longitude must be provided');
      }

      const response = await axios.get(`${this.apiBaseUrl}/weather`, { params });

      this.logger.info('Current weather retrieved successfully', {
        location: response.data.name,
        temperature: response.data.main.temp,
        condition: response.data.weather[0].main
      });

      return {
        success: true,
        location: {
          name: response.data.name,
          country: response.data.sys.country,
          latitude: response.data.coord.lat,
          longitude: response.data.coord.lon
        },
        current: {
          temperature: response.data.main.temp,
          feelsLike: response.data.main.feels_like,
          humidity: response.data.main.humidity,
          pressure: response.data.main.pressure,
          condition: response.data.weather[0].main,
          description: response.data.weather[0].description,
          windSpeed: response.data.wind?.speed,
          windDirection: response.data.wind?.deg,
          visibility: response.data.visibility,
          uvIndex: response.data.uvi
        },
        timestamp: new Date(response.data.dt * 1000)
      };
    } catch (error) {
      this.logger.error('Failed to get current weather', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get weather forecast
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Forecast options
   * @returns {Promise<Object>} Weather forecast
   */
  async getWeatherForecast(config, options) {
    try {
      const {
        location,
        latitude = null,
        longitude = null,
        days = 5
      } = options;

      let params = {
        appid: this.apiKey,
        units: this.units,
        cnt: days * 8 // 8 forecasts per day (3-hour intervals)
      };

      if (latitude && longitude) {
        params.lat = latitude;
        params.lon = longitude;
      } else if (location) {
        params.q = location;
      } else {
        throw new Error('Either location or latitude/longitude must be provided');
      }

      const response = await axios.get(`${this.apiBaseUrl}/forecast`, { params });

      this.logger.info('Weather forecast retrieved successfully', {
        location: response.data.city.name,
        forecastCount: response.data.list.length,
        days
      });

      return {
        success: true,
        location: {
          name: response.data.city.name,
          country: response.data.city.country,
          latitude: response.data.city.coord.lat,
          longitude: response.data.city.coord.lon
        },
        forecast: response.data.list.map(item => ({
          timestamp: new Date(item.dt * 1000),
          temperature: item.main.temp,
          feelsLike: item.main.feels_like,
          humidity: item.main.humidity,
          pressure: item.main.pressure,
          condition: item.weather[0].main,
          description: item.weather[0].description,
          windSpeed: item.wind?.speed,
          windDirection: item.wind?.deg,
          precipitation: item.rain?.['3h'] || item.snow?.['3h'] || 0
        })),
        count: response.data.list.length
      };
    } catch (error) {
      this.logger.error('Failed to get weather forecast', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Check weather alerts
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Alert options
   * @returns {Promise<Object>} Weather alerts
   */
  async getWeatherAlerts(config, options) {
    try {
      const {
        location,
        latitude = null,
        longitude = null,
        severity = 'all'
      } = options;

      let params = {
        appid: this.apiKey
      };

      if (latitude && longitude) {
        params.lat = latitude;
        params.lon = longitude;
      } else if (location) {
        params.q = location;
      } else {
        throw new Error('Either location or latitude/longitude must be provided');
      }

      const response = await axios.get(`${this.apiBaseUrl}/onecall`, { params });

      const alerts = response.data.alerts || [];

      // Filter by severity if specified
      let filteredAlerts = alerts;
      if (severity !== 'all') {
        filteredAlerts = alerts.filter(alert => 
          alert.tags && alert.tags.includes(severity)
        );
      }

      this.logger.info('Weather alerts retrieved successfully', {
        location: response.data.timezone,
        alertCount: filteredAlerts.length,
        severity
      });

      return {
        success: true,
        location: response.data.timezone,
        alerts: filteredAlerts.map(alert => ({
          title: alert.event,
          description: alert.description,
          start: new Date(alert.start * 1000),
          end: new Date(alert.end * 1000),
          severity: alert.tags?.[0] || 'unknown',
          source: alert.sender_name
        })),
        count: filteredAlerts.length
      };
    } catch (error) {
      this.logger.error('Failed to get weather alerts', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Check school closure conditions
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Closure check options
   * @returns {Promise<Object>} Closure recommendation
   */
  async checkSchoolClosureConditions(config, options) {
    try {
      const {
        location,
        latitude = null,
        longitude = null,
        closureThresholds = {
          temperature: -20, // Celsius
          windSpeed: 25, // m/s
          precipitation: 10, // mm/h
          visibility: 1000 // meters
        }
      } = options;

      // Get current weather
      const currentWeather = await this.getCurrentWeather(config, {
        location,
        latitude,
        longitude
      });

      const weather = currentWeather.current;
      const recommendations = [];
      let shouldClose = false;

      // Check temperature
      if (weather.temperature <= closureThresholds.temperature) {
        recommendations.push({
          condition: 'temperature',
          value: weather.temperature,
          threshold: closureThresholds.temperature,
          severity: 'high',
          message: `Extreme cold temperature: ${weather.temperature}°C`
        });
        shouldClose = true;
      }

      // Check wind speed
      if (weather.windSpeed >= closureThresholds.windSpeed) {
        recommendations.push({
          condition: 'wind',
          value: weather.windSpeed,
          threshold: closureThresholds.windSpeed,
          severity: 'high',
          message: `High wind speed: ${weather.windSpeed} m/s`
        });
        shouldClose = true;
      }

      // Check precipitation
      if (weather.precipitation >= closureThresholds.precipitation) {
        recommendations.push({
          condition: 'precipitation',
          value: weather.precipitation,
          threshold: closureThresholds.precipitation,
          severity: 'medium',
          message: `Heavy precipitation: ${weather.precipitation} mm/h`
        });
      }

      // Check visibility
      if (weather.visibility <= closureThresholds.visibility) {
        recommendations.push({
          condition: 'visibility',
          value: weather.visibility,
          threshold: closureThresholds.visibility,
          severity: 'high',
          message: `Poor visibility: ${weather.visibility} meters`
        });
        shouldClose = true;
      }

      this.logger.info('School closure conditions checked', {
        location: currentWeather.location.name,
        shouldClose,
        recommendationCount: recommendations.length
      });

      return {
        success: true,
        location: currentWeather.location,
        shouldClose,
        recommendations,
        currentWeather: weather,
        timestamp: currentWeather.timestamp
      };
    } catch (error) {
      this.logger.error('Failed to check school closure conditions', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get athletic event weather
   * @param {Object} config - Tenant configuration
   * @param {Object} options - Event weather options
   * @returns {Promise<Object>} Event weather data
   */
  async getAthleticEventWeather(config, options) {
    try {
      const {
        location,
        latitude = null,
        longitude = null,
        eventDate,
        eventTime,
        sport = 'general'
      } = options;

      // Get forecast for the event date
      const forecast = await this.getWeatherForecast(config, {
        location,
        latitude,
        longitude,
        days: 7
      });

      // Find the forecast closest to the event time
      const eventDateTime = new Date(`${eventDate}T${eventTime}`);
      const closestForecast = forecast.forecast.reduce((closest, current) => {
        const currentDiff = Math.abs(new Date(current.timestamp) - eventDateTime);
        const closestDiff = Math.abs(new Date(closest.timestamp) - eventDateTime);
        return currentDiff < closestDiff ? current : closest;
      });

      // Sport-specific recommendations
      const sportRecommendations = this.getSportRecommendations(sport, closestForecast);

      this.logger.info('Athletic event weather retrieved', {
        location: forecast.location.name,
        eventDate,
        eventTime,
        sport,
        temperature: closestForecast.temperature
      });

      return {
        success: true,
        location: forecast.location,
        eventDateTime,
        weather: closestForecast,
        sportRecommendations,
        suitableForEvent: sportRecommendations.every(rec => rec.suitable)
      };
    } catch (error) {
      this.logger.error('Failed to get athletic event weather', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get sport-specific weather recommendations
   * @param {string} sport - Sport type
   * @param {Object} weather - Weather data
   * @returns {Array} Sport recommendations
   * @private
   */
  getSportRecommendations(sport, weather) {
    const recommendations = [];

    switch (sport.toLowerCase()) {
      case 'football':
      case 'soccer':
        if (weather.precipitation > 5) {
          recommendations.push({
            condition: 'precipitation',
            suitable: false,
            message: 'Heavy rain may make field conditions unsafe'
          });
        } else {
          recommendations.push({
            condition: 'precipitation',
            suitable: true,
            message: 'Precipitation levels are acceptable'
          });
        }
        break;

      case 'track':
      case 'running':
        if (weather.temperature > 30 || weather.temperature < 5) {
          recommendations.push({
            condition: 'temperature',
            suitable: false,
            message: 'Temperature outside safe range for running'
          });
        } else {
          recommendations.push({
            condition: 'temperature',
            suitable: true,
            message: 'Temperature is suitable for running'
          });
        }
        break;

      case 'baseball':
      case 'softball':
        if (weather.windSpeed > 15) {
          recommendations.push({
            condition: 'wind',
            suitable: false,
            message: 'High winds may affect game play'
          });
        } else {
          recommendations.push({
            condition: 'wind',
            suitable: true,
            message: 'Wind conditions are acceptable'
          });
        }
        break;

      default:
        recommendations.push({
          condition: 'general',
          suitable: true,
          message: 'Weather conditions appear suitable for outdoor activities'
        });
    }

    return recommendations;
  }

  /**
   * Health check for the integration
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      if (!this.apiKey) {
        return {
          status: 'unhealthy',
          message: 'Integration not initialized'
        };
      }

      // Test API connectivity
      await axios.get(`${this.apiBaseUrl}/weather`, {
        params: {
          q: 'London',
          appid: this.apiKey,
          units: this.units
        }
      });

      return {
        status: 'healthy',
        message: 'Weather integration is working properly',
        services: {
          current: 'available',
          forecast: 'available',
          alerts: 'available',
          historical: 'available'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        services: {
          current: 'unavailable',
          forecast: 'unavailable',
          alerts: 'unavailable',
          historical: 'unavailable'
        }
      };
    }
  }
}

module.exports = WeatherIntegration;
