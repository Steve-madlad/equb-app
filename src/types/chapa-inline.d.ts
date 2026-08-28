declare module '@chapa_et/inline.js' {
  const ChapaCheckout: new (options: Record<string, unknown>) => {
    initialize(containerId: string): void;
  };

  export default ChapaCheckout;
}

declare module '@chapa_et/inline.js/lib/inline.js' {
  const ChapaCheckout: new (options: Record<string, unknown>) => {
    initialize(containerId: string): void;
  };

  export default ChapaCheckout;
}
