import React, { useState } from 'react';
import './SpecconUI.css';

/**
 * Speccon Design System - Core UI Components
 * 
 * Usage:
 * import { Layout, Card, Button, Badge, StatItem } from './SpecconUI';
 */

// --- Layout Components ---

export const Layout = ({
    appName = "Speccon CRM",
    user,
    navItems = [],
    currentPath,
    onLogout,
    children
}) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="speccon-layout">
            <header className="speccon-header">
                <div className="speccon-header-content">
                    <div className="speccon-brand-wrapper">
                        <h1 className="speccon-brand">{appName}</h1>
                        <button className="speccon-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button>
                    </div>

                    <nav className={`speccon-nav ${mobileMenuOpen ? 'open' : ''}`}>
                        {navItems.map((item) => (
                            <a
                                key={item.path}
                                href={item.path}
                                className={`speccon-nav-link ${currentPath === item.path ? 'active' : ''}`}
                                onClick={(e) => {
                                    if (item.onClick) {
                                        e.preventDefault();
                                        item.onClick();
                                    }
                                }}
                            >
                                {item.label}
                                {item.badge && <span className="speccon-nav-badge">{item.badge}</span>}
                            </a>
                        ))}
                    </nav>

                    <div className="speccon-header-right">
                        {user && (
                            <div className="speccon-user-profile">
                                <div className="speccon-avatar">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt={user.name} />
                                    ) : (
                                        <span>{(user.name || user.email || 'U').charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="speccon-user-info">
                                    <span className="speccon-user-role">{user.role}</span>
                                </div>
                                {onLogout && (
                                    <button onClick={onLogout} className="speccon-logout-btn" title="Logout">
                                        ➞
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="speccon-main">
                {children}
            </main>
        </div>
    );
};

// --- Page Components ---

export const PageHeader = ({ title, subtitle, action }) => (
    <div className="speccon-page-header">
        <div className="speccon-page-title-group">
            <h1>{title}</h1>
            {subtitle && <span className="speccon-subtitle">{subtitle}</span>}
        </div>
        {action && <div className="speccon-page-action">{action}</div>}
    </div>
);

// --- Content Containers ---

export const Card = ({ title, actionLabel, onAction, children, className = '' }) => (
    <div className={`speccon-card ${className}`}>
        {title && (
            <div className="speccon-card-header">
                <h2>{title}</h2>
                {actionLabel && (
                    <button className="speccon-link-btn" onClick={onAction}>
                        {actionLabel}
                    </button>
                )}
            </div>
        )}
        <div className="speccon-card-content">
            {children}
        </div>
    </div>
);

export const Grid = ({ children, columns = 3, gap = 20 }) => (
    <div
        className="speccon-grid"
        style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: `${gap}px`
        }}
    >
        {children}
    </div>
);

// --- Data Display ---

export const StatItem = ({ label, value, subValue, trend }) => (
    <div className="speccon-stat-item">
        <span className="speccon-stat-label">{label}</span>
        <span className="speccon-stat-value">{value}</span>
        {subValue && <span className="speccon-stat-sub">{subValue}</span>}
    </div>
);

export const Badge = ({ status, children }) => {
    const getstatusClass = (s) => {
        switch (String(s).toLowerCase()) {
            case 'overdue': return 'speccon-badge-danger';
            case 'due-today': return 'speccon-badge-warning';
            case 'completed': case 'won': return 'speccon-badge-success';
            case 'new': case 'scheduled': return 'speccon-badge-info';
            default: return 'speccon-badge-neutral';
        }
    };

    return (
        <span className={`speccon-badge ${getstatusClass(status)}`}>
            {children || status}
        </span>
    );
};

// --- Form Elements ---

export const Button = ({ children, variant = 'primary', size = 'medium', className = '', ...props }) => (
    <button
        className={`speccon-btn speccon-btn-${variant} speccon-btn-${size} ${className}`}
        {...props}
    >
        {children}
    </button>
);
