import { useState, useEffect, useCallback } from 'react';
import {
    PDFCustomization,
    DEFAULT_PDF_CUSTOMIZATION,
    WatermarkConfig,
    DesignConfig,
    ContentConfig,
    CornerDesignConfig,
    TypographyConfig
} from '../types/pdfCustomization';

export const PDF_CUSTOMIZATION_STORAGE_KEY = 'pdf_customization_temp';

export const usePDFCustomization = () => {
    const [customization, setCustomization] = useState<PDFCustomization>(() => {
        // Tentar carregar do localStorage (último estado)
        try {
            const saved = localStorage.getItem(PDF_CUSTOMIZATION_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                
                // Validar se corners.design é um valor válido
                if (parsed.design?.corners?.design && 
                    !['geometric', 'curves', 'lines', 'custom', 'none'].includes(parsed.design.corners.design)) {
                    console.warn('Design de canto inválido detectado, resetando para padrão');
                    parsed.design.corners.design = 'none';
                }
                
                // Converter strings de data para Date
                if (parsed.metadata?.createdAt) {
                    parsed.metadata.createdAt = new Date(parsed.metadata.createdAt);
                }
                if (parsed.metadata?.updatedAt) {
                    parsed.metadata.updatedAt = new Date(parsed.metadata.updatedAt);
                }
                return parsed;
            }
        } catch (error) {
            console.warn('Erro ao carregar customização do localStorage:', error);
            // Se der erro, limpar localStorage e usar padrão
            localStorage.removeItem(PDF_CUSTOMIZATION_STORAGE_KEY);
        }
        return DEFAULT_PDF_CUSTOMIZATION;
    });

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Salvar no localStorage quando houver mudanças
    useEffect(() => {
        try {
            localStorage.setItem(PDF_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(customization));
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
        }
    }, [customization]);

    // Handle Watermark Changes
    const handleWatermarkChange = useCallback((updates: Partial<WatermarkConfig>) => {
        setCustomization(prev => ({
            ...prev,
            watermark: {
                ...prev.watermark,
                ...updates
            }
        }));
    }, []);

    // Handle Design Changes
    const handleDesignChange = useCallback((updates: Partial<DesignConfig>) => {
        setCustomization(prev => ({
            ...prev,
            design: {
                ...prev.design,
                ...updates
            }
        }));
    }, []);

    // Handle Corner Design Changes
    const handleCornerDesignChange = useCallback((updates: Partial<CornerDesignConfig>) => {
        setCustomization(prev => ({
            ...prev,
            design: {
                ...prev.design,
                corners: {
                    ...prev.design.corners,
                    ...updates
                }
            }
        }));
    }, []);

    // Handle Color Changes
    const handleColorChange = useCallback((colorKey: keyof DesignConfig['colors'], value: string) => {
        setCustomization(prev => ({
            ...prev,
            design: {
                ...prev.design,
                colors: {
                    ...prev.design.colors,
                    [colorKey]: value
                }
            }
        }));
    }, []);

    // Handle Content Changes
    const handleContentChange = useCallback((updates: Partial<ContentConfig>) => {
        setCustomization(prev => ({
            ...prev,
            content: {
                ...prev.content,
                ...updates
            }
        }));
    }, []);

    // Handle Typography Changes
    const handleTypographyChange = useCallback((updates: Partial<TypographyConfig>) => {
        setCustomization(prev => ({
            ...prev,
            design: {
                ...prev.design,
                typography: {
                    ...prev.design.typography,
                    ...updates
                }
            }
        }));
    }, []);

    // Reset to default
    const resetToDefault = useCallback(() => {
        setCustomization(DEFAULT_PDF_CUSTOMIZATION);
        setHasUnsavedChanges(false);
        localStorage.removeItem(PDF_CUSTOMIZATION_STORAGE_KEY);
    }, []);

    // Load template
    const loadTemplate = useCallback((template: PDFCustomization) => {
        setCustomization(template);
        setHasUnsavedChanges(false);
    }, []);

    // Mark as saved
    const markAsSaved = useCallback(() => {
        setHasUnsavedChanges(false);
    }, []);

    // Apply color template
    const applyColorTemplate = useCallback((colors: DesignConfig['colors']) => {
        setCustomization(prev => ({
            ...prev,
            design: {
                ...prev.design,
                colors
            }
        }));
    }, []);

    // Clear temporary storage
    const clearTemp = useCallback(() => {
        localStorage.removeItem(PDF_CUSTOMIZATION_STORAGE_KEY);
    }, []);

    return {
        customization,
        setCustomization,
        hasUnsavedChanges,
        
        // Handlers específicos
        handleWatermarkChange,
        handleDesignChange,
        handleCornerDesignChange,
        handleColorChange,
        handleContentChange,
        handleTypographyChange,
        
        // Utilidades
        resetToDefault,
        loadTemplate,
        markAsSaved,
        applyColorTemplate,
        clearTemp
    };
};

export default usePDFCustomization;

