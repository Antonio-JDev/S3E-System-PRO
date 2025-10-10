import React from 'react';
import StatCard from './StatCard';
import RecentMovements from './RecentMovements';
import CriticalAlerts from './CriticalAlerts';
import QuickActions from './QuickActions';
import OngoingProjects from './OngoingProjects';
import { ProjectStatus, type StatCardData, type Project } from '../types';
import { 
    CubeIcon, 
    BlueprintIcon, 
    CurrencyDollarIcon, 
    ExclamationTriangleIcon, 
    TrendingUpIcon,
    CatalogIcon,
    BoltIcon
} from '../constants';
import { catalogData, materialsData, movementsData } from '../data/mockData';

const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
);



interface DashboardProps {
    toggleSidebar: () => void;
    onNavigate: (view: string) => void;
    projects: Project[];
}

const Dashboard: React.FC<DashboardProps> = ({ toggleSidebar, onNavigate, projects }) => {
    // Calculate dynamic data
    const totalCatalogItems = catalogData.length;
    const activeProjectsCount = projects.filter(p => p.status === ProjectStatus.EmExecucao || p.status === ProjectStatus.Planejamento).length;
    const totalStockValue = materialsData.reduce((sum, item) => sum + (item.price || 0) * item.stock, 0);
    const criticalItems = materialsData.filter(m => m.stock <= 5);
    const criticalAlertsCount = criticalItems.length;


    const statCardsData: StatCardData[] = [
        { 
            title: 'Itens no Catálogo', 
            value: totalCatalogItems.toString(), 
            subtitle: 'Produtos e Kits Elétricos', 
            color: 'bg-blue-500', 
            subtitleIcon: <CatalogIcon className="w-4 h-4" />, 
            icon: <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center"><CatalogIcon className="w-7 h-7 text-blue-500" /></div> 
        },
        { 
            title: 'Projetos Ativos', 
            value: activeProjectsCount.toString(), 
            subtitle: 'Em execução e planejamento', 
            color: 'bg-green-500', 
            subtitleIcon: <BoltIcon className="w-4 h-4" />, 
            icon: <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center"><BlueprintIcon className="w-7 h-7 text-green-500" /></div> 
        },
        { 
            title: 'Valor do Estoque', 
            value: `R$ ${totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
            subtitle: 'Total em materiais', 
            color: 'bg-purple-500', 
            subtitleIcon: <TrendingUpIcon className="w-4 h-4" />, 
            icon: <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center"><CurrencyDollarIcon className="w-7 h-7 text-purple-500" /></div> 
        },
        { 
            title: 'Alertas Críticos', 
            value: criticalAlertsCount.toString(), 
            subtitle: 'Estoque abaixo do mínimo', 
            color: 'bg-orange-500', 
            subtitleIcon: <ExclamationTriangleIcon className="w-4 h-4" />, 
            icon: <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center"><ExclamationTriangleIcon className="w-7 h-7 text-orange-500" /></div> 
        },
    ];
    const lastUpdate = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium'});

    return (
        <div className="p-4 sm:p-8">
            <header className="flex justify-between items-center mb-8">
                <div className="flex items-center">
                    <button onClick={toggleSidebar} className="lg:hidden mr-4 p-1 text-brand-gray-500 rounded-md hover:bg-brand-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-blue" aria-label="Open sidebar">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-3xl font-bold text-brand-gray-800">Dashboard Executivo</h1>
                        <p className="text-sm sm:text-base text-brand-gray-500">Visão geral do sistema de gestão S3E</p>
                    </div>
                </div>
                 <div className="flex items-center space-x-2 sm:space-x-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-brand-gray-500">Última atualização</p>
                        <p className="text-sm font-medium text-brand-gray-700">{lastUpdate}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-brand-gray-200 flex-shrink-0">
                         <img className="w-full h-full rounded-full object-cover" src="https://picsum.photos/100" alt="User Avatar" />
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCardsData.map((card, index) => (
                    <StatCard key={index} data={card} />
                ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <RecentMovements movements={movementsData} materials={materialsData} />
                    <OngoingProjects projects={projects} />
                </div>
                <div className="lg:col-span-1 space-y-8">
                    <CriticalAlerts materials={criticalItems} />
                    <QuickActions onNavigate={onNavigate} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;