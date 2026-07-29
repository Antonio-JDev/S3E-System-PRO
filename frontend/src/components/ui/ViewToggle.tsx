import React from 'react';

const Squares2x2Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
);

const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

interface ViewToggleProps {
    view: 'grid' | 'list';
    onViewChange: (view: 'grid' | 'list') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ view, onViewChange }) => {
    return (
        <div className="inline-flex items-center bg-gray-100 dark:bg-dark-nav rounded-lg p-1 border border-transparent dark:border-dark-border">
            <button
                onClick={() => onViewChange('grid')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                    view === 'grid'
                        ? 'bg-white dark:bg-dark-accent-soft text-gray-900 dark:text-dark-text shadow-sm font-semibold'
                        : 'text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text dark:hover:bg-dark-elevated'
                }`}
                title="Visualizar em cards"
            >
                <Squares2x2Icon className="w-4 h-4" />
                <span className="text-sm">Cards</span>
            </button>
            <button
                onClick={() => onViewChange('list')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                    view === 'list'
                        ? 'bg-white dark:bg-dark-accent-soft text-gray-900 dark:text-dark-text shadow-sm font-semibold'
                        : 'text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text dark:hover:bg-dark-elevated'
                }`}
                title="Visualizar em lista"
            >
                <Bars3Icon className="w-4 h-4" />
                <span className="text-sm">Lista</span>
            </button>
        </div>
    );
};

export default ViewToggle;

