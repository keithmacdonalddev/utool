import React from 'react';
import QuickTaskWidget from '../components/widgets/QuickTaskWidget';
import NotesOverviewWidget from '../components/widgets/NotesOverviewWidget';
import KbQuickAccessWidget from '../components/widgets/KbQuickAccessWidget';
import ProjectProgressWidget from '../components/widgets/ProjectProgressWidget';
import QuoteFooter from '../components/widgets/QuoteFooter';

const DashboardPage = () => {
  return (
    <div className="flex flex-col h-full">
      {/* Main Content - This will push the footer to the bottom */}
      <div className="flex-grow">
        <div className="container mx-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1 */}
            <div className="md:col-span-1 space-y-4">
              <ProjectProgressWidget />
            </div>

            {/* Column 2 */}
            <div className="md:col-span-1 space-y-4">
              <QuickTaskWidget />
              <NotesOverviewWidget />
            </div>

            {/* Column 3 */}
            <div className="md:col-span-1 space-y-4">
              <KbQuickAccessWidget />
            </div>
          </div>
        </div>
      </div>

      {/* Quote Footer - will always stay at bottom */}
      <QuoteFooter />
    </div>
  );
};

export default DashboardPage;
