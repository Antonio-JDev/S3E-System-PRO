import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PrintRenderer from '../PrintRenderer';

describe('PrintRenderer', () => {
    it('renders HTML content correctly', () => {
        const htmlContent = '<h1>Test Title</h1><p>Test paragraph</p>';
        
        render(
            <PrintRenderer
                content={htmlContent}
            />
        );
        
        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByText('Test paragraph')).toBeInTheDocument();
    });

    it('shows empty message when no content provided', () => {
        render(
            <PrintRenderer
                content=""
            />
        );
        
        expect(screen.getByText('Nenhum conteúdo para exibir')).toBeInTheDocument();
    });

    it('sanitizes dangerous script tags', () => {
        const dangerousContent = '<p>Safe content</p><script>alert("XSS")</script>';
        
        const { container } = render(
            <PrintRenderer
                content={dangerousContent}
            />
        );
        
        // Script tag should be removed
        expect(container.querySelector('script')).not.toBeInTheDocument();
        // Safe content should remain
        expect(screen.getByText('Safe content')).toBeInTheDocument();
    });
});
