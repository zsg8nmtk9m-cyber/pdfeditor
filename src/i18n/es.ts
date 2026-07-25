import type { Dict } from "./index";

export const es: Dict = {
  header: {
    privacyBadge: "100 % privado — tus archivos nunca salen de tu dispositivo",
  },
  footer: {
    line: "PDF Toolbox — todas las operaciones se ejecutan localmente en tu navegador. Sin subidas, sin cuentas, sin límites.",
  },
  home: {
    heroA: "Todas las herramientas PDF que necesitas,",
    heroB: "directamente en tu navegador",
    subtitle:
      "Une, divide, comprime, convierte, añade marcas de agua y protege PDFs — gratis y sin límites. Tus archivos se procesan en tu dispositivo y nunca se suben a ningún sitio.",
    chipPrivate: "Privado por diseño",
    chipNoUploads: "Sin subidas, sin servidores",
    chipNoLimits: "Sin límites de tamaño",
    dropHint: "Consejo: arrastra un archivo directamente a cualquier herramienta de abajo.",
    dropHere: (tool: string) => `Suelta para abrir en ${tool}`,
    dropNeedsPdf: "Esta herramienta necesita un PDF",
    dropNeedsImage: "Esta herramienta necesita imágenes",
  },
  categories: {
    Organize: "Organizar",
    Optimize: "Optimizar",
    Convert: "Convertir",
    Edit: "Editar",
    Security: "Seguridad",
  },
  tools: {
    merge: {
      name: "Unir PDF",
      tagline: "Combina varios PDFs en uno",
      description:
        "Combina dos o más archivos PDF en un solo documento. Arrastra para fijar el orden antes de unirlos.",
    },
    split: {
      name: "Dividir PDF",
      tagline: "Extrae páginas o divide en partes",
      description:
        "Divide un PDF por rangos de páginas, extrae una selección en un archivo o exporta cada página como PDF independiente.",
    },
    organize: {
      name: "Organizar PDF",
      tagline: "Reordena, rota o elimina páginas",
      description:
        "Ve cada página en miniatura; arrastra para reordenar, rota páginas individuales o elimina las que no necesites.",
    },
    rotate: {
      name: "Rotar PDF",
      tagline: "Rota todas las páginas a la vez",
      description: "Rota todas las páginas (o un rango) 90°, 180° o 270°.",
    },
    compress: {
      name: "Comprimir PDF",
      tagline: "Reduce el tamaño manteniendo calidad",
      description:
        "Reduce el tamaño del archivo re-renderizando las páginas a menor resolución. Ideal para escaneos y documentos con muchas imágenes.",
    },
    batch: {
      name: "Procesar por lotes",
      tagline: "Comprime, rota o marca muchos archivos",
      description:
        "Aplica la misma operación — comprimir, rotar o marca de agua — a un lote entero de PDFs a la vez y descárgalos todos como ZIP.",
    },
    compare: {
      name: "Comparar PDFs",
      tagline: "Ve qué cambió entre dos archivos",
      description:
        "Enfrenta dos versiones y obtén todas las diferencias visuales resaltadas, página por página — útil para contratos, borradores y cualquier cosa que necesites comparar."
    },
    "pdf-to-images": {
      name: "PDF a imágenes",
      tagline: "Exporta páginas como PNG o JPG",
      description:
        "Convierte cada página de un PDF en una imagen PNG o JPG de alta calidad. Varias páginas se descargan como ZIP.",
    },
    "images-to-pdf": {
      name: "Imágenes a PDF",
      tagline: "Convierte fotos y escaneos en un PDF",
      description:
        "Combina imágenes JPG, PNG o WebP en un solo PDF. Elige el tamaño de página y reordena las imágenes antes de convertir.",
    },
    annotate: {
      name: "Firmar y anotar",
      tagline: "Firma y añade texto a cualquier página",
      description:
        "Dibuja o escribe tu firma, colócala donde quieras y añade notas de texto en cualquier página. Todo queda integrado en el PDF — no hace falta ningún lector especial.",
    },
    "fill-forms": {
      name: "Rellenar formularios",
      tagline: "Rellena formularios sin imprimir",
      description:
        "Detecta todos los campos rellenables de un formulario PDF, escribe tus respuestas y descarga el documento relleno — opcionalmente aplanado para que las entradas no puedan modificarse.",
    },
    watermark: {
      name: "Marca de agua",
      tagline: "Estampa texto en cada página",
      description:
        "Añade una marca de agua de texto — como CONFIDENCIAL o BORRADOR — en todas las páginas, con color, tamaño y opacidad personalizados.",
    },
    "page-numbers": {
      name: "Números de página",
      tagline: "Numera las páginas automáticamente",
      description:
        "Inserta números de página en la posición y formato que elijas — en las esquinas o centrados, arriba o abajo.",
    },
    metadata: {
      name: "Editar metadatos",
      tagline: "Cambia título, autor y más",
      description:
        "Consulta y edita el título, autor, asunto, palabras clave y otros campos de metadatos del documento.",
    },
    protect: {
      name: "Proteger PDF",
      tagline: "Cifra con contraseña",
      description:
        "Añade protección AES con contraseña para que solo quien la conozca pueda abrir el PDF.",
    },
    redact: {
      name: "Censurar PDF",
      tagline: "Tacha contenido sensible de forma permanente",
      description:
        "Marca todo lo que no deba compartirse. El contenido que hay debajo se destruye, no solo se tapa — a diferencia de un recuadro negro dibujado encima, no se puede copiar del archivo.",
    },
    unlock: {
      name: "Desbloquear PDF",
      tagline: "Elimina una contraseña conocida",
      description:
        "Elimina la protección por contraseña de un PDF tuyo. Necesitas la contraseña actual para desbloquearlo.",
    },
  },
  common: {
    allTools: "Todas las herramientas",
    download: "Descargar",
    downloadAllZip: "Descargar todo (ZIP)",
    startOver: "Empezar de nuevo",
    done: "¡Listo!",
    chooseAnotherFile: "Elegir otro archivo",
    selectOnePdf: "Selecciona un archivo PDF",
    selectAll: "Seleccionar todo",
    clear: "Limpiar",
    close: "Cerrar",
    delete: "Eliminar",
    preview: "Vista previa",
    pages: (n: number) => `${n} página${n === 1 ? "" : "s"}`,
    pagesDot: (n: number) => `${n} página${n === 1 ? "" : "s"} · `,
    rangePlaceholder: "p. ej. 1, 3-5",
  },
  dropzone: {
    title: "Elige archivos o arrástralos aquí",
    titleCompact: "Añadir más archivos",
    privacy: "Tus archivos se procesan localmente — nunca salen de este dispositivo.",
    recents: "Archivos recientes (guardados en este dispositivo)",
    ariaUpload: "Subir archivos",
  },
  result: {
    oneReady: "Tu archivo está listo para descargar.",
    manyReady: (n: number) => `${n} archivos listos para descargar.`,
    continueIn: "Continuar en otra herramienta…",
  },
  fileList: {
    moveUp: (name: string) => `Subir ${name}`,
    moveDown: (name: string) => `Bajar ${name}`,
    remove: (name: string) => `Quitar ${name}`,
  },
  pageGrid: {
    rendering: "Generando vistas previas…",
    pageAria: (n: number) => `Página ${n}`,
    firstPage: "Primera página",
  },
  errors: {
    encrypted:
      "Este PDF está protegido con contraseña. Usa primero la herramienta Desbloquear PDF y vuelve a intentarlo.",
    wrongPassword: "Contraseña incorrecta — no se pudo descifrar este PDF.",
    couldNotRead: "No se pudo leer este PDF.",
  },
  merge: {
    hint: "Selecciona dos o más archivos PDF",
    reorder:
      "Los archivos se unen de izquierda a derecha — arrastra las tarjetas (o usa las flechas) para reordenar.",
    cannotPreview: "Sin vista previa — el archivo puede estar protegido con contraseña",
    moveEarlier: (name: string) => `Adelantar ${name}`,
    moveLater: (name: string) => `Atrasar ${name}`,
    action: (n: number) => `Unir ${n} PDF${n === 1 ? "" : "s"}`,
    failed: "Error al unir.",
    couldNotReadFile: (name: string) => `No se pudo leer «${name}».`,
  },
  split: {
    modeRanges: "Dividir por rangos",
    modeRangesHint: "Cada rango se convierte en su propio PDF, p. ej. 1-3, 4-6",
    modeExtract: "Extraer páginas",
    modeExtractHint: "Haz clic en las páginas de abajo — formarán un solo PDF",
    modeAll: "Cada página",
    modeAllHint: "Cada página se convierte en su propio PDF",
    rangesLabel: "Rangos de páginas — cada PDF resultante se resalta abajo",
    rangesPlaceholder: (n: number) => `p. ej. 1-3, 5, 8-${n}`,
    extractLabel: "Páginas seleccionadas — haz clic en las miniaturas o escribe",
    action: "Dividir PDF",
    badge: (n: number) => `PDF ${n}`,
    clickHintA: "Haz clic en las páginas para seleccionarlas — mantén",
    clickHintB: "para seleccionar un rango.",
    needSelection: "Haz clic en al menos una página (o escribe números de página).",
    failed: "Error al dividir.",
  },
  organize: {
    dragToReorder: "arrastra para reordenar",
    moveLeft: (n: number) => `Mover página ${n} a la izquierda`,
    moveRight: (n: number) => `Mover página ${n} a la derecha`,
    rotatePage: (n: number) => `Rotar página ${n}`,
    deletePage: (n: number) => `Eliminar página ${n}`,
    apply: "Aplicar cambios",
    failed: "No se pudo reconstruir el PDF.",
  },
  rotate: {
    right90: "90° derecha",
    deg180: "180°",
    left90: "90° izquierda",
    rotationLabel: "Rotación",
    applyTo: "Aplicar a",
    allPages: "Todas las páginas",
    specificPages: "Páginas concretas",
    hintSelected: "Haz clic en las páginas a rotar — la vista previa se actualiza al momento.",
    hintAll: "Vista previa de la rotación aplicada a todas las páginas.",
    action: "Rotar PDF",
    failed: "Error al rotar.",
  },
  compress: {
    presets: {
      low: { label: "Menos compresión", hint: "Alta calidad, archivo más grande" },
      recommended: { label: "Recomendado", hint: "Buena calidad, buena compresión" },
      extreme: { label: "Extremo", hint: "Archivo más pequeño, menor calidad" },
    },
    note: "Para lograr la máxima compresión, las páginas se re-renderizan como imágenes, así que el texto dejará de ser seleccionable. Ideal para escaneos, presentaciones y documentos con muchas imágenes.",
    action: "Comprimir PDF",
    failed: "Error al comprimir.",
    savings: (before: string, after: string, saved: number) =>
      `${before} → ${after} (${saved} % más pequeño)`,
    noSavings: (before: string, after: string) =>
      `El archivo no se redujo (${before} → ${after}) — probablemente ya está bien optimizado.`,
  },
  batch: {
    hint: "Selecciona uno o más archivos PDF",
    operation: "Operación para cada archivo",
    opCompress: "Comprimir",
    opRotate: "Rotar",
    opWatermark: "Marca de agua",
    processing: (done: number, total: number) => `Procesando ${done} de ${total}…`,
    action: (n: number) => `Procesar ${n} archivo${n === 1 ? "" : "s"}`,
    doneNote: (ok: number, skipped: number) =>
      skipped > 0
        ? `${ok} archivo${ok === 1 ? "" : "s"} procesado${ok === 1 ? "" : "s"}, ${skipped} omitido${skipped === 1 ? "" : "s"} (protegido con contraseña o ilegible).`
        : `${ok} archivo${ok === 1 ? "" : "s"} procesado${ok === 1 ? "" : "s"}.`,
    allSkipped:
      "No se pudo procesar ningún archivo — pueden estar protegidos con contraseña.",
    failed: "Error en el procesamiento por lotes.",
  },
  compare: {
    original: "Original",
    revised: "Revisado",
    action: "Comparar documentos",
    identical: "No se encontraron diferencias visuales.",
    summary: (n: number, total: number) => `${n} de ${total} página${total === 1 ? "" : "s"} con cambios`,
    legend: "El rojo marca lo que cambió; el gris es contexto sin cambios.",
    percentChanged: (pct: string) => `${pct} % modificado`,
    onlyInOriginal: "Solo en el original",
    onlyInRevised: "Solo en el revisado",
    exportReport: "Descargar comparación",
    failed: "Error al comparar.",
  },
  pdfToImages: {
    format: "Formato de imagen",
    formatPng: "PNG (sin pérdida)",
    formatJpg: "JPG (archivos más pequeños)",
    resolution: "Resolución",
    resStandard: "Estándar (72 dpi)",
    resHigh: "Alta (144 dpi)",
    resVeryHigh: "Muy alta (216 dpi)",
    action: "Convertir a imágenes",
    failed: "Error al convertir.",
  },
  imagesToPdf: {
    hint: "Imágenes JPG, PNG, WebP, GIF o BMP",
    pageSize: "Tamaño de página",
    sizeA4: "A4 (orientación automática)",
    sizeLetter: "Carta US (orientación automática)",
    sizeFit: "Igual que la imagen",
    action: (n: number) => `Crear PDF con ${n} imagen${n === 1 ? "" : "es"}`,
    failed: "Error al convertir.",
  },
  watermark: {
    textLabel: "Texto de la marca de agua",
    placeholder: "p. ej. CONFIDENCIAL",
    fontSize: (n: number) => `Tamaño de letra — ${n} pt`,
    opacity: (n: number) => `Opacidad — ${n} %`,
    color: "Color",
    direction: "Dirección",
    diagonal: "Diagonal",
    horizontal: "Horizontal",
    action: "Añadir marca de agua",
    emptyText: "Escribe el texto de la marca de agua.",
    failed: "Error al añadir la marca de agua.",
  },
  pageNumbers: {
    position: "Posición",
    bottomCenter: "Abajo centro",
    bottomLeft: "Abajo izquierda",
    bottomRight: "Abajo derecha",
    topCenter: "Arriba centro",
    topLeft: "Arriba izquierda",
    topRight: "Arriba derecha",
    format: "Formato",
    formatN: "1, 2, 3…",
    formatNofTotal: "1 / 12",
    formatPageNofTotal: "Página 1 de 12",
    fontSize: "Tamaño de letra",
    sizeSmall: "Pequeño (9 pt)",
    sizeNormal: "Normal (11 pt)",
    sizeLarge: "Grande (14 pt)",
    startAt: "Empezar a contar en",
    action: "Añadir números de página",
    failed: "Error al numerar.",
  },
  annotate: {
    addText: "Añadir texto",
    addSignature: "Añadir firma",
    apply: "Aplicar y descargar",
    fontSizeAria: "Tamaño de letra",
    colorAria: "Color del texto",
    prev: "Anterior",
    next: "Siguiente",
    pageOf: (x: number, n: number) => `Página ${x} de ${n}`,
    hint: (n: number) =>
      `Arrastra los elementos para moverlos · doble clic para editar el texto · ${n} elemento${n === 1 ? "" : "s"} colocado${n === 1 ? "" : "s"}`,
    defaultText: "Texto",
    signatureAlt: "Firma",
    resizeAria: "Redimensionar firma",
    renderFailed: "No se pudo mostrar esta página.",
    failed: "No se pudieron aplicar los cambios.",
  },
  fillForms: {
    fieldsFound: (n: number, name: string) =>
      `${n} campo${n === 1 ? "" : "s"} rellenable${n === 1 ? "" : "s"} en ${name}`,
    noFields:
      "Este PDF no tiene campos de formulario rellenables. Si es un formulario escaneado o plano, puedes escribir encima con Firmar y anotar.",
    goAnnotate: "Abrir en Firmar y anotar",
    noSelection: "— sin selección —",
    flattenLabel: "Aplanar el formulario",
    flattenHint:
      "Fija los valores rellenados en la página: se imprimen en todas partes y no se pueden editar después.",
    action: "Rellenar formulario",
    failed: "No se pudo rellenar este formulario.",
  },
  signature: {
    title: "Añade tu firma",
    draw: "Dibujar",
    type: "Escribir",
    typePlaceholder: "Escribe tu nombre",
    previewFallback: "Vista previa de la firma",
    use: "Usar firma",
  },
  metadata: {
    title: "Título",
    author: "Autor",
    subject: "Asunto",
    keywords: "Palabras clave (separadas por comas)",
    creator: "Aplicación creadora",
    producer: "Productor",
    editing: (name: string) => `Editando metadatos de ${name}`,
    action: "Guardar metadatos",
    failed: "No se pudieron actualizar los metadatos.",
  },
  protect: {
    password: "Contraseña",
    repeat: "Repite la contraseña",
    note: "El archivo se cifra con AES. Si olvidas la contraseña no hay forma de recuperar el documento — guárdala en un lugar seguro.",
    action: "Proteger PDF",
    tooShort: "Elige una contraseña de al menos 4 caracteres.",
    mismatch: "Las contraseñas no coinciden.",
    resultNote: "Tu PDF ya está cifrado. Quien lo abra necesitará la contraseña.",
    failed: "Error al cifrar.",
  },
  redact: {
    instruction: "Arrastra sobre todo lo que quieras eliminar.",
    clearAll: "Borrar todo",
    removeBox: "Quitar esta zona",
    action: (n: number) => `Censurar ${n} zona${n === 1 ? "" : "s"}`,
    note: "Las páginas con censuras se aplanan a imagen para destruir permanentemente el contenido oculto — el texto de esas páginas dejará de ser seleccionable. El resto de páginas no se modifica.",
    resultNote: "El contenido censurado se ha eliminado permanentemente del archivo.",
    failed: "Error al censurar.",
  },
  unlock: {
    hint: "Selecciona un PDF protegido con contraseña",
    current: "Contraseña actual",
    placeholder: "Introduce la contraseña del documento",
    note: "Desbloquea solo documentos tuyos o que tengas permiso para modificar. La contraseña se usa localmente para descifrar el archivo y nunca se envía a ningún sitio.",
    action: "Desbloquear PDF",
    notEncrypted: "Este PDF no está protegido con contraseña — no hay nada que desbloquear.",
    resultNote: "Contraseña eliminada — esta copia se abre sin contraseña.",
    failed: "Error al desbloquear.",
  },
};
