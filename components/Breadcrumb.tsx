import React from 'react';

interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => (
  <nav style={{ fontSize: 14, color: '#8b98a9', marginBottom: 8 }}>
    {items.map((item, idx) => (
      <span key={idx}>
        {item.href ? (
          <a href={item.href} style={{ color: '#3b4a60', textDecoration: 'none' }}>{item.label}</a>
        ) : (
          <span style={{ color: '#3b4a60' }}>{item.label}</span>
        )}
        {idx < items.length - 1 && ' > '}
      </span>
    ))}
  </nav>
);

export default Breadcrumb;
