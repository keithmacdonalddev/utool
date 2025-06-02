import React, { useState, useEffect } from 'react';
import {
  Globe,
  Eye,
  EyeOff,
  Users,
  Shield,
  Settings,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Info,
  Lock,
  Unlock,
  Clock,
  Search,
  Star,
  FileText,
  Image,
  Link,
} from 'lucide-react';

/**
 * PublicSettingsPage Component
 *
 * Comprehensive admin interface for managing public-facing features,
 * guest user access controls, content visibility settings, and
 * branding/customization options.
 *
 * Part of Milestone 2: Analytics Dashboard & User Insights
 *
 * @returns {React.ReactElement} The PublicSettingsPage component
 */
const PublicSettingsPage = () => {
  const [settings, setSettings] = useState({
    // Guest Access Settings
    guestAccess: {
      enabled: true,
      allowRegistration: true,
      requireEmailVerification: false,
      sessionTimeout: 60, // minutes
      maxGuestSessions: 100,
    },

    // Content Visibility Settings
    contentVisibility: {
      dashboard: true,
      projects: true,
      knowledgeBase: true,
      notes: false,
      resources: true,
      friends: false,
      profile: false,
    },

    // Feature Access Settings
    featureAccess: {
      createContent: false,
      editContent: false,
      downloadContent: true,
      shareContent: true,
      comments: false,
      ratings: true,
      search: true,
    },

    // Branding & Customization
    branding: {
      siteName: 'uTool',
      tagline: 'Your productivity companion',
      welcomeMessage:
        'Welcome to uTool! Explore our features and boost your productivity.',
      logoUrl: '',
      faviconUrl: '',
      primaryColor: '#3B82F6',
      showPoweredBy: true,
    },

    // Security Settings
    security: {
      rateLimiting: true,
      ipWhitelisting: false,
      whitelistedIPs: '',
      contentFiltering: true,
      spamPrevention: true,
      captchaEnabled: false,
    },

    // Analytics & Tracking
    analytics: {
      trackGuestActivity: true,
      trackPageViews: true,
      trackDownloads: true,
      trackSearches: true,
      retentionDays: 90,
      anonymizeData: true,
    },
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('access'); // access, content, features, branding, security, analytics
  const [lastSaved, setLastSaved] = useState(new Date());

  /**
   * Handle settings change
   * @param {string} section - Settings section
   * @param {string} key - Setting key
   * @param {*} value - New value
   */
  const handleSettingChange = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setIsDirty(true);
  };

  /**
   * Handle save settings
   */
  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setIsDirty(false);
      setLastSaved(new Date());

      // Show success message (would use toast in real app)
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle reset to defaults
   */
  const handleReset = () => {
    if (
      window.confirm(
        'Are you sure you want to reset all settings to defaults? This action cannot be undone.'
      )
    ) {
      // Reset to default values
      setSettings({
        guestAccess: {
          enabled: true,
          allowRegistration: true,
          requireEmailVerification: false,
          sessionTimeout: 60,
          maxGuestSessions: 100,
        },
        contentVisibility: {
          dashboard: true,
          projects: true,
          knowledgeBase: true,
          notes: false,
          resources: true,
          friends: false,
          profile: false,
        },
        featureAccess: {
          createContent: false,
          editContent: false,
          downloadContent: true,
          shareContent: true,
          comments: false,
          ratings: true,
          search: true,
        },
        branding: {
          siteName: 'uTool',
          tagline: 'Your productivity companion',
          welcomeMessage:
            'Welcome to uTool! Explore our features and boost your productivity.',
          logoUrl: '',
          faviconUrl: '',
          primaryColor: '#3B82F6',
          showPoweredBy: true,
        },
        security: {
          rateLimiting: true,
          ipWhitelisting: false,
          whitelistedIPs: '',
          contentFiltering: true,
          spamPrevention: true,
          captchaEnabled: false,
        },
        analytics: {
          trackGuestActivity: true,
          trackPageViews: true,
          trackDownloads: true,
          trackSearches: true,
          retentionDays: 90,
          anonymizeData: true,
        },
      });
      setIsDirty(true);
    }
  };

  // Tab configurations
  const tabs = [
    { key: 'access', label: 'Guest Access', icon: Users },
    { key: 'content', label: 'Content Visibility', icon: Eye },
    { key: 'features', label: 'Feature Access', icon: Settings },
    { key: 'branding', label: 'Branding', icon: Star },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'analytics', label: 'Analytics', icon: Globe },
  ];

  /**
   * Render toggle switch
   * @param {Object} props - Toggle props
   * @returns {React.ReactElement} Toggle switch component
   */
  const Toggle = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <label className="text-heading font-medium text-sm">{label}</label>
        {description && (
          <p className="text-caption text-xs mt-1">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 ${
          enabled ? 'bg-brand-primary' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="container-page py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-heading text-3xl font-bold mb-2">
            Public Settings
          </h1>
          <p className="text-caption">
            Configure guest access, content visibility, and public-facing
            features
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isDirty && (
            <div className="flex items-center text-orange-400 text-sm">
              <AlertTriangle size={16} className="mr-1" />
              Unsaved changes
            </div>
          )}

          <button
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 bg-surface-primary text-heading rounded-lg hover:bg-surface-secondary transition-colors duration-200 border border-border-secondary"
          >
            <RotateCcw size={16} className="mr-2" />
            Reset to Defaults
          </button>

          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="inline-flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save
              size={16}
              className={`mr-2 ${isSaving ? 'animate-spin' : ''}`}
            />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border-secondary mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === tab.key
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-caption hover:text-heading hover:border-gray-300'
              }`}
            >
              <tab.icon size={16} className="mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Guest Access Tab */}
        {activeTab === 'access' && (
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <Users className="mr-2 h-5 w-5 text-brand-primary" />
              <h3 className="text-heading text-lg font-semibold">
                Guest Access Settings
              </h3>
            </div>

            <div className="space-y-4">
              <Toggle
                enabled={settings.guestAccess.enabled}
                onChange={(value) =>
                  handleSettingChange('guestAccess', 'enabled', value)
                }
                label="Enable Guest Access"
                description="Allow users to access the platform without creating an account"
              />

              <Toggle
                enabled={settings.guestAccess.allowRegistration}
                onChange={(value) =>
                  handleSettingChange('guestAccess', 'allowRegistration', value)
                }
                label="Allow Guest Registration"
                description="Permit guests to create new user accounts"
              />

              <Toggle
                enabled={settings.guestAccess.requireEmailVerification}
                onChange={(value) =>
                  handleSettingChange(
                    'guestAccess',
                    'requireEmailVerification',
                    value
                  )
                }
                label="Require Email Verification"
                description="New registrations must verify their email address"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="block text-heading font-medium text-sm mb-2">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.guestAccess.sessionTimeout}
                    onChange={(e) =>
                      handleSettingChange(
                        'guestAccess',
                        'sessionTimeout',
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 bg-surface-primary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    min="5"
                    max="1440"
                  />
                </div>

                <div>
                  <label className="block text-heading font-medium text-sm mb-2">
                    Max Concurrent Guest Sessions
                  </label>
                  <input
                    type="number"
                    value={settings.guestAccess.maxGuestSessions}
                    onChange={(e) =>
                      handleSettingChange(
                        'guestAccess',
                        'maxGuestSessions',
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 bg-surface-primary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    min="10"
                    max="1000"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Visibility Tab */}
        {activeTab === 'content' && (
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <Eye className="mr-2 h-5 w-5 text-brand-primary" />
              <h3 className="text-heading text-lg font-semibold">
                Content Visibility
              </h3>
            </div>

            <div className="space-y-4">
              <Toggle
                enabled={settings.contentVisibility.dashboard}
                onChange={(value) =>
                  handleSettingChange('contentVisibility', 'dashboard', value)
                }
                label="Dashboard"
                description="Allow guests to view the main dashboard"
              />

              <Toggle
                enabled={settings.contentVisibility.projects}
                onChange={(value) =>
                  handleSettingChange('contentVisibility', 'projects', value)
                }
                label="Projects"
                description="Grant access to public projects and project listings"
              />

              <Toggle
                enabled={settings.contentVisibility.knowledgeBase}
                onChange={(value) =>
                  handleSettingChange(
                    'contentVisibility',
                    'knowledgeBase',
                    value
                  )
                }
                label="Knowledge Base"
                description="Allow reading of public knowledge base articles"
              />

              <Toggle
                enabled={settings.contentVisibility.notes}
                onChange={(value) =>
                  handleSettingChange('contentVisibility', 'notes', value)
                }
                label="Notes"
                description="Enable access to public notes (not recommended for sensitive content)"
              />

              <Toggle
                enabled={settings.contentVisibility.resources}
                onChange={(value) =>
                  handleSettingChange('contentVisibility', 'resources', value)
                }
                label="Resources"
                description="Show public bookmarks, snippets, and quotes"
              />

              <Toggle
                enabled={settings.contentVisibility.friends}
                onChange={(value) =>
                  handleSettingChange('contentVisibility', 'friends', value)
                }
                label="Friends"
                description="Display friend connections and public profiles"
              />

              <Toggle
                enabled={settings.contentVisibility.profile}
                onChange={(value) =>
                  handleSettingChange('contentVisibility', 'profile', value)
                }
                label="User Profiles"
                description="Allow viewing of public user profile information"
              />
            </div>
          </div>
        )}

        {/* Feature Access Tab */}
        {activeTab === 'features' && (
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <Settings className="mr-2 h-5 w-5 text-brand-primary" />
              <h3 className="text-heading text-lg font-semibold">
                Feature Access Controls
              </h3>
            </div>

            <div className="space-y-4">
              <Toggle
                enabled={settings.featureAccess.createContent}
                onChange={(value) =>
                  handleSettingChange('featureAccess', 'createContent', value)
                }
                label="Create Content"
                description="Allow guests to create new content (requires moderation)"
              />

              <Toggle
                enabled={settings.featureAccess.editContent}
                onChange={(value) =>
                  handleSettingChange('featureAccess', 'editContent', value)
                }
                label="Edit Content"
                description="Permit guests to edit existing content they have access to"
              />

              <Toggle
                enabled={settings.featureAccess.downloadContent}
                onChange={(value) =>
                  handleSettingChange('featureAccess', 'downloadContent', value)
                }
                label="Download Content"
                description="Enable downloading of attachments and exported content"
              />

              <Toggle
                enabled={settings.featureAccess.shareContent}
                onChange={(value) =>
                  handleSettingChange('featureAccess', 'shareContent', value)
                }
                label="Share Content"
                description="Allow sharing content via links and social media"
              />

              <Toggle
                enabled={settings.featureAccess.comments}
                onChange={(value) =>
                  handleSettingChange('featureAccess', 'comments', value)
                }
                label="Comments"
                description="Enable commenting on public content"
              />

              <Toggle
                enabled={settings.featureAccess.ratings}
                onChange={(value) =>
                  handleSettingChange('featureAccess', 'ratings', value)
                }
                label="Ratings & Reviews"
                description="Allow rating and reviewing of content"
              />

              <Toggle
                enabled={settings.featureAccess.search}
                onChange={(value) =>
                  handleSettingChange('featureAccess', 'search', value)
                }
                label="Search"
                description="Provide search functionality for public content"
              />
            </div>
          </div>
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <Star className="mr-2 h-5 w-5 text-brand-primary" />
              <h3 className="text-heading text-lg font-semibold">
                Branding & Customization
              </h3>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-heading font-medium text-sm mb-2">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={settings.branding.siteName}
                    onChange={(e) =>
                      handleSettingChange(
                        'branding',
                        'siteName',
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 bg-surface-primary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    placeholder="Enter site name"
                  />
                </div>

                <div>
                  <label className="block text-heading font-medium text-sm mb-2">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={settings.branding.tagline}
                    onChange={(e) =>
                      handleSettingChange('branding', 'tagline', e.target.value)
                    }
                    className="w-full px-3 py-2 bg-surface-primary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    placeholder="Enter tagline"
                  />
                </div>
              </div>

              <div>
                <label className="block text-heading font-medium text-sm mb-2">
                  Welcome Message
                </label>
                <textarea
                  value={settings.branding.welcomeMessage}
                  onChange={(e) =>
                    handleSettingChange(
                      'branding',
                      'welcomeMessage',
                      e.target.value
                    )
                  }
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-primary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="Enter welcome message for guests"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-heading font-medium text-sm mb-2">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={settings.branding.logoUrl}
                    onChange={(e) =>
                      handleSettingChange('branding', 'logoUrl', e.target.value)
                    }
                    className="w-full px-3 py-2 bg-surface-primary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div>
                  <label className="block text-heading font-medium text-sm mb-2">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    value={settings.branding.primaryColor}
                    onChange={(e) =>
                      handleSettingChange(
                        'branding',
                        'primaryColor',
                        e.target.value
                      )
                    }
                    className="w-full h-10 bg-surface-primary border border-border-secondary rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <Toggle
                enabled={settings.branding.showPoweredBy}
                onChange={(value) =>
                  handleSettingChange('branding', 'showPoweredBy', value)
                }
                label="Show 'Powered by uTool'"
                description="Display attribution link in the footer"
              />
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <Shield className="mr-2 h-5 w-5 text-brand-primary" />
              <h3 className="text-heading text-lg font-semibold">
                Security Settings
              </h3>
            </div>

            <div className="space-y-4">
              <Toggle
                enabled={settings.security.rateLimiting}
                onChange={(value) =>
                  handleSettingChange('security', 'rateLimiting', value)
                }
                label="Rate Limiting"
                description="Limit the number of requests per minute from guest users"
              />

              <Toggle
                enabled={settings.security.contentFiltering}
                onChange={(value) =>
                  handleSettingChange('security', 'contentFiltering', value)
                }
                label="Content Filtering"
                description="Automatically filter inappropriate content submissions"
              />

              <Toggle
                enabled={settings.security.spamPrevention}
                onChange={(value) =>
                  handleSettingChange('security', 'spamPrevention', value)
                }
                label="Spam Prevention"
                description="Enable anti-spam measures for guest interactions"
              />

              <Toggle
                enabled={settings.security.captchaEnabled}
                onChange={(value) =>
                  handleSettingChange('security', 'captchaEnabled', value)
                }
                label="CAPTCHA Verification"
                description="Require CAPTCHA for guest registration and sensitive actions"
              />

              <Toggle
                enabled={settings.security.ipWhitelisting}
                onChange={(value) =>
                  handleSettingChange('security', 'ipWhitelisting', value)
                }
                label="IP Whitelisting"
                description="Restrict guest access to specific IP addresses"
              />

              {settings.security.ipWhitelisting && (
                <div>
                  <label className="block text-heading font-medium text-sm mb-2">
                    Whitelisted IP Addresses
                  </label>
                  <textarea
                    value={settings.security.whitelistedIPs}
                    onChange={(e) =>
                      handleSettingChange(
                        'security',
                        'whitelistedIPs',
                        e.target.value
                      )
                    }
                    rows={3}
                    className="w-full px-3 py-2 bg-surface-primary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    placeholder="Enter IP addresses, one per line"
                  />
                  <p className="text-caption text-xs mt-1">
                    Enter one IP address per line. Supports CIDR notation (e.g.,
                    192.168.1.0/24)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <Globe className="mr-2 h-5 w-5 text-brand-primary" />
              <h3 className="text-heading text-lg font-semibold">
                Analytics & Tracking
              </h3>
            </div>

            <div className="space-y-4">
              <Toggle
                enabled={settings.analytics.trackGuestActivity}
                onChange={(value) =>
                  handleSettingChange('analytics', 'trackGuestActivity', value)
                }
                label="Track Guest Activity"
                description="Monitor guest user behavior and interactions"
              />

              <Toggle
                enabled={settings.analytics.trackPageViews}
                onChange={(value) =>
                  handleSettingChange('analytics', 'trackPageViews', value)
                }
                label="Track Page Views"
                description="Record page views and navigation patterns"
              />

              <Toggle
                enabled={settings.analytics.trackDownloads}
                onChange={(value) =>
                  handleSettingChange('analytics', 'trackDownloads', value)
                }
                label="Track Downloads"
                description="Monitor file downloads and export activities"
              />

              <Toggle
                enabled={settings.analytics.trackSearches}
                onChange={(value) =>
                  handleSettingChange('analytics', 'trackSearches', value)
                }
                label="Track Searches"
                description="Record search queries and results (anonymized)"
              />

              <Toggle
                enabled={settings.analytics.anonymizeData}
                onChange={(value) =>
                  handleSettingChange('analytics', 'anonymizeData', value)
                }
                label="Anonymize Data"
                description="Remove personally identifiable information from analytics"
              />

              <div>
                <label className="block text-heading font-medium text-sm mb-2">
                  Data Retention Period (days)
                </label>
                <input
                  type="number"
                  value={settings.analytics.retentionDays}
                  onChange={(e) =>
                    handleSettingChange(
                      'analytics',
                      'retentionDays',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 bg-surface-primary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent max-w-xs"
                  min="7"
                  max="365"
                />
                <p className="text-caption text-xs mt-1">
                  Analytics data will be automatically deleted after this period
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Last Saved Info */}
        <div className="bg-surface-secondary rounded-lg p-4 border border-border-secondary">
          <div className="flex items-center text-caption text-sm">
            <CheckCircle size={16} className="text-green-400 mr-2" />
            <span>Last saved: {lastSaved.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicSettingsPage;
