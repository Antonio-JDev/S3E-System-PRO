import React from 'react';

import { letterheadLayerOpacity } from './letterhead';

import './systemPdfPage.css';



export type SystemPdfPageProps = {

  children: React.ReactNode;

  folhaTimbradaUrl?: string;

  opacidade?: number;

  pageNumber?: number;

  totalPages?: number;

  /** Padding menor para relatórios densos (tabelas). */

  compact?: boolean;

  className?: string;

};



const SystemPdfPage: React.FC<SystemPdfPageProps> = ({

  children,

  folhaTimbradaUrl,

  opacidade = 0.05,

  pageNumber,

  totalPages,

  compact = false,

  className = '',

}) => {

  const showPageNumbers =

    typeof pageNumber === 'number' &&

    typeof totalPages === 'number' &&

    totalPages > 0;



  const hasCustomFolha = Boolean((folhaTimbradaUrl || '').trim());

  const watermarkOpacity = letterheadLayerOpacity(hasCustomFolha, opacidade);



  return (

    <div className={`pdf-page ${className}`.trim()}>

      <div

        className={`watermark-background${hasCustomFolha ? ' custom-letterhead' : ''}`}

        style={hasCustomFolha ? undefined : { opacity: watermarkOpacity }}

      >

        {hasCustomFolha ? (

          <img className="letterhead-img" src={folhaTimbradaUrl} alt="" />

        ) : (

          <div className="watermark-center" style={{ opacity: watermarkOpacity }}>

            S3E

            <div className="watermark-subtitle">ENGENHARIA ELÉTRICA</div>

          </div>

        )}

      </div>

      <div className={`page-content${compact ? ' page-content--compact' : ''}`}>

        <div className="page-inner system-pdf-body">{children}</div>

      </div>

      {showPageNumbers && (

        <div className="page-number">

          {pageNumber} / {totalPages}

        </div>

      )}

    </div>

  );

};



export default SystemPdfPage;

