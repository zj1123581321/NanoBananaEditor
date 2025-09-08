// TypeScript definitions for i18n resources
export interface CommonResources {
  appName: string;
  appNameShort: string;
  version: string;
  actions: {
    ok: string;
    cancel: string;
    close: string;
    save: string;
    delete: string;
    edit: string;
    copy: string;
    clear: string;
    apply: string;
    generate: string;
    upload: string;
    download: string;
    yes: string;
    no: string;
  };
  states: {
    loading: string;
    generating: string;
    processing: string;
    success: string;
    error: string;
    completed: string;
    failed: string;
  };
}

export interface UIResources {
  header: {
    title: string;
    titleShort: string;
  };
  tools: {
    generate: string;
    edit: string;
    mask: string;
    descriptions: {
      generate: string;
      edit: string;
      mask: string;
    };
  };
  promptComposer: {
    mode: string;
    showPanel: string;
    hidePanel: string;
    labels: {
      styleReferences: string;
      uploadImage: string;
      describeCreate: string;
      describeChanges: string;
      creativity: string;
      seed: string;
      seedOptional: string;
    };
    placeholders: {
      generate: string;
      edit: string;
      seedRandom: string;
    };
    buttons: {
      generateImage: string;
      applyEdit: string;
      optimizePrompt: string;
      chooseFile: string;
    };
    upload: {
      dragDrop: string;
      dropHere: string;
      releaseToUpload: string;
      willBeProcessed: string;
      formats: string;
      editDescription: string;
      editStyleHint: string;
      editUploadHint: string;
      referenceLabel: string;
    };
    advanced: {
      show: string;
      hide: string;
      clearSession: string;
      clearConfirm: string;
      yesClear: string;
    };
    quality: {
      addDetail: string;
      goodLevel: string;
      excellentDetail: string;
    };
    shortcuts: {
      title: string;
      generate: string;
      reroll: string;
      editMode: string;
      history: string;
      togglePanel: string;
    };
  };
  canvas: {
    zoom: string;
    pan: string;
    brush: string;
    eraser: string;
  };
  history: {
    title: string;
    empty: string;
    compare: string;
    project: string;
    generation: string;
    outputs: string;
  };
  toast: {
    imageUploadNotSupported: string;
    stylePastedSuccess: string;
    maxImagesReached: string;
    imagePastedSuccess: string;
    imagePasteFailed: string;
  };
}

export interface TranslationResources {
  common: CommonResources;
  ui: UIResources;
  prompts: {
    hints: {
      title: string;
      subtitle: string;
      tips: string[];
    };
    optimizer: {
      title: string;
      subtitle: string;
      analyzing: string;
      optimizing: string;
      useOptimized: string;
      keepOriginal: string;
    };
  };
  errors: {
    network: {
      connectionFailed: string;
      timeout: string;
      serverError: string;
    };
    api: {
      quotaExceeded: string;
      invalidRequest: string;
      contentBlocked: string;
      modelUnavailable: string;
    };
    image: {
      uploadFailed: string;
      formatNotSupported: string;
      fileTooLarge: string;
      processingFailed: string;
    };
    general: {
      unknownError: string;
      tryAgain: string;
      contactSupport: string;
    };
  };
}

// Augment the react-i18next module
declare module 'react-i18next' {
  interface CustomTypeOptions {
    resources: TranslationResources;
  }
}