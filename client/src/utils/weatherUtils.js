/**
 * Weather utilities for the application
 * Contains functions for mapping weather codes to icons and processing weather data
 */

import React from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
} from 'lucide-react';

/**
 * Returns the appropriate weather icon component based on the OpenWeatherMap icon code
 *
 * @param {string} iconCode - The weather icon code from OpenWeatherMap API (e.g., '01d', '10n')
 * @returns {JSX.Element} - A React component representing the weather icon
 */
export const getWeatherIcon = (iconCode) => {
  if (!iconCode) return <Sun size={16} className="text-yellow-500" />;
  const main = iconCode.substring(0, 2);
  switch (main) {
    case '01':
      return <Sun size={16} className="text-yellow-500" />;
    case '02':
      return <Cloud size={16} className="text-gray-400" />;
    case '03':
      return <Cloud size={16} className="text-gray-500" />;
    case '04':
      return <Cloud size={16} className="text-gray-600" />;
    case '09':
      return <CloudRain size={16} className="text-blue-500" />;
    case '10':
      return <CloudRain size={16} className="text-blue-400" />;
    case '11':
      return <CloudLightning size={16} className="text-yellow-600" />;
    case '13':
      return <CloudSnow size={16} className="text-blue-300" />;
    case '50':
      return <Wind size={16} className="text-gray-400" />;
    default:
      return <Sun size={16} className="text-yellow-500" />;
  }
};
