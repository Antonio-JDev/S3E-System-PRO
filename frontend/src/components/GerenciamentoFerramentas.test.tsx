import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GerenciamentoFerramentas from './GerenciamentoFerramentas';
import React from 'react';

// Mock do axiosApiService
const mockGet = vi.fn(() => Promise.resolve({
    success: true,
    data: []
}));

const mockPost = vi.fn(() => Promise.resolve({
    success: true
}));

const mockPut = vi.fn(() => Promise.resolve({
    success: true
}));

const mockDelete = vi.fn(() => Promise.resolve({
    success: true
}));

vi.mock('../services/axiosApi', () => ({
    axiosApiService: {
        get: () => mockGet(),
        post: () => mockPost(),
        put: () => mockPut(),
        delete: () => mockDelete()
    }
}));

// Mock do toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn()
    }
}));

// Mock do hook useEscapeKey
vi.mock('../hooks/useEscapeKey', () => ({
    useEscapeKey: vi.fn()
}));

// Mock do ViewToggle
vi.mock('./ui/ViewToggle', () => ({
    default: () => <div>ViewToggle</div>
}));

// Mock do loadViewMode e saveViewMode
vi.mock('../utils/viewModeStorage', () => ({
    loadViewMode: vi.fn(() => 'grid'),
    saveViewMode: vi.fn()
}));

// Mock do matchCrossSearch
vi.mock('../utils/searchUtils', () => ({
    matchCrossSearch: vi.fn(() => false)
}));

// Mock do KitPDFCustomizationModal
vi.mock('./PDFCustomization/KitPDFCustomizationModal', () => ({
    default: () => <div>KitPDFCustomizationModal</div>
}));

// Mock do getUploadUrl
vi.mock('../config/api', () => ({
    getUploadUrl: vi.fn((url) => url || '')
}));

describe('GerenciamentoFerramentas', () => {
    const mockToggleSidebar = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mocks para retornar dados vazios
        mockGet.mockResolvedValue({
            success: true,
            data: []
        });
    });

    it('deve renderizar o componente sem erros', async () => {
        render(<GerenciamentoFerramentas toggleSidebar={mockToggleSidebar} />);
        
        await waitFor(() => {
            expect(screen.getByText(/Gestão de Ferramentas/i)).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('deve exibir as abas de Ferramentas e Kits', async () => {
        render(<GerenciamentoFerramentas toggleSidebar={mockToggleSidebar} />);
        
        await waitFor(() => {
            // Verificar que os botões de abas existem (usando getAllByText para múltiplos elementos)
            const ferramentasElements = screen.getAllByText(/Ferramentas/i);
            expect(ferramentasElements.length).toBeGreaterThan(0);
            
            const kitsElements = screen.getAllByText(/Kits/i);
            expect(kitsElements.length).toBeGreaterThan(0);
        }, { timeout: 3000 });
    });

    it('deve exibir o botão "Nova Ferramenta" na aba de ferramentas', async () => {
        render(<GerenciamentoFerramentas toggleSidebar={mockToggleSidebar} />);
        
        await waitFor(() => {
            expect(screen.getByText(/Nova Ferramenta/i)).toBeInTheDocument();
        }, { timeout: 3000 });
    });
});

