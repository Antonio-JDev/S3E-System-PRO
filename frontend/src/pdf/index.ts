export {
  PRINT_MARGIN_TOP_PX,
  PRINT_MARGIN_BOTTOM_PX,
  PRINT_MARGIN_LEFT_PX,
  PRINT_MARGIN_RIGHT_PX,
  LETTERHEAD_OPACITY_REPORT_MIN,
  effectiveLetterheadOpacity,
} from './systemPdfMargins';
export {
  resolveSystemPdfLetterhead,
  tryResolveImageToDataUrl,
  pickFolhaUrlFromCustomization,
  pickOpacidadeFromCustomization,
  letterheadLayerOpacity,
  type SystemPdfLetterhead,
} from './letterhead';
export { default as SystemPdfPage } from './SystemPdfPage';
export type { SystemPdfPageProps } from './SystemPdfPage';
export {
  renderDomPagesToPdf,
  renderSystemPdfDocument,
  downloadPdfBlob,
  waitForStablePdfPages,
  type RenderDomToPdfResult,
  type RenderSystemPdfDocumentParams,
} from './renderDomToPdf';
