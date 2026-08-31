
import React, { useState, useEffect } from 'react';
import { type User, UserRole } from '../types';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import ScrollableRow from './ui/ScrollableRow';
import { scrollableNavItemClasses } from '../utils/responsiveNav';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Icons
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        <path d="m15 5 4 4" />
    </svg>
);
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);
const PhotoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </svg>
);

// Mock User Data
const initialUsersData: User[] = [
    { id: 'USR-001', name: 'Usuário Admin', email: 'admin@s3e.com.br', role: UserRole.Admin },
    { id: 'USR-002', name: 'João Engenheiro', email: 'joao.eng@s3e.com.br', role: UserRole.Engenheiro },
    { id: 'USR-003', name: 'Maria Técnica', email: 'maria.tec@s3e.com.br', role: UserRole.Tecnico },
    { id: 'USR-004', name: 'Carlos Desenhista', email: 'carlos.des@s3e.com.br', role: UserRole.DesenhistaIndustrial },
    { id: 'USR-005', name: 'Ana Desenvolvedora', email: 'ana.dev@s3e.com.br', role: UserRole.Desenvolvedor },
];

const getRoleClass = (role: UserRole) => {
    switch (role) {
        case UserRole.Admin: return 'bg-red-100 text-red-800';
        case UserRole.Engenheiro: return 'bg-blue-100 text-blue-800';
        case UserRole.Tecnico: return 'bg-yellow-100 text-yellow-800';
        case UserRole.DesenhistaIndustrial: return 'bg-purple-100 text-purple-800';
        case UserRole.Desenvolvedor: return 'bg-gray-800 text-white';
        default: return 'bg-gray-100 text-gray-800';
    }
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { user, updateUser } = useContext(AuthContext)!;
    const { theme, toggleTheme } = useTheme();

    // Tabs
    const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'security' | 'users'>('profile');

    // Profile state
    const [name, setName] = useState(user?.name || 'Usuário');
    const [email, setEmail] = useState(user?.email || 'admin@s3e.com.br');
    const [phone, setPhone] = useState(user?.phone || '');

    // Security state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Appearance state
    const [companyLogo, setCompanyLogo] = useState<string | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // User management state
    const [users, setUsers] = useState<User[]>(initialUsersData);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [userForm, setUserForm] = useState({ name: '', email: '', role: UserRole.Tecnico, password: '', phone: '' });

    useEffect(() => {
        // Carregar logo do localStorage
        const savedLogo = localStorage.getItem('companyLogo');
        if (savedLogo) {
            setCompanyLogo(savedLogo);
            setLogoPreview(savedLogo);
        }
    }, []);

    useEffect(() => {
        // Atualizar estado quando usuário mudar
        if (user) {
            setName(user.name);
            setEmail(user.email);
            setPhone(user.phone || '');
        }
    }, [user]);

    if (!isOpen) {
        return null;
    }

    // Profile handlers
    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Integrar com backend
        if (user) {
            updateUser({ ...user, name, email, phone });
        }
        alert('Perfil atualizado com sucesso!');
    };

    // Security handlers
    const validatePassword = (password: string): string[] => {
        const errors: string[] = [];
        if (password.length < 6) errors.push('Mínimo 6 caracteres');
        if (!/[A-Z]/.test(password)) errors.push('Uma letra maiúscula');
        if (!/[a-z]/.test(password)) errors.push('Uma letra minúscula');
        if (!/[0-9]/.test(password)) errors.push('Um número');
        return errors;
    };

    const getPasswordStrength = (password: string): { label: string; color: string; percentage: number } => {
        if (!password) return { label: '', color: '', percentage: 0 };
        const errors = validatePassword(password);
        if (errors.length === 0) return { label: 'Forte', color: 'bg-green-500', percentage: 100 };
        if (errors.length <= 2) return { label: 'Média', color: 'bg-yellow-500', percentage: 60 };
        return { label: 'Fraca', color: 'bg-red-500', percentage: 30 };
    };

    const handleSecuritySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        if (!currentPassword) {
            setPasswordError('A senha atual é obrigatória');
            return;
        }

        if (!newPassword || !confirmPassword) {
            setPasswordError('Por favor, preencha todos os campos');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('As senhas não coincidem');
            return;
        }

        const errors = validatePassword(newPassword);
        if (errors.length > 0) {
            setPasswordError(`Senha fraca: ${errors.join(', ')}`);
            return;
        }

        // TODO: Integrar com backend
        alert('Senha alterada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    // Appearance handlers
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validação
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            alert('O arquivo deve ter no máximo 2MB');
            return;
        }

        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
        if (!validTypes.includes(file.type)) {
            alert('Formato inválido. Use PNG, JPG ou SVG');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setLogoPreview(base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveLogo = () => {
        if (logoPreview) {
            localStorage.setItem('companyLogo', logoPreview);
            setCompanyLogo(logoPreview);
            // Recarregar página para atualizar logo na sidebar
            window.dispatchEvent(new Event('storage'));
            alert('Logo salva com sucesso!');
        }
    };

    const handleRemoveLogo = () => {
        localStorage.removeItem('companyLogo');
        setCompanyLogo(null);
        setLogoPreview(null);
        window.dispatchEvent(new Event('storage'));
        alert('Logo removida com sucesso!');
    };

    // User Management Handlers
    const handleOpenUserModal = (user: User | null = null) => {
        if (user) {
            setUserToEdit(user);
            setUserForm({ name: user.name, email: user.email, role: user.role, password: '', phone: user.phone || '' });
        } else {
            setUserToEdit(null);
            setUserForm({ name: '', email: '', role: UserRole.Tecnico, password: '', phone: '' });
        }
        setIsUserModalOpen(true);
    };

    const handleCloseUserModal = () => {
        setIsUserModalOpen(false);
        setUserToEdit(null);
    };

    const handleUserFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userToEdit) {
            setUsers(users.map(u => u.id === userToEdit.id ? { ...userToEdit, ...userForm } : u));
        } else {
            const newUser: User = { id: `USR-${Date.now()}`, ...userForm };
            setUsers([...users, newUser]);
        }
        handleCloseUserModal();
    };
    
    const handleOpenDeleteUserModal = (user: User) => {
        setUserToDelete(user);
    };

    const handleConfirmDeleteUser = () => {
        if (userToDelete) {
            setUsers(users.filter(u => u.id !== userToDelete.id));
            setUserToDelete(null);
        }
    };

    const passwordStrength = getPasswordStrength(newPassword);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn" aria-modal="true" role="dialog">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scaleIn">
                {/* Header com cor S3E */}
                <div className="bg-gradient-to-r from-brand-s3e to-[#0d2847] p-6 rounded-t-xl flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                            <span className="text-2xl">⚙️</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Configurações</h2>
                            <p className="text-blue-100 text-sm">Personalize sua experiência</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 rounded-full text-white hover:bg-white hover:bg-opacity-20 transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Tabs */}
                <div className="border-b border-brand-gray-200 bg-brand-gray-50">
                    <ScrollableRow as="nav" ariaLabel="Configurações" className="px-6 -mb-px gap-4">
                        <button 
                            onClick={() => setActiveTab('profile')} 
                            className={`${scrollableNavItemClasses} py-3 px-4 border-b-2 font-semibold text-sm transition-colors ${activeTab === 'profile' ? 'border-brand-s3e text-brand-s3e' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}
                        >
                            👤 Meu Perfil
                        </button>
                        <button 
                            onClick={() => setActiveTab('appearance')} 
                            className={`${scrollableNavItemClasses} py-3 px-4 border-b-2 font-semibold text-sm transition-colors ${activeTab === 'appearance' ? 'border-brand-s3e text-brand-s3e' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}
                        >
                            🎨 Aparência
                        </button>
                        <button 
                            onClick={() => setActiveTab('security')} 
                            className={`${scrollableNavItemClasses} py-3 px-4 border-b-2 font-semibold text-sm transition-colors ${activeTab === 'security' ? 'border-brand-s3e text-brand-s3e' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}
                        >
                            🔒 Segurança
                        </button>
                        <button 
                            onClick={() => setActiveTab('users')} 
                            className={`${scrollableNavItemClasses} py-3 px-4 border-b-2 font-semibold text-sm transition-colors ${activeTab === 'users' ? 'border-brand-s3e text-brand-s3e' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}
                        >
                            👥 Usuários
                        </button>
                    </ScrollableRow>
                </div>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <form onSubmit={handleProfileSubmit} className="flex-1 flex flex-col">
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700 mb-2">Nome Completo</label>
                                    <input 
                                        type="text" 
                                        value={name} 
                                        onChange={e => setName(e.target.value)} 
                                        className="w-full px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-s3e focus:border-transparent" 
                                        placeholder="Seu nome"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700 mb-2">Email</label>
                                    <input 
                                        type="email" 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        className="w-full px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-s3e focus:border-transparent" 
                                        placeholder="seu@email.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-2">Telefone</label>
                                <input 
                                    type="tel" 
                                    value={phone} 
                                    onChange={e => setPhone(e.target.value)} 
                                    className="w-full px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-s3e focus:border-transparent" 
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-brand-gray-50 border-t border-brand-gray-200 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-brand-gray-300 text-brand-gray-700 font-semibold rounded-lg hover:bg-brand-gray-50 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" className="px-6 py-2 bg-brand-s3e text-white font-semibold rounded-lg hover:bg-opacity-90 transition-colors">
                                Salvar Alterações
                            </button>
                        </div>
                    </form>
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                    <div className="flex-1 flex flex-col">
                        <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            {/* Theme Toggle */}
                            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
                                <h3 className="text-lg font-semibold text-brand-gray-800 mb-4 flex items-center">
                                    <span className="text-2xl mr-2">🌓</span>
                                    Tema do Sistema
                                </h3>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-brand-gray-700 font-medium">Tema {theme === 'dark' ? 'Escuro' : 'Claro'}</p>
                                        <p className="text-xs text-brand-gray-500 mt-1">
                                            {theme === 'dark' ? 'Gradiente azul para preto' : 'Fundo claro padrão'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={toggleTheme}
                                        className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-brand-s3e' : 'bg-gray-300'}`}
                                    >
                                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-9' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Logo Upload */}
                            <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-xl border border-green-200">
                                <h3 className="text-lg font-semibold text-brand-gray-800 mb-4 flex items-center">
                                    <span className="text-2xl mr-2">🏢</span>
                                    Logo da Empresa
                                </h3>
                                <div className="space-y-4">
                                    {logoPreview && (
                                        <div className="flex justify-center">
                                            <div className="w-32 h-32 border-2 border-dashed border-brand-gray-300 rounded-lg overflow-hidden flex items-center justify-center bg-white">
                                                <img src={logoPreview} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block cursor-pointer">
                                            <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-brand-gray-300 rounded-lg hover:border-brand-s3e hover:bg-brand-gray-50 transition-colors">
                                                <PhotoIcon className="w-5 h-5 mr-2 text-brand-gray-400" />
                                                <span className="text-sm font-medium text-brand-gray-700">
                                                    {logoPreview ? 'Alterar Logo' : 'Escolher Logo'}
                                                </span>
                                            </div>
                                            <input 
                                                type="file" 
                                                accept="image/png,image/jpeg,image/jpg,image/svg+xml" 
                                                onChange={handleLogoUpload}
                                                className="hidden"
                                            />
                                        </label>
                                        <p className="text-xs text-brand-gray-500 mt-2">PNG, JPG ou SVG (máx. 2MB)</p>
                                    </div>
                                    {logoPreview && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSaveLogo}
                                                className="flex-1 px-4 py-2 bg-brand-s3e text-white rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
                                            >
                                                Salvar Logo
                                            </button>
                                            <button
                                                onClick={handleRemoveLogo}
                                                className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
                                            >
                                                Remover
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-brand-gray-50 border-t border-brand-gray-200 flex justify-end">
                            <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-brand-gray-300 text-brand-gray-700 font-semibold rounded-lg hover:bg-brand-gray-50 transition-colors">
                                Fechar
                            </button>
                        </div>
                    </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                    <form onSubmit={handleSecuritySubmit} className="flex-1 flex flex-col">
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800">
                                    <strong>Dica:</strong> Use uma senha forte com letras maiúsculas, minúsculas, números e caracteres especiais.
                                </p>
                            </div>

                            {passwordError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {passwordError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-2">Senha Atual</label>
                                <input 
                                    type="password" 
                                    value={currentPassword} 
                                    onChange={e => setCurrentPassword(e.target.value)} 
                                    className="w-full px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-s3e focus:border-transparent" 
                                    placeholder="••••••••" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-2">Nova Senha</label>
                                <input 
                                    type="password" 
                                    value={newPassword} 
                                    onChange={e => setNewPassword(e.target.value)} 
                                    className="w-full px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-s3e focus:border-transparent" 
                                    placeholder="••••••••" 
                                />
                                {newPassword && (
                                    <div className="mt-2">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-brand-gray-600">Força da senha:</span>
                                            <span className={`font-semibold ${passwordStrength.label === 'Forte' ? 'text-green-600' : passwordStrength.label === 'Média' ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {passwordStrength.label}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className={`h-2 rounded-full transition-all ${passwordStrength.color}`} style={{ width: `${passwordStrength.percentage}%` }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-2">Confirmar Nova Senha</label>
                                <input 
                                    type="password" 
                                    value={confirmPassword} 
                                    onChange={e => setConfirmPassword(e.target.value)} 
                                    className="w-full px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-s3e focus:border-transparent" 
                                    placeholder="••••••••" 
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-brand-gray-50 border-t border-brand-gray-200 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-brand-gray-300 text-brand-gray-700 font-semibold rounded-lg hover:bg-brand-gray-50 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" className="px-6 py-2 bg-brand-s3e text-white font-semibold rounded-lg hover:bg-opacity-90 transition-colors">
                                Alterar Senha
                            </button>
                        </div>
                    </form>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="flex-1 flex flex-col">
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-brand-gray-800">Gerenciar Usuários</h3>
                                <button onClick={() => handleOpenUserModal()} className="flex items-center gap-2 px-4 py-2 bg-brand-s3e text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 transition-colors">
                                    <PlusIcon className="w-4 h-4" />
                                    Adicionar Usuário
                                </button>
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-brand-gray-200">
                                    <thead className="bg-brand-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase">Nome</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-500 uppercase">Função</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-brand-gray-500 uppercase">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-brand-gray-200">
                                        {users.map(user => (
                                            <tr key={user.id} className="hover:bg-brand-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-brand-gray-900">{user.name}</div>
                                                    <div className="text-sm text-brand-gray-500">{user.email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleClass(user.role)}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end items-center gap-4">
                                                        <button onClick={() => handleOpenUserModal(user)} className="text-brand-gray-400 hover:text-brand-blue transition-colors" title="Editar"><PencilIcon className="w-5 h-5"/></button>
                                                        <button onClick={() => handleOpenDeleteUserModal(user)} className="text-brand-gray-400 hover:text-brand-red transition-colors" title="Excluir"><TrashIcon className="w-5 h-5"/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="p-6 bg-brand-gray-50 border-t border-brand-gray-200 flex justify-end">
                            <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-brand-gray-300 text-brand-gray-700 font-semibold rounded-lg hover:bg-brand-gray-50 transition-colors">
                                Fechar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit User Modal */}
            {isUserModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
                    <form onSubmit={handleUserFormSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <div className="bg-brand-s3e p-6 rounded-t-xl">
                            <h3 className="text-xl font-bold text-white">{userToEdit ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700 mb-2">Nome</label>
                                    <input type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full px-3 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-s3e focus:border-transparent" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700 mb-2">Função</label>
                                    <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full px-3 py-2 border border-brand-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-s3e focus:border-transparent">
                                        {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                                    </select>
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-2">Email</label>
                                <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full px-3 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-s3e focus:border-transparent" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-2">Telefone</label>
                                <input type="tel" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} className="w-full px-3 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-s3e focus:border-transparent" placeholder="(00) 00000-0000" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-2">Senha</label>
                                <input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full px-3 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-s3e focus:border-transparent" placeholder={userToEdit ? 'Deixe em branco para não alterar' : '••••••••'} required={!userToEdit} />
                            </div>
                        </div>
                        <div className="p-4 bg-brand-gray-50 border-t flex justify-end gap-3">
                            <button type="button" onClick={handleCloseUserModal} className="px-6 py-2 bg-white border border-brand-gray-300 rounded-lg font-semibold hover:bg-brand-gray-50 transition-colors">Cancelar</button>
                            <button type="submit" className="px-6 py-2 bg-brand-s3e text-white rounded-lg font-semibold hover:bg-opacity-90 transition-colors">{userToEdit ? 'Salvar Alterações' : 'Criar Usuário'}</button>
                        </div>
                    </form>
                </div>
            )}
            
            {/* Delete User Confirmation */}
            {userToDelete && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
                     <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                        <div className="bg-red-500 p-6 rounded-t-xl">
                            <h3 className="text-xl font-bold text-white">Confirmar Exclusão</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-brand-gray-600">Tem certeza que deseja excluir o usuário <strong>{userToDelete.name}</strong>?</p>
                        </div>
                        <div className="p-4 bg-brand-gray-50 border-t flex justify-end gap-3">
                            <button onClick={() => setUserToDelete(null)} className="px-6 py-2 bg-white border rounded-lg font-semibold hover:bg-brand-gray-50 transition-colors">Cancelar</button>
                            <button onClick={handleConfirmDeleteUser} className="px-6 py-2 bg-brand-red text-white rounded-lg font-semibold hover:bg-red-600 transition-colors">Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsModal;
