import React from 'react';
import { Construction, ArrowLeft, Calendar, Users, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * ComingSoonPage Component
 *
 * A professional placeholder page for admin features that are planned
 * but not yet implemented. Provides clear communication about upcoming
 * functionality while maintaining a polished user experience.
 *
 * Used during the Admin Tool Reorganization to show planned features
 * with timeline information and contact options.
 *
 * @param {Object} props - Component props
 * @param {string} props.title - The title of the upcoming feature
 * @param {string} [props.description] - Custom description of the feature
 * @param {string} [props.milestone] - Which milestone this feature belongs to
 * @param {string} [props.estimatedRelease] - Estimated release timeframe
 * @param {string[]} [props.features] - List of specific features to be included
 * @param {boolean} [props.showBackButton=true] - Whether to show the back button
 * @returns {React.ReactElement} The ComingSoonPage component
 */
const ComingSoonPage = ({
  title,
  description = 'This feature is part of our ongoing Admin Tool Reorganization and will be available soon.',
  milestone,
  estimatedRelease,
  features = [],
  showBackButton = true,
}) => {
  const navigate = useNavigate();

  // Default milestone information based on common admin features
  const getMilestoneInfo = (featureTitle) => {
    const milestoneMap = {
      'Roles & Permissions': { milestone: '5', release: 'Week 11-12' },
      'System Health': { milestone: '3', release: 'Week 7-8' },
      'Public Settings': { milestone: '2', release: 'Week 5-6' },
      'Maintenance Tools': { milestone: '4', release: 'Week 9-10' },
    };

    return (
      milestoneMap[featureTitle] || {
        milestone: 'TBD',
        release: 'To be announced',
      }
    );
  };

  const milestoneInfo =
    milestone && estimatedRelease
      ? { milestone, release: estimatedRelease }
      : getMilestoneInfo(title);

  return (
    <div className="container-page py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header with back navigation */}
        {showBackButton && (
          <div className="mb-6">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center text-brand-primary hover:text-brand-primary-dark transition-colors duration-200 group"
              aria-label="Go back to previous page"
            >
              <ArrowLeft
                size={20}
                className="mr-2 transform group-hover:-translate-x-1 transition-transform duration-200"
              />
              Back to Admin Panel
            </button>
          </div>
        )}

        {/* Main content */}
        <div className="text-center bg-surface-elevated rounded-lg border border-border-secondary p-8 shadow-lg">
          {/* Icon and status */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-primary/10 rounded-full mb-4">
              <Construction className="h-10 w-10 text-brand-primary" />
            </div>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20 mb-4">
              <Calendar size={12} className="mr-1" />
              Coming Soon
            </div>
          </div>

          {/* Title and description */}
          <h1 className="text-heading text-3xl font-bold mb-4">{title}</h1>
          <p className="text-caption text-lg mb-6 leading-relaxed">
            {description}
          </p>

          {/* Timeline information */}
          <div className="bg-surface-primary rounded-lg border border-border-secondary p-6 mb-6">
            <h2 className="text-heading text-lg font-semibold mb-4 flex items-center justify-center">
              <Shield className="mr-2 h-5 w-5 text-brand-primary" />
              Development Timeline
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-caption font-medium">Milestone</div>
                <div className="text-heading font-bold text-lg">
                  {milestoneInfo.milestone}
                </div>
              </div>
              <div className="text-center">
                <div className="text-caption font-medium">
                  Estimated Release
                </div>
                <div className="text-heading font-bold text-lg">
                  {milestoneInfo.release}
                </div>
              </div>
            </div>
          </div>

          {/* Feature preview (if provided) */}
          {features.length > 0 && (
            <div className="bg-surface-primary rounded-lg border border-border-secondary p-6 mb-6 text-left">
              <h3 className="text-heading text-lg font-semibold mb-3 flex items-center">
                <Users className="mr-2 h-5 w-5 text-brand-primary" />
                Planned Features
              </h3>
              <ul className="space-y-2">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-brand-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-caption">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-primary-dark transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-surface-elevated"
            >
              Return to Dashboard
            </Link>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center px-6 py-3 bg-surface-primary text-heading font-medium rounded-lg border border-border-secondary hover:bg-surface-secondary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-surface-elevated"
            >
              Go Back
            </button>
          </div>

          {/* Additional info */}
          <div className="mt-8 pt-6 border-t border-border-secondary">
            <p className="text-caption text-sm">
              Questions about this feature?{' '}
              <Link
                to="/admin/settings"
                className="text-brand-primary hover:text-brand-primary-dark underline transition-colors duration-200"
              >
                Contact your administrator
              </Link>{' '}
              or{' '}
              <Link
                to="/admin/audit-logs"
                className="text-brand-primary hover:text-brand-primary-dark underline transition-colors duration-200"
              >
                check the development logs
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-8 text-center">
          <div className="text-caption text-sm mb-2">
            Admin Tool Reorganization Progress
          </div>
          <div className="w-full bg-surface-secondary rounded-full h-2 max-w-md mx-auto">
            <div
              className="bg-brand-primary h-2 rounded-full transition-all duration-300"
              style={{ width: '30%' }} // Approximately 30% through the reorganization
            ></div>
          </div>
          <div className="text-caption text-xs mt-1">Phase 1 of 6 Complete</div>
        </div>
      </div>
    </div>
  );
};

// PropTypes for development-time type checking
ComingSoonPage.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  milestone: PropTypes.string,
  estimatedRelease: PropTypes.string,
  features: PropTypes.arrayOf(PropTypes.string),
  showBackButton: PropTypes.bool,
};

export default ComingSoonPage;
