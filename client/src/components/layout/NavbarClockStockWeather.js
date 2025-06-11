import React from 'react';
import ClockDisplay from './ClockDisplay';
import WeatherDisplay from './WeatherDisplay';
import CompactStockDisplay from './CompactStockDisplay';

/**
 * Navbar component that combines clock, stock, and weather information
 *
 * @returns {JSX.Element} - Rendered navbar component with clock, stock, and weather
 */
const NavbarClockStockWeather = () => {
  return (
    <div className="flex items-center space-x-3 text-sm text-white drop-shadow">
      {/* Compact Stock Display */}
      <CompactStockDisplay symbol="TSLA" />

      <span className="text-gray-300">|</span>

      {/* Weather Display */}
      <WeatherDisplay location="Halifax" />

      <span className="text-gray-300">|</span>

      {/* Clock Display */}
      <ClockDisplay />
    </div>
  );
};

export default NavbarClockStockWeather;
