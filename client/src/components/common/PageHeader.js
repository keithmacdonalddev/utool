import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PageHeader = ({
  title,
  backLink = '/dashboard',
  backLinkText = '',
  actions = null,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
      <div className="flex items-center gap-4">
        {backLink && (
          <Link
            to={backLink}
            className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline flex-shrink-0"
            title={backLinkText || 'Back'}
          >
            <ArrowLeft size={18} />
            {backLinkText && <span className="ml-1">{backLinkText}</span>}
          </Link>
        )}
        <h1 className="text-2xl font-bold text-text">{title}</h1>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

export default PageHeader;
