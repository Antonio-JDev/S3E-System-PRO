/** Padding do overlay de modais — mais área útil no mobile */
export const modalOverlayPaddingClasses = 'p-2 sm:p-4';

/** Container de abas em páginas (OS, Orçamentos, etc.) */
export const pageTabBarContainerClasses =
  'bg-white dark:bg-dark-card rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border mb-6 overflow-hidden';

/** Faixa de abas com indício de scroll horizontal no mobile */
export const mobileTabBarStripClasses =
  'relative mobile-tab-bar-strip border-b border-gray-200 dark:border-dark-border';

/** Scroll das abas até a borda do card no mobile */
export const mobileTabBarScrollClasses =
  'max-lg:-mx-1 max-lg:px-1 sm:max-lg:-mx-2 sm:max-lg:px-2';

/** Container scrollável horizontal no mobile */
export const scrollableRowClasses =
  'mobile-nav-scroll flex flex-nowrap items-center gap-1.5 sm:gap-2 md:gap-3 w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch] [scroll-behavior:smooth] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pl-0.5 pr-3 sm:pr-4 lg:overflow-visible lg:pr-0';



/** Itens (botões/abas) — não encolhem no mobile; desktop volta ao fluxo normal */

export const scrollableNavItemClasses = 'max-lg:flex-shrink-0 max-lg:whitespace-nowrap';



/** Abas de navegação compactas apenas abaixo de lg */

export const compactNavTabClasses =

  'max-lg:px-2.5 max-lg:py-2 max-lg:text-xs sm:max-lg:px-4 sm:max-lg:py-3 sm:max-lg:text-sm lg:flex-1 lg:px-6 lg:py-4';



/** Reduz botões de header/ação só no mobile/tablet; em lg+ mantém o tamanho padrão (ex.: btn-primary) */

export const compactActionBtnClasses =

  'max-lg:text-xs max-lg:px-3 max-lg:py-2';



/** Botões dentro de cards — scroll horizontal no mobile; tamanho original em lg+ */

export const cardActionBtnClasses =

  'flex items-center justify-center gap-1 font-semibold max-lg:flex-shrink-0 max-lg:whitespace-nowrap max-lg:px-2 max-lg:py-1.5 max-lg:text-xs sm:max-lg:px-3 sm:max-lg:py-2 sm:max-lg:text-sm lg:flex-1 lg:px-3 lg:py-2 lg:text-sm';



/** Botões compactos para cards densos (ex.: Orçamentos) */
export const denseCardBtnClasses =
  'inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] sm:text-xs font-semibold rounded-md min-w-0';

/** Botões de status/workflow em cards densos */
export const denseCardStatusBtnClasses =
  'inline-flex flex-1 items-center justify-center gap-1 px-2 py-1.5 text-[11px] sm:text-xs font-semibold rounded-md min-w-0';

/** Padding de página reduzido em telas muito estreitas */
export const compactPagePaddingClasses = 'p-3 sm:p-6 lg:p-8';
