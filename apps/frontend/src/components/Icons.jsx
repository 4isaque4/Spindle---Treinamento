import React from 'react';

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg'
};

export const IconFeedback = ({ size = 16, className }) => (
  <svg {...base} width={size} height={size} className={className}>
    <rect x="3" y="4" width="18" height="12" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
    <polygon points="8,16 8,20 12,16" fill="currentColor" />
  </svg>
);

export const IconDashboard = ({ size = 16, className }) => (
  <svg {...base} width={size} height={size} className={className}>
    <rect x="3" y="12" width="4" height="8" rx="1" fill="currentColor" />
    <rect x="10" y="8" width="4" height="12" rx="1" fill="currentColor" />
    <rect x="17" y="5" width="4" height="15" rx="1" fill="currentColor" />
  </svg>
);

export const IconLogout = ({ size = 16, className }) => (
  <svg {...base} width={size} height={size} className={className}>
    <rect x="3" y="4" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M13 12h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <polyline points="18,8 22,12 18,16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconEdit = ({ size = 16, className }) => (
  <svg {...base} width={size} height={size} className={className}>
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor" />
    <path d="M14.06 6.19l3.75 3.75" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const IconTrash = ({ size = 16, className }) => (
  <svg {...base} width={size} height={size} className={className}>
    <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="6" y="7" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const IconCheck = ({ size = 16, className }) => (
  <svg {...base} width={size} height={size} className={className}>
    <polyline points="4,12 10,18 20,6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconX = ({ size = 16, className }) => (
  <svg {...base} width={size} height={size} className={className}>
    <line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconRotate = ({ size = 16, className }) => (
  <svg {...base} width={size} height={size} className={className}>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
    <polyline points="12,4 12,8 16,8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);


