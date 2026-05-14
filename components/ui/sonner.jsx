'use client';
import * as React from 'react';
import { Toaster as Sonner } from 'sonner';
const Toaster = ({ ...props }) => {
    const [theme, setTheme] = React.useState('system');
    React.useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const syncTheme = () => {
            setTheme(mediaQuery.matches ? 'dark' : 'light');
        };
        syncTheme();
        mediaQuery.addEventListener('change', syncTheme);
        return () => mediaQuery.removeEventListener('change', syncTheme);
    }, []);
    return (<Sonner theme={theme} className="toaster group" style={{
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
        }} {...props}/>);
};
export { Toaster };
