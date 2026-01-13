import React from 'react';
import { BoltIcon, CubeIcon, BlueprintIcon, SupplierIcon, PlusCircleIcon, BudgetIcon } from '../constants';

const ArrowRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

interface QuickActionsProps {
    onNavigate: (view: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 hover:border-gray-200 card-hover transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm ring-1 ring-blue-200/50">
                    <BoltIcon className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Ações Rápidas</h2>
            </div>
            <div className="space-y-2.5">
                <button 
                    onClick={() => onNavigate('Estoque')} 
                    className="w-full flex justify-between items-center p-3.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all hover:shadow-medium group shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <CubeIcon className="w-4.5 h-4.5" />
                        </div>
                        <span className="font-semibold">Gerenciar Estoque</span>
                    </div>
                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
                
                <button 
                    onClick={() => onNavigate('Ordem De Serviços')} 
                    className="w-full flex justify-between items-center p-3.5 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-all hover:shadow-soft group border border-gray-100 hover:border-gray-200"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                            <PlusCircleIcon className="w-4.5 h-4.5 text-green-600" />
                        </div>
                        <span className="font-semibold">Nova Ordem De Serviço</span>
                    </div>
                    <ArrowRightIcon className="w-4 h-4 text-green-600 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
                
                <button 
                    onClick={() => onNavigate('Orçamentos')} 
                    className="w-full flex justify-between items-center p-3.5 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-all hover:shadow-soft group border border-gray-100 hover:border-gray-200"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                            <BudgetIcon className="w-4.5 h-4.5 text-purple-600" />
                        </div>
                        <span className="font-semibold">Criar Orçamento</span>
                    </div>
                    <ArrowRightIcon className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
                
                <button 
                    onClick={() => onNavigate('Fornecedores')} 
                    className="w-full flex justify-between items-center p-3.5 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-all hover:shadow-soft group border border-gray-100 hover:border-gray-200"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                            <SupplierIcon className="w-4.5 h-4.5 text-orange-600" />
                        </div>
                        <span className="font-semibold">Gerenciar Fornecedores</span>
                    </div>
                    <ArrowRightIcon className="w-4 h-4 text-orange-600 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
            </div>
        </div>
    );
};

export default QuickActions;